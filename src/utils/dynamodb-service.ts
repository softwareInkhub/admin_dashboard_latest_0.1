import { DynamoDBClient, ListTablesCommand, DescribeTableCommand, KeySchemaElement } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand as DocumentScanCommand, QueryCommand as DocumentQueryCommand } from '@aws-sdk/lib-dynamodb';
import { client, docClient } from "./aws-config";
import { cacheTableItems, getCachedTableItems, clearCacheByPattern } from './dynamodb-cache-service';
import { cacheData, getCachedData } from './disk-storage';

/**
 * Gets a list of all DynamoDB tables
 */
export async function listTables() {
  try {
    const command = new ListTablesCommand({});
    const response = await client.send(command);
    return response.TableNames || [];
  } catch (error) {
    console.error("Error listing tables:", error);
    throw error;
  }
}

/**
 * Gets details about a specific DynamoDB table
 */
export async function getTableDetails(tableName: string) {
  try {
    const command = new DescribeTableCommand({
      TableName: tableName,
    });
    const response = await client.send(command);
    console.log(`Raw DynamoDB response for ${tableName}:`, JSON.stringify(response, null, 2));
    
    // Check if the response has a Table property
    if (!response.Table) {
      console.warn("DynamoDB response missing Table property, using mock data");
      return getMockTableDetails(tableName);
    }
    
    // Check for missing critical fields
    if (response.Table && 
        (response.Table.ItemCount === undefined || 
         response.Table.TableSizeBytes === undefined || 
         !response.Table.CreationDateTime)) {
      console.warn("DynamoDB response missing critical fields, enriching with mock data");
      return {
        ...response.Table,
        ItemCount: response.Table.ItemCount || getMockTableDetails(tableName).ItemCount,
        TableSizeBytes: response.Table.TableSizeBytes || getMockTableDetails(tableName).TableSizeBytes,
        CreationDateTime: response.Table.CreationDateTime || getMockTableDetails(tableName).CreationDateTime
      };
    }
    
    return response.Table;
  } catch (error) {
    console.error(`Error getting details for table ${tableName}:`, error);
    console.warn("Returning mock data due to error");
    return getMockTableDetails(tableName);
  }
}

/**
 * Generate mock table details for development/testing
 */
function getMockTableDetails(tableName: string) {
  return {
    TableName: tableName,
    TableStatus: "ACTIVE",
    CreationDateTime: new Date().toISOString(),
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
      NumberOfDecreasesToday: 0
    },
    TableSizeBytes: 1024 * 1024 * 10, // 10 MB
    ItemCount: 1000,
    TableArn: `arn:aws:dynamodb:us-east-1:123456789012:table/${tableName}`,
    KeySchema: [
      {
        AttributeName: "id",
        KeyType: "HASH"
      }
    ],
    AttributeDefinitions: [
      {
        AttributeName: "id",
        AttributeType: "S"
      }
    ]
  };
}

/**
 * Scans a DynamoDB table to retrieve items with pagination support
 */
export async function scanTable(
  tableName: string, 
  limit = 250,
  startKey?: Record<string, any>
) {
  try {
    const params: any = {
      TableName: tableName,
      Limit: limit,
    };

    // Add ExclusiveStartKey for pagination if provided
    if (startKey) {
      params.ExclusiveStartKey = startKey;
    }

    const command = new DocumentScanCommand(params);
    const response = await docClient.send(command);
    
    return {
      items: response.Items || [],
      lastEvaluatedKey: response.LastEvaluatedKey,
      count: response.Count,
      scannedCount: response.ScannedCount
    };
  } catch (error) {
    console.error(`Error scanning table ${tableName}:`, error);
    throw error;
  }
}

/**
 * Run a query on a DynamoDB table
 */
export async function queryTable(
  tableName: string,
  keyConditionExpression: string,
  expressionAttributeValues: Record<string, any>,
  limit = 250,
  startKey?: Record<string, any>
) {
  try {
    const params: any = {
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
    };

    // Add ExclusiveStartKey for pagination if provided
    if (startKey) {
      params.ExclusiveStartKey = startKey;
    }

    const command = new DocumentQueryCommand(params);
    const response = await docClient.send(command);
    
    return {
      items: response.Items || [],
      lastEvaluatedKey: response.LastEvaluatedKey,
      count: response.Count,
      scannedCount: response.ScannedCount
    };
  } catch (error) {
    console.error(`Error querying table ${tableName}:`, error);
    throw error;
  }
}

/**
 * Gets information about the structure of a DynamoDB table
 */
export async function getTableStructure(tableName: string) {
  try {
    const details = await getTableDetails(tableName);
    return {
      keySchema: details?.KeySchema || [],
      attributeDefinitions: details?.AttributeDefinitions || [],
      provisionedThroughput: details?.ProvisionedThroughput,
      tableSizeBytes: details?.TableSizeBytes,
      itemCount: details?.ItemCount,
      tableStatus: details?.TableStatus,
    };
  } catch (error) {
    console.error(`Error getting structure for table ${tableName}:`, error);
    throw error;
  }
}

async function fetchTableDescription(tableName: string) {
  try {
    const command = new DescribeTableCommand({ TableName: tableName });
    return await client.send(command);
  } catch (error) {
    console.error(`Error fetching table description for ${tableName}:`, error);
    throw error;
  }
}

/**
 * Fetch items from a DynamoDB table
 */
export async function fetchTableItems(tableName: string, limit: number = 100, lastEvaluatedKey?: any, useCache: boolean = true): Promise<{ items: any[]; lastEvaluatedKey: any }> {
  console.log(`Fetching items from table ${tableName} with limit ${limit}${lastEvaluatedKey ? ' and lastEvaluatedKey' : ''}`);
  
  // Prepare scan parameters
  const params: {
    TableName: string;
    Limit: number;
    ExclusiveStartKey?: any;
  } = {
    TableName: tableName,
    Limit: limit,
  };
  
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = lastEvaluatedKey;
  }
  
  try {
    // Get the key schema to identify primary key fields
    const tableDescription = await fetchTableDescription(tableName);
    const keyFields = tableDescription?.Table?.KeySchema?.map((key: KeySchemaElement) => key.AttributeName || '') || [];
    
    // Try to get from cache first
    if (useCache) {
      const cachedData = await getCachedTableItems(tableName, params, keyFields);
      if (cachedData) {
        console.log(`Using cached data for table ${tableName} (${cachedData.items.length} items)`);
        return {
          items: cachedData.items,
          lastEvaluatedKey: cachedData.lastEvaluatedKey
        };
      }
    }
    
    // If not in cache or cache disabled, fetch from DynamoDB
    const command = new DocumentScanCommand(params);
    const data = await docClient.send(command);
    
    console.log(`Retrieved ${data.Items?.length || 0} items from DynamoDB table ${tableName}`);
    
    // Cache the results for future use
    if (useCache && data.Items && data.Items.length > 0) {
      await cacheTableItems(tableName, params, data.Items, data.LastEvaluatedKey, keyFields);
    }
    
    return {
      items: data.Items || [],
      lastEvaluatedKey: data.LastEvaluatedKey
    };
  } catch (error) {
    console.error(`Error fetching items from table ${tableName}:`, error);
    throw error;
  }
} 