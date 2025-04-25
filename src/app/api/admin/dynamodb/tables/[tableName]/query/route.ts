import { NextRequest, NextResponse } from 'next/server';
import { queryTable } from '@/utils/dynamodb-service';
import {
  getCachedQueryResults,
  cacheQueryResults
} from '@/utils/dynamodb-cache-service';

// Run a query against a DynamoDB table
export async function POST(
  req: NextRequest,
  { params }: { params: { tableName: string } }
) {
  const { tableName } = params;
  
  try {
    // Get query parameters from the request body
    const body = await req.json();
    const { 
      keyConditionExpression, 
      expressionAttributeValues, 
      limit = 250,
      lastEvaluatedKey,
      forceRefresh = false
    } = body;
    
    // Validate required parameters
    if (!keyConditionExpression || !expressionAttributeValues) {
      return NextResponse.json(
        { error: 'keyConditionExpression and expressionAttributeValues are required' },
        { status: 400 }
      );
    }
    
    // Query parameters to use for cache key
    const queryParams = {
      keyConditionExpression,
      expressionAttributeValues,
      limit
    };
    
    if (lastEvaluatedKey) {
      Object.assign(queryParams, { lastKey: JSON.stringify(lastEvaluatedKey) });
    }
    
    // Check cache first, unless it's a continued query (with lastEvaluatedKey) or forceRefresh is true
    let queryResults;
    if (!forceRefresh && !lastEvaluatedKey) {
      queryResults = await getCachedQueryResults(tableName, queryParams);
    }
    
    // If not in cache or continuing pagination, run the actual query
    if (!queryResults) {
      // Run the query
      const result = await queryTable(
        tableName,
        keyConditionExpression,
        expressionAttributeValues,
        limit,
        lastEvaluatedKey
      );
      
      // Cache the results (only if this is the first page)
      if (!lastEvaluatedKey) {
        await cacheQueryResults(tableName, queryParams, result);
      }
      
      queryResults = {
        ...result,
        timestamp: Date.now()
      };
    }
    
    return NextResponse.json({
      ...queryResults,
      hasMoreItems: !!queryResults.lastEvaluatedKey,
      limit
    }, { status: 200 });
  } catch (error: any) {
    console.error(`Error querying table ${tableName}:`, error);
    return NextResponse.json(
      { 
        error: `Failed to query table ${tableName}`,
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
} 