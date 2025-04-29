import { NextRequest, NextResponse } from 'next/server';
import { ListTablesCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { transformDynamoDBJson } from '@/utils/dynamoUtils';
import { client } from '@/utils/aws-config';

// Initialize DynamoDB client
const dynamoClient = client;

export async function POST(request: NextRequest) {
  try {
    // Get username from request body
    const { username } = await request.json();
    
    if (!username) {
      console.error('No username provided for verification');
      return NextResponse.json(
        { message: 'Username is required', exists: false },
        { status: 400 }
      );
    }
    
    console.log(`Verifying Pinterest account for username: ${username}`);
    
    // Step 1: List all tables
    const listTablesCommand = new ListTablesCommand({});
    const { TableNames } = await dynamoClient.send(listTablesCommand);
    
    if (!TableNames || TableNames.length === 0) {
      console.log('No tables found in DynamoDB');
      return NextResponse.json(
        { message: 'No DynamoDB tables found', exists: false },
        { status: 404 }
      );
    }
    
    // Step 2: Filter tables containing "pinterest" and "board"
    const relevantTables = TableNames.filter(
      table => table?.toLowerCase().includes('pinterest') && table?.toLowerCase().includes('board')
    );
    
    if (relevantTables.length === 0) {
      console.log('No relevant Pinterest board tables found');
      return NextResponse.json(
        { message: 'No Pinterest board tables found in DynamoDB', exists: false },
        { status: 404 }
      );
    }
    
    console.log(`Found ${relevantTables.length} relevant tables: ${relevantTables.join(', ')}`);
    
    // Step 3: Scan each table to find the account
    let accountFound = false;
    let foundAccount = null;
    let sourcePath = '';
    
    for (const tableName of relevantTables) {
      if (accountFound) break;
      
      try {
        // Just do a full table scan - simpler and more reliable
        const scanCommand = new ScanCommand({
          TableName: tableName
        });
        
        const scanResponse = await dynamoClient.send(scanCommand);
        
        // Log the first item structure to debug
        if (scanResponse.Items && scanResponse.Items.length > 0) {
          console.log('Complete item structure for verification:', JSON.stringify(scanResponse.Items[0], null, 2));
          // Transform the DynamoDB item to a regular JavaScript object
          const transformedItem = transformDynamoDBJson(scanResponse.Items[0]);
          console.log('TRANSFORMED item structure:', JSON.stringify(transformedItem, null, 2));
        }
        
        if (!scanResponse.Items || scanResponse.Items.length === 0) {
          continue;
        }
        
        // Just examine the first item for simplicity
        if (scanResponse.Items.length > 0) {
          const item = scanResponse.Items[0];
          
          // Log the complete item structure for debugging
          console.log(`Complete item structure from ${tableName}:`, JSON.stringify(item));
          
          // Deep search through the item for the username
          const searchForUsername = (obj: any, path = ''): string | null => {
            if (!obj || typeof obj !== 'object') return null;
            
            // Check if this is a DynamoDB string that matches our username
            if (obj.S === username) {
              return path;
            }
            
            // Loop through all properties
            for (const key in obj) {
              // For DynamoDB Map (M) type, search inside
              if (obj[key]?.M) {
                const foundPath = searchForUsername(obj[key].M, path ? `${path}.${key}.M` : key);
                if (foundPath) return foundPath;
              }
              // For DynamoDB List (L) type, search each item
              else if (obj[key]?.L && Array.isArray(obj[key].L)) {
                for (let i = 0; i < obj[key].L.length; i++) {
                  const foundPath = searchForUsername(obj[key].L[i], `${path ? path + '.' : ''}${key}.L[${i}]`);
                  if (foundPath) return foundPath;
                }
              }
              // For other DynamoDB types, check the value directly
              else {
                const foundPath = searchForUsername(obj[key], path ? `${path}.${key}` : key);
                if (foundPath) return foundPath;
              }
            }
            
            return null;
          };
          
          // Search for username in the item
          const foundPath = searchForUsername(item);
          
          if (foundPath) {
            console.log(`Found username "${username}" at path: ${foundPath}`);
            accountFound = true;
            foundAccount = item;
            sourcePath = foundPath;
            break;
          }
        }
      } catch (error) {
        console.error(`Error scanning table ${tableName}:`, error);
      }
    }
    
    if (accountFound && foundAccount) {
      console.log('Account found - COMPLETE DATA:', JSON.stringify(foundAccount, null, 2));
      console.log('Source path:', sourcePath);
      
      // Transform the found account data to a regular JavaScript object
      const transformedAccount = transformDynamoDBJson(foundAccount);
      console.log('TRANSFORMED ACCOUNT DATA:', JSON.stringify(transformedAccount, null, 2));
      
      // Extract boards from the foundAccount
      let boardsArray: any[] = [];
      
      try {
        // Try to find boards at different possible locations
        if (foundAccount.item?.M?.boards?.L) {
          boardsArray = foundAccount.item.M.boards.L;
        } else if (foundAccount.boards?.L) {
          boardsArray = foundAccount.boards.L;
        } else {
          // Look for boards recursively
          const findBoardsInObject = (obj: any): any[] | null => {
            if (!obj || typeof obj !== 'object') return null;
            
            // If we found a boards property with a list
            if (obj.boards?.L && Array.isArray(obj.boards.L)) {
              return obj.boards.L;
            }
            
            // Look through all keys
            for (const key in obj) {
              if (obj[key]?.M) {
                const boards = findBoardsInObject(obj[key].M);
                if (boards) return boards;
              }
            }
            
            return null;
          };
          
          const foundBoards = findBoardsInObject(foundAccount);
          if (foundBoards) {
            boardsArray = foundBoards;
          }
        }
      } catch (error) {
        console.error("Error extracting boards:", error);
      }
      
      // Build a properly structured account object
      const account = {
        id: String(Date.now()),  // Generate a fresh ID to avoid conflicts
        username: username,      // Use the provided username for consistency
        createdAt: new Date().toISOString(),
        boards: Array.isArray(boardsArray) 
          ? boardsArray.map((board: any) => {
              const boardMap = board.M || {};
              return {
                id: boardMap.id?.S || String(Date.now() + Math.random() * 1000),
                name: boardMap.name?.S || "Untitled Board",
                url: boardMap.url?.S || "",
                description: boardMap.description?.S || ""
              };
            })
          : []
      };
      
      console.log('Returning account with structure:', JSON.stringify(account));
      
      return NextResponse.json({
        exists: true,
        account
      });
    }
    
    return NextResponse.json({
      exists: false,
      message: `No Pinterest account found with username "${username}" in DynamoDB`
    });
    
  } catch (error) {
    console.error('Error verifying Pinterest account:', error);
    return NextResponse.json(
      { 
        message: `Error verifying account: ${error instanceof Error ? error.message : String(error)}`,
        exists: false
      },
      { status: 500 }
    );
  }
} 