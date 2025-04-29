import { NextRequest, NextResponse } from 'next/server';
import { 
  CreateTableCommand,
  ListTablesCommand,
  ScanCommand,
  DescribeTableCommand
} from '@aws-sdk/client-dynamodb';
import { 
  PutCommand,
  QueryCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { transformDynamoDBJson } from '@/utils/dynamoUtils';
import { client, docClient } from '@/utils/aws-config';

// Table name for Pinterest accounts
const TABLE_NAME = 'pinterest_inkhub_accounts';

// Define types for our data structures
interface PinterestBoard {
  id?: string;
  name?: string;
  url?: string;
  description?: string;
}

interface PinterestAccountData {
  id?: string;
  username: string;
  createdAt?: string;
  boards?: PinterestBoard[];
}

interface DynamoDBAccountItem {
  id: { S: string };
  username: { S: string };
  createdAt: { S: string };
  boards?: {
    L: Array<{
      M: {
        id: { S: string };
        name: { S: string };
        url?: { S: string };
        description?: { S: string };
      }
    }>
  };
}

// Initialize DynamoDB clients
const dynamoClient = client;
const dynamoDocClient = docClient;

// Helper function to ensure the table exists
async function ensureTableExists() {
  try {
    // Check if table exists
    const listCommand = new ListTablesCommand({});
    const { TableNames } = await dynamoClient.send(listCommand);
    
    if (TableNames && TableNames.includes(TABLE_NAME)) {
      console.log(`Table ${TABLE_NAME} already exists`);
      return true;
    }
    
    // Create table if it doesn't exist
    console.log(`Creating table ${TABLE_NAME}...`);
    const createCommand = new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'S' }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      // Add tags for better resource management
      Tags: [
        {
          Key: 'Environment',
          Value: process.env.NODE_ENV || 'production'
        },
        {
          Key: 'Application',
          Value: 'Pinterest Integration'
        }
      ]
    });
    
    try {
      await dynamoClient.send(createCommand);
      console.log(`Created table ${TABLE_NAME}`);
      
      // Wait for table to be active
      console.log('Waiting for table to become active...');
      let tableActive = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      
      while (!tableActive && attempts < maxAttempts) {
        try {
          const describeCommand = new DescribeTableCommand({
            TableName: TABLE_NAME
          });
          const { Table } = await dynamoClient.send(describeCommand);
          
          if (Table?.TableStatus === 'ACTIVE') {
            tableActive = true;
            console.log(`Table ${TABLE_NAME} is now active`);
          } else {
            console.log(`Table status: ${Table?.TableStatus}, waiting...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
        } catch (error) {
          console.error('Error checking table status:', error);
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!tableActive) {
        throw new Error(`Table ${TABLE_NAME} failed to become active after ${maxAttempts} seconds`);
      }
      
      return true;
    } catch (error) {
      console.error('Error creating table:', error);
      // If the error is because the table already exists, that's fine
      if (error instanceof Error && error.message.includes('already exists')) {
        console.log(`Table ${TABLE_NAME} already exists (from error message)`);
        return true;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error ensuring table exists:', error);
    return false;
  }
}

// GET: Retrieve all Pinterest accounts
export async function GET() {
  try {
    await ensureTableExists();
    
    // Scan the table to get all accounts
    const scanCommand = new ScanCommand({
      TableName: TABLE_NAME
    });
    
    const response = await dynamoClient.send(scanCommand);
    
    // Transform DynamoDB response to regular objects
    const accounts = response.Items?.map(item => transformDynamoDBJson(item)) || [];
    
    return NextResponse.json({ 
      accounts,
      count: accounts.length
    });
  } catch (error) {
    console.error('Error fetching Pinterest accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Pinterest accounts' },
      { status: 500 }
    );
  }
}

// POST: Save a new Pinterest account
export async function POST(request: NextRequest) {
  try {
    const data: PinterestAccountData = await request.json();
    
    if (!data.username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }
    
    await ensureTableExists();
    
    const accountId = data.id || uuidv4();
    const createdAt = data.createdAt || new Date().toISOString();
    
    // Prepare the item for DynamoDB
    const accountItem = {
      id: accountId,
      username: data.username,
      createdAt: createdAt,
      ...(data.boards && Array.isArray(data.boards) && {
        boards: data.boards.map((board: PinterestBoard) => ({
          id: board.id || uuidv4(),
          name: board.name || 'Untitled Board',
          ...(board.url && { url: board.url }),
          ...(board.description && { description: board.description })
        }))
      })
    };
    
    // Save to DynamoDB using the document client
    const putCommand = new PutCommand({
      TableName: TABLE_NAME,
      Item: accountItem
    });
    
    try {
      await dynamoDocClient.send(putCommand);
      console.log(`Successfully saved account with ID: ${accountId}`);
      
      return NextResponse.json({
        success: true,
        account: accountItem
      });
    } catch (error) {
      console.error('Error saving to DynamoDB:', error);
      return NextResponse.json(
        { error: 'Failed to save account to DynamoDB', details: error instanceof Error ? error.message : String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error saving Pinterest account:', error);
    return NextResponse.json(
      { error: 'Failed to save Pinterest account', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 