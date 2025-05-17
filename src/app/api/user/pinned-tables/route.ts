import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'us-east-1' });
const TABLE_NAME = 'user_pinned_tables';

export async function GET(request: NextRequest) {
  // TODO: Replace with real user ID logic
  const userId = 'demo-user'; // Replace with real user ID

  const command = new GetItemCommand({
    TableName: TABLE_NAME,
    Key: { userId: { S: userId } }
  });
  const result = await client.send(command);
  console.log('DynamoDB GET result:', JSON.stringify(result, null, 2));
  const pinnedTables = result.Item?.pinnedTables?.L?.map((v: any) => v.S) || [];
  console.log('Returning pinnedTables:', pinnedTables);
  return NextResponse.json({ pinnedTables });
}

export async function POST(request: NextRequest) {
  const userId = 'demo-user'; // Replace with real user ID
  const { pinnedTables } = await request.json();

  const command = new PutItemCommand({
    TableName: TABLE_NAME,
    Item: {
      userId: { S: userId },
      pinnedTables: { L: (pinnedTables || []).map((t: string) => ({ S: t })) }
    }
  });
  await client.send(command);
  return NextResponse.json({ success: true });
}
