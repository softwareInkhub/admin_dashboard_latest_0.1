import { NextResponse } from 'next/server';
import { ListTablesCommand, ScanCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { client } from '@/utils/aws-config';

// Initialize DynamoDB client
const dynamoDBClient = client;

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
        } catch (error: unknown) {
          const queryError = error as Error;
          console.log(`Query failed on table ${tableName}, falling back to scan: ${queryError.message || 'Unknown error'}`);
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
      } catch (error: unknown) {
        const tableError = error as Error;
        console.error(`Error searching table ${tableName}:`, tableError.message || 'Unknown error');
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

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Error fetching Pinterest account:', err.message || 'Unknown error');
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch Pinterest account',
      error: err.message || 'Unknown error'
    }, { status: 500 });
  }
} 