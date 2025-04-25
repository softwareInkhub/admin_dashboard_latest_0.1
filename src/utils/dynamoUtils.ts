/**
 * Transforms DynamoDB JSON format into regular JavaScript objects
 * @param dynamoObj The DynamoDB formatted JSON object
 * @returns A regular JavaScript object with parsed values
 */
export function transformDynamoDBJson(dynamoObj: Record<string, any>): Record<string, any> {
  function parseValue(value: any): any {
    if (value.S !== undefined) return value.S;
    if (value.N !== undefined) return Number(value.N);
    if (value.BOOL !== undefined) return value.BOOL;
    if (value.NULL) return null;
    if (value.M !== undefined) return transformDynamoDBJson(value.M);
    if (value.L !== undefined) return value.L.map(parseValue);
    return value; // fallback
  }

  const result: Record<string, any> = {};
  for (const key in dynamoObj) {
    result[key] = parseValue(dynamoObj[key]);
  }
  return result;
}

// Example usage for DynamoDB data
export function transformBoardData(boardData: any): any {
  return transformDynamoDBJson(boardData);
}

// Usage in fetch-boards/route.ts would look like:
// import { transformDynamoDBJson } from '@/utils/dynamoUtils';
//
// // In your code:
// console.log('COMPLETE BOARD DATA:', JSON.stringify(boardData, null, 2));
// const transformedData = transformDynamoDBJson(boardData);
// console.log('TRANSFORMED BOARD DATA:', JSON.stringify(transformedData, null, 2)); 
 