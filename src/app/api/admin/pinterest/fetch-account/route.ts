import { NextResponse } from 'next/server';
import { DynamoDBClient, ListTablesCommand, ScanCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function POST(request: Request) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({
        success: false,
        message: 'Account ID is required'
      }, { status: 400 });
    }

    console.log(`Fetching Pinterest account with ID: ${accountId}`);

    // Step 1: List all tables to find relevant ones
    const listTablesResponse = await dynamoDBClient.send(new ListTablesCommand({}));
    const allTables = listTablesResponse.TableNames || [];
    
    // Filter tables that might contain Pinterest account data
    const relevantTables = allTables.filter(tableName => 
      tableName.toLowerCase().includes('pinterest') && 
      tableName.toLowerCase().includes('account')
    );

    console.log(`Found ${relevantTables.length} potentially relevant tables: ${relevantTables.join(', ')}`);

    let account = null;

    // Step 2: Search each relevant table for the account
    for (const tableName of relevantTables) {
      try {
        // First try a query if the table has a key structure we expect
        try {
          const queryResponse = await dynamoDBClient.send(new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: 'id = :id',
            ExpressionAttributeValues: {
              ':id': { S: accountId }
            }
          }));

          if (queryResponse.Items && queryResponse.Items.length > 0) {
            account = unmarshall(queryResponse.Items[0]);
            console.log(`Found account in table ${tableName} using query`);
            break;
          }
        } catch (queryError) {
          console.log(`Query failed on table ${tableName}, falling back to scan: ${queryError.message}`);
        }

        // If query fails or returns no results, try a scan
        const scanResponse = await dynamoDBClient.send(new ScanCommand({
          TableName: tableName,
          FilterExpression: 'id = :id',
          ExpressionAttributeValues: {
            ':id': { S: accountId }
          }
        }));

        if (scanResponse.Items && scanResponse.Items.length > 0) {
          account = unmarshall(scanResponse.Items[0]);
          console.log(`Found account in table ${tableName} using scan`);
          break;
        }
      } catch (tableError) {
        console.error(`Error searching table ${tableName}:`, tableError);
      }
    }

    if (!account) {
      return NextResponse.json({
        success: false,
        message: 'Account not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      account
    });

  } catch (error) {
    console.error('Error fetching Pinterest account:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch Pinterest account',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 