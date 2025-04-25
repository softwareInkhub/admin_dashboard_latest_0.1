import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  // Create a complete mock table structure
  const mockTable = {
    AttributeDefinitions: [
      {
        AttributeName: "id",
        AttributeType: "S"
      }
    ],
    BillingModeSummary: {
      BillingMode: "PAY_PER_REQUEST",
      LastUpdateToPayPerRequestDateTime: new Date().toISOString()
    },
    CreationDateTime: new Date().toISOString(),
    DeletionProtectionEnabled: false,
    ItemCount: 42202,
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH"
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 0,
      WriteCapacityUnits: 0
    },
    TableArn: "arn:aws:dynamodb:us-east-1:123456789012:table/mock_table",
    TableId: "9e68f27a-65f2-42e9-9cc2-bee8b5095484",
    TableName: "mock_table",
    TableSizeBytes: 407595616,
    TableStatus: "ACTIVE"
  };

  // Create mock items
  const mockItems = [
    {
      id: "1",
      name: "Mock Item 1",
      description: "This is a mock item",
      created: new Date().toISOString(),
      data: {
        field1: "value1",
        field2: "value2"
      }
    },
    {
      id: "2",
      name: "Mock Item 2",
      description: "This is another mock item",
      created: new Date().toISOString(),
      data: {
        field1: "value3",
        field2: "value4"
      }
    }
  ];

  // Return mock response
  return NextResponse.json({
    table: mockTable,
    items: mockItems,
    itemCount: mockItems.length,
    totalCount: mockItems.length,
    scannedCount: mockItems.length,
    lastEvaluatedKey: null,
    hasMoreItems: false,
    limit: 10
  }, { status: 200 });
} 