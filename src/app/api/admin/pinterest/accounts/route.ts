import { NextRequest, NextResponse } from 'next/server';
import { 
  CreateTableCommand,
  ListTablesCommand,
  ScanCommand
} from '@aws-sdk/client-dynamodb';
import { 
  PutCommand, 
  DeleteCommand,
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
      BillingMode: 'PAY_PER_REQUEST'
    });
    
    await dynamoClient.send(createCommand);
    console.log(`Created table ${TABLE_NAME}`);
    
    // Wait for table to be active
    console.log('Waiting for table to become active...');
    let tableActive = false;
    while (!tableActive) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // We could check table status here, but for simplicity, let's assume it's active after a delay
      tableActive = true;
    }
    
    return true;
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
    const accountItem: DynamoDBAccountItem = {
      id: { S: accountId },
      username: { S: data.username },
      createdAt: { S: createdAt }
    };
    
    // Add boards if they exist
    if (data.boards && Array.isArray(data.boards)) {
      accountItem.boards = { 
        L: data.boards.map((board: PinterestBoard) => ({
          M: {
            id: { S: board.id || uuidv4() },
            name: { S: board.name || 'Untitled Board' },
            ...(board.url && { url: { S: board.url } }),
            ...(board.description && { description: { S: board.description } })
          }
        }))
      };
    }
    
    // Save to DynamoDB
    const putCommand = new PutCommand({
      TableName: TABLE_NAME,
      Item: accountItem
    });
    
    await dynamoClient.send(putCommand);
    
    return NextResponse.json({
      success: true,
      account: transformDynamoDBJson(accountItem)
    });
  } catch (error) {
    console.error('Error saving Pinterest account:', error);
    return NextResponse.json(
      { error: 'Failed to save Pinterest account' },
      { status: 500 }
    );
  }
}

// DELETE: Remove a Pinterest account
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      );
    }
    
    await ensureTableExists();
    
    // Delete from DynamoDB
    const deleteCommand = new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { id }
    });
    
    await dynamoDocClient.send(deleteCommand);
    
    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Pinterest account:', error);
    return NextResponse.json(
      { error: 'Failed to delete Pinterest account' },
      { status: 500 }
    );
  }
} 