import { NextRequest, NextResponse } from 'next/server';
import { ListTablesCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { transformDynamoDBJson } from '@/utils/dynamoUtils';
import { cacheData, getCachedData, deleteCachedData } from '@/utils/disk-storage';
import { client } from '@/utils/aws-config';

// Initialize DynamoDB client
const dynamoClient = client;

// Cache TTL in seconds (10 minutes)
const CACHE_TTL = 10 * 60;

// Function to generate cache key for boards
function getBoardsCacheKey(accountId: string | undefined, username: string | undefined): string {
  return `pinterest:boards:${accountId || ''}:${username || ''}`;
}

export async function POST(request: NextRequest) {
  try {
    // Get accountId from request body
    const { accountId, username } = await request.json();
    
    if (!accountId && !username) {
      console.error('No accountId or username provided for fetching boards');
      return NextResponse.json(
        { message: 'Account ID or username is required', success: false },
        { status: 400 }
      );
    }
    
    console.log(`Fetching Pinterest boards for account: ${accountId || username}`);

    // Try to get data from cache first
    const cacheKey = getBoardsCacheKey(accountId, username);
    const cachedData = await getCachedData<{ success: boolean; boards: any[] }>(cacheKey);

    if (cachedData) {
      console.log('Returning boards data from cache');
      return NextResponse.json(cachedData);
    }

    console.log('No cached data found, fetching from DynamoDB...');
    
    // First, check our accounts table
    try {
      const accountsTableName = 'pinterest_inkhub_accounts';
      console.log(`First checking for account in ${accountsTableName} table...`);
      
      // Scan the accounts table
      const scanAccountsCommand = new ScanCommand({
        TableName: accountsTableName
      });
      
      try {
        const accountsResponse = await dynamoClient.send(scanAccountsCommand);
        
        if (accountsResponse.Items && accountsResponse.Items.length > 0) {
          console.log(`Found ${accountsResponse.Items.length} accounts in ${accountsTableName}`);
          
          // Find the matching account
          const matchingAccount = accountsResponse.Items.find(item => {
            // Match by accountId if provided
            if (accountId && item.id?.S === accountId) {
              return true;
            }
            
            // Match by username if provided
            if (username && item.username?.S === username) {
              return true;
            }
            
            return false;
          });
          
          if (matchingAccount) {
            console.log('Found matching account in pinterest_inkhub_accounts table');
            const transformedAccount = transformDynamoDBJson(matchingAccount);
            console.log('Transformed account:', JSON.stringify(transformedAccount, null, 2));
            
            // If the account has boards, return them
            if (transformedAccount.boards && Array.isArray(transformedAccount.boards) && transformedAccount.boards.length > 0) {
              console.log(`Found ${transformedAccount.boards.length} boards in account`);
              
              // Cache the boards
              await cacheData(cacheKey, { success: true, boards: transformedAccount.boards }, CACHE_TTL);
              
              return NextResponse.json({
                success: true,
                boards: transformedAccount.boards
              });
            }
            
            // Account found but no boards, continue with standard board lookup
            console.log('Account found in pinterest_inkhub_accounts but no boards, continuing with search...');
          }
        }
      } catch (error) {
        console.warn(`Error checking ${accountsTableName} table:`, error);
        // Continue with the normal flow
      }
    } catch (error) {
      console.warn('Error accessing pinterest_inkhub_accounts table:', error);
      // Continue with the normal flow
    }
    
    // Step 1: List all tables
    const listTablesCommand = new ListTablesCommand({});
    const { TableNames } = await dynamoClient.send(listTablesCommand);
    
    if (!TableNames || TableNames.length === 0) {
      console.log('No tables found in DynamoDB');
      return NextResponse.json(
        { message: 'No DynamoDB tables found', success: false },
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
        { message: 'No Pinterest board tables found in DynamoDB', success: false },
        { status: 404 }
      );
    }
    
    console.log(`Found ${relevantTables.length} relevant tables: ${relevantTables.join(', ')}`);
    
    // Step 3: First verify account exists using just the first item
    let accountFound = false;
    let foundTableName = '';
    
    // Verification phase - just check the first item from each table
    for (const tableName of relevantTables) {
      if (accountFound) break;
      
      try {
        // Get just the first item for verification
        const scanCommand = new ScanCommand({
          TableName: tableName,
          Limit: 1 // Just scan one item for verification
        });
        
        const scanResponse = await dynamoClient.send(scanCommand);
        
        if (!scanResponse.Items || scanResponse.Items.length === 0) {
          continue;
        }
        
        const firstItem = scanResponse.Items[0];
        console.log(`Verifying with first item from ${tableName}:`, JSON.stringify(firstItem).substring(0, 100) + '...');
        
        // Check if this item matches our account
        let isMatch = false;
        
        // Match by accountId if provided
        if (accountId) {
          if (firstItem.id?.S === accountId || 
              firstItem.item?.M?.id?.S === accountId || 
              firstItem.account_id?.S === accountId) {
            isMatch = true;
          }
        }
        
        // Match by username if provided and not already matched
        if (!isMatch && username) {
          // Simple check for username in the first item
          const searchForUsername = (obj: any): boolean => {
            if (!obj || typeof obj !== 'object') return false;
            
            // Check if this is a DynamoDB string that matches our username
            if (obj.S === username) return true;
            
            // Loop through all properties
            for (const key in obj) {
              // For DynamoDB Map (M) type, search inside
              if (obj[key]?.M && searchForUsername(obj[key].M)) return true;
              // For DynamoDB List (L) type, search each item
              else if (obj[key]?.L && Array.isArray(obj[key].L)) {
                for (let i = 0; i < obj[key].L.length; i++) {
                  if (searchForUsername(obj[key].L[i])) return true;
                }
              }
              // For other DynamoDB types, check directly
              else if (searchForUsername(obj[key])) return true;
            }
            
            return false;
          };
          
          isMatch = searchForUsername(firstItem);
        }
        
        if (isMatch) {
          accountFound = true;
          foundTableName = tableName;
          console.log(`Account verified in table ${tableName}`);
        }
        
      } catch (error) {
        console.error(`Error verifying account in table ${tableName}:`, error);
      }
    }
    
    if (!accountFound) {
      return NextResponse.json({
        success: false,
        message: `No Pinterest account found with the provided details`
      });
    }
    
    // Step 4: Now that we've verified the account exists, fetch all boards
    console.log(`Account verified, now fetching all boards from table ${foundTableName}`);
    let allBoards: any[] = [];
    
    try {
      // Fetch all items from the verified table
      const fullScanCommand = new ScanCommand({
        TableName: foundTableName
      });
      
      const fullScanResponse = await dynamoClient.send(fullScanCommand);
      console.log(`Found ${fullScanResponse.Items?.length || 0} total items`);
      
      // Log the full scan response for debugging
      console.log('Full scan response from DynamoDB:');
      if (fullScanResponse.Items && fullScanResponse.Items.length > 0) {
        fullScanResponse.Items.forEach((item, index) => {
          // console.log(`ITEM ${index + 1} FULL DATA:`, JSON.stringify(item, null, 2));
          // Transform the DynamoDB item to a regular JavaScript object
          const transformedItem = transformDynamoDBJson(item);
          // console.log(`ITEM ${index + 1} TRANSFORMED:`, JSON.stringify(transformedItem, null, 2));
        });
      }
      
      if (fullScanResponse.Items && fullScanResponse.Items.length > 0) {
        // Process each item to extract boards
        for (const item of fullScanResponse.Items) {
          // Extract boards data - try multiple possible locations
          let boardsData: any[] = [];
          
          // Option 1: Direct boards property
          if (item.boards?.L) {
            boardsData = item.boards.L;
          }
          // Option 2: Boards inside item.M
          else if (item.item?.M?.boards?.L) {
            boardsData = item.item.M.boards.L;
          }
          // Option 3: The entire item might be a board
          else if (item.name?.S || item.id?.S) {
            boardsData = [item];
          }
          
          // Convert any found boards to standardized format
          if (boardsData.length > 0) {
            const boards = boardsData.map((board: any) => {
              // Handle if board is a DynamoDB map
              const boardData = board.M || board;
              
              // Log the complete board structure without truncation
              // console.log('COMPLETE BOARD DATA:', JSON.stringify(boardData, null, 2));
              // Transform the DynamoDB board data to a regular JavaScript object
              const transformedBoardData = transformDynamoDBJson(boardData);
              // console.log('TRANSFORMED BOARD DATA:', JSON.stringify(transformedBoardData, null, 2));
              
              // Extract image URLs from transformed data directly
              let imageUrl = '';
              
              if (transformedBoardData) {
                // Try with the transformed data structure first
                if (transformedBoardData.media?.image_cover_url) {
                  imageUrl = transformedBoardData.media.image_cover_url;
                } else if (transformedBoardData.media?.pin_thumbnail_urls && transformedBoardData.media.pin_thumbnail_urls.length > 0) {
                  imageUrl = transformedBoardData.media.pin_thumbnail_urls[0];
                } else if (transformedBoardData.Item?.media?.image_cover_url) {
                  imageUrl = transformedBoardData.Item.media.image_cover_url;
                } else if (transformedBoardData.Item?.media?.pin_thumbnail_urls && transformedBoardData.Item.media.pin_thumbnail_urls.length > 0) {
                  imageUrl = transformedBoardData.Item.media.pin_thumbnail_urls[0];
                }

                // Fall back to original extraction if needed
                if (!imageUrl) {
                  // Try different image paths (existing code)
                  if (boardData.image_thumbnail_url?.S) {
                    imageUrl = boardData.image_thumbnail_url.S;
                  } else if (boardData.image?.S) {
                    imageUrl = boardData.image.S;
                  } else if (boardData.thumbnail_url?.S) {
                    imageUrl = boardData.thumbnail_url.S;
                  } else if (boardData.cover_photo?.M?.image?.M?.original?.M?.url?.S) {
                    imageUrl = boardData.cover_photo.M.image.M.original.M.url.S;
                  } else if (boardData.images?.M?.original?.M?.url?.S) {
                    imageUrl = boardData.images.M.original.M.url.S;
                  } else if (boardData.media?.M?.images?.M?.original?.M?.url?.S) {
                    imageUrl = boardData.media.M.images.M.original.M.url.S;
                  } else if (boardData.coverPhoto?.M?.url?.S) {
                    imageUrl = boardData.coverPhoto.M.url.S;
                  } else if (boardData.cover_image?.S) {
                    imageUrl = boardData.cover_image.S;
                  } else if (boardData.thumbnail?.S) {
                    imageUrl = boardData.thumbnail.S;
                  }
                }
              }
              
              // Extract board name, also from transformed data
              let boardName = 'Untitled Board';
              if (transformedBoardData && transformedBoardData.name) {
                boardName = transformedBoardData.name;
              } else if (transformedBoardData && transformedBoardData.Item && transformedBoardData.Item.name) {
                boardName = transformedBoardData.Item.name;
              } else if (boardData.name?.S) {
                boardName = boardData.name.S;
              } else if (boardData.title?.S) {
                boardName = boardData.title.S;
              } else if (boardData.board_name?.S) {
                boardName = boardData.board_name.S;
              }
              
              // Get description from transformed data if available
              let description = '';
              if (transformedBoardData && transformedBoardData.description) {
                description = transformedBoardData.description;
              } else if (transformedBoardData && transformedBoardData.Item && transformedBoardData.Item.description) {
                description = transformedBoardData.Item.description;
              } else if (boardData.description?.S) {
                description = boardData.description.S;
              }
              
              // If we find a URL that doesn't include http, add it
              if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = 'https://' + imageUrl;
              }
              
              console.log(`Board name: ${boardName}, image URL: ${imageUrl}`);
              
              // Get pin count if available in transformed data
              let pinCount = 0;
              if (transformedBoardData && transformedBoardData.pin_count) {
                pinCount = transformedBoardData.pin_count;
              } else if (transformedBoardData && transformedBoardData.Item && transformedBoardData.Item.pin_count) {
                pinCount = transformedBoardData.Item.pin_count;
              }
              
              // Get created date from transformed data if available
              let createdAt = new Date().toISOString();
              if (transformedBoardData && transformedBoardData.created_at) {
                createdAt = transformedBoardData.created_at;
              } else if (transformedBoardData && transformedBoardData.Item && transformedBoardData.Item.created_at) {
                createdAt = transformedBoardData.Item.created_at;
              } else if (boardData.created_at?.S) {
                createdAt = boardData.created_at.S;
              }
              
              return {
                id: transformedBoardData?.id || transformedBoardData?.Item?.id || boardData.id?.S || boardData.board_id?.S || `board-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: boardName,
                description: description,
                url: transformedBoardData?.url || transformedBoardData?.Item?.url || boardData.url?.S || '',
                image_thumbnail_url: imageUrl,
                created_at: createdAt,
                pin_count: pinCount,
                // Include additional data that might be useful for the board cards
                media: transformedBoardData?.media || transformedBoardData?.Item?.media || null
              };
            });
            
            allBoards = [...allBoards, ...boards];
          }
        }
      }
    } catch (error) {
      console.error(`Error fetching all boards from table ${foundTableName}:`, error);
    }
    
    console.log(`Found a total of ${allBoards.length} boards`);
    
    // After successfully fetching boards, cache the response
    const response = {
      success: true,
      boards: allBoards
    };

    // Cache the response
    await cacheData(cacheKey, response, CACHE_TTL);
    console.log(`Cached boards data with key: ${cacheKey}`);

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in Pinterest boards fetch:', error);
    return NextResponse.json(
      { message: 'Failed to fetch Pinterest boards', success: false },
      { status: 500 }
    );
  }
}

// Add DELETE method to invalidate cache
export async function DELETE(request: NextRequest) {
  try {
    const { accountId, username } = await request.json();
    
    if (!accountId && !username) {
      return NextResponse.json(
        { message: 'Account ID or username is required', success: false },
        { status: 400 }
      );
    }

    const cacheKey = getBoardsCacheKey(accountId, username);
    await deleteCachedData(cacheKey);
    
    return NextResponse.json({
      success: true,
      message: 'Boards cache invalidated successfully'
    });
  } catch (error) {
    console.error('Error invalidating boards cache:', error);
    return NextResponse.json(
      { message: 'Failed to invalidate boards cache', success: false },
      { status: 500 }
    );
  }
} 