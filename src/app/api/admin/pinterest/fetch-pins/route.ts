import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient, ListTablesCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { transformDynamoDBJson } from '@/utils/dynamoUtils';
import { cacheData, getCachedData, deleteCachedData } from '@/utils/disk-storage';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Cache TTL in seconds (10 minutes)
const CACHE_TTL = 10 * 60;

// Function to generate cache key for pins
function getPinsCacheKey(accountId: string | undefined, username: string | undefined, boardId: string): string {
  return `pinterest:pins:${accountId || ''}:${username || ''}:board:${boardId}`;
}

// Add this type declaration at the top of the file to fix the typing issues
type DynamoDBItem = any;

// Add a comprehensive function to extract the best image URL from DynamoDB item
function extractBestImageUrl(item: any, transformed: any): string {
  // Log what we're working with
  console.log('Extracting image URL from:', JSON.stringify(item).substring(0, 200) + '...');
  
  // Start with checking the transformed data (already converted to JS objects)
  if (transformed) {
    // Check common paths in Pinterest data
    if (transformed.image_url) return transformed.image_url;
    if (transformed.image) return transformed.image;
    if (transformed.media?.url) return transformed.media.url;
    
    // Check media.images structure (common in Pinterest API)
    if (transformed.media?.images?.original?.url) return transformed.media.images.original.url;
    if (transformed.media?.images?.["236x"]?.url) return transformed.media.images["236x"].url;
    if (transformed.media?.images?.["136x136"]?.url) return transformed.media.images["136x136"].url;
    
    // Check nested images structure
    if (transformed.images?.orig?.url) return transformed.images.orig.url;
    if (transformed.images?.["236x"]?.url) return transformed.images["236x"].url;
    
    // Check for thumbnail URLs array
    if (transformed.media?.pin_thumbnail_urls && 
        Array.isArray(transformed.media.pin_thumbnail_urls) && 
        transformed.media.pin_thumbnail_urls.length > 0) {
      return transformed.media.pin_thumbnail_urls[0];
    }
  }
  
  // Fall back to DynamoDB format if needed
  if (item.image_url?.S) return item.image_url.S;
  if (item.image?.S) return item.image.S;
  if (item.media?.M?.url?.S) return item.media.M.url.S;
  if (item.images?.M?.orig?.M?.url?.S) return item.images.M.orig.M.url.S;
  
  // Return empty string if no image found
  return '';
}

// Helper function to extract pins from a DynamoDB item
function extractPinsFromItem(item: any, boardId: string): any[] {
  const extractedPins: any[] = [];
  
  // Case 1: The item has a "pins" array
  if (item.pins?.L && Array.isArray(item.pins.L)) {
    console.log(`Found pins array with ${item.pins.L.length} items`);
    
    // Extract each pin from the array
    for (const pinItem of item.pins.L) {
      const pin = pinItem.M || pinItem;
      
      // Check if this pin belongs to the requested board
      const pinBoardId = 
        (pin as DynamoDBItem).board_id?.S || 
        (pin as DynamoDBItem).boardId?.S || 
        (pin as DynamoDBItem).board?.M?.id?.S;
      
      // Match with the requested board
      if (pinBoardId === boardId) {
        // Transform the pin data
        const transformedPin = transformDynamoDBJson(pin);
        
        const extractedPin = {
          id: (pin as DynamoDBItem).id?.S || `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: (pin as DynamoDBItem).title?.S || (pin as DynamoDBItem).name?.S || 'Untitled Pin',
          description: (pin as DynamoDBItem).description?.S || '',
          board_id: pinBoardId,
          image_url: (pin as DynamoDBItem).image_url?.S || 
                    (pin as DynamoDBItem).media?.M?.url?.S || 
                    (pin as DynamoDBItem).image?.S || 
                    (pin as DynamoDBItem).images?.M?.orig?.M?.url?.S ||
                    '',
          link: (pin as DynamoDBItem).link?.S || (pin as DynamoDBItem).url?.S || '',
          created_at: (pin as DynamoDBItem).created_at?.S || new Date().toISOString(),
          transformedData: transformedPin // Add the transformed data
        };
        
        extractedPins.push(extractedPin);
      }
    }
  }
  // Case 2: The item itself is a pin
  else if (item.board_id?.S === boardId || 
          item.boardId?.S === boardId || 
          item.board?.M?.id?.S === boardId) {
    
    // Transform the item data
    const transformedItem = transformDynamoDBJson(item);
    
    const extractedPin = {
      id: item.id?.S || `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: item.title?.S || item.name?.S || 'Untitled Pin',
      description: item.description?.S || '',
      board_id: boardId,
      image_url: item.image_url?.S || 
                item.media?.M?.url?.S || 
                item.image?.S || 
                item.images?.M?.orig?.M?.url?.S ||
                '',
      link: item.link?.S || item.url?.S || '',
      created_at: item.created_at?.S || new Date().toISOString(),
      transformedData: transformedItem // Add the transformed data
    };
    
    extractedPins.push(extractedPin);
  }
  // Case 3: Look for pins in item.M structure
  else if (item.item?.M) {
    const nestedItem = item.item.M;
    
    // Case 3.1: item.M has pins array
    if (nestedItem.pins?.L && Array.isArray(nestedItem.pins.L)) {
      for (const pinItem of nestedItem.pins.L) {
        const pin = pinItem.M || pinItem;
        
        // Check board ID
        const pinBoardId = 
          (pin as DynamoDBItem).board_id?.S || 
          (pin as DynamoDBItem).boardId?.S || 
          (pin as DynamoDBItem).board?.M?.id?.S;
        
        if (pinBoardId === boardId) {
          // Transform the pin data
          const transformedPin = transformDynamoDBJson(pin);
          
          const extractedPin = {
            id: (pin as DynamoDBItem).id?.S || `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: (pin as DynamoDBItem).title?.S || (pin as DynamoDBItem).name?.S || 'Untitled Pin',
            description: (pin as DynamoDBItem).description?.S || '',
            board_id: pinBoardId,
            image_url: (pin as DynamoDBItem).image_url?.S || 
                      (pin as DynamoDBItem).media?.M?.url?.S || 
                      (pin as DynamoDBItem).image?.S || 
                      (pin as DynamoDBItem).images?.M?.orig?.M?.url?.S ||
                      '',
            link: (pin as DynamoDBItem).link?.S || (pin as DynamoDBItem).url?.S || '',
            created_at: (pin as DynamoDBItem).created_at?.S || new Date().toISOString(),
            transformedData: transformedPin // Add the transformed data
          };
          
          extractedPins.push(extractedPin);
        }
      }
    }
    // Case 3.2: item.M is a pin
    else if (nestedItem.board_id?.S === boardId || 
            nestedItem.boardId?.S === boardId || 
            nestedItem.board?.M?.id?.S === boardId) {
      
      // Transform the nested item data
      const transformedNestedItem = transformDynamoDBJson(nestedItem);
      
      const extractedPin = {
        id: nestedItem.id?.S || `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: nestedItem.title?.S || nestedItem.name?.S || 'Untitled Pin',
        description: nestedItem.description?.S || '',
        board_id: boardId,
        image_url: nestedItem.image_url?.S || 
                  nestedItem.media?.M?.url?.S || 
                  nestedItem.image?.S || 
                  nestedItem.images?.M?.orig?.M?.url?.S ||
                  '',
        link: nestedItem.link?.S || nestedItem.url?.S || '',
        created_at: nestedItem.created_at?.S || new Date().toISOString(),
        transformedData: transformedNestedItem // Add the transformed data
      };
      
      extractedPins.push(extractedPin);
    }
  }
  
  // Special case for API results (data.data structure)
  if (extractedPins.length === 0 && item.data?.M?.data?.L) {
    const apiData = item.data.M.data.L;
    
    for (const pinData of apiData) {
      if (pinData.M) {
        const pin = pinData.M;
        
        // Transform the pin data
        const transformedPinData = transformDynamoDBJson(pin);
        
        // Skip validation since we haven't found any pins
        const extractedPin = {
          id: pin.id?.S || `pin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: pin.title?.S || pin.name?.S || 'Untitled Pin',
          description: pin.description?.S || '',
          board_id: boardId,
          image_url: pin.image?.S || 
                    pin.media?.M?.url?.S || 
                    (pin.images?.M?.orig?.M?.url?.S) ||
                    '',
          link: pin.link?.S || pin.url?.S || '',
          created_at: pin.created_at?.S || new Date().toISOString(),
          transformedData: transformedPinData // Add the transformed data
        };
        
        extractedPins.push(extractedPin);
      }
    }
  }
  
  // Check for less structured matches using board ID pattern
  if (extractedPins.length === 0) {
    const findBoardIds = (obj: any, path = ''): string[] => {
      const result: string[] = [];
      
      if (!obj || typeof obj !== 'object') return result;
      
      // Check if this is a DynamoDB string
      if (obj.S && typeof obj.S === 'string') {
        // Consider it a match if the boardId is contained in the string
        if (obj.S.includes(boardId)) {
          result.push(`${path}: ${obj.S}`);
        }
      }
      
      // Loop through all properties
      for (const key in obj) {
        const newPath = path ? `${path}.${key}` : key;
        
        // For DynamoDB Map (M) type, search inside
        if (obj[key]?.M) {
          result.push(...findBoardIds(obj[key].M, newPath));
        }
        // For DynamoDB List (L) type, search each item
        else if (obj[key]?.L && Array.isArray(obj[key].L)) {
          for (let i = 0; i < obj[key].L.length; i++) {
            result.push(...findBoardIds(obj[key].L[i], `${newPath}[${i}]`));
          }
        }
        // For other DynamoDB types, check the value directly
        else {
          result.push(...findBoardIds(obj[key], newPath));
        }
      }
      
      return result;
    };
    
    const boardIdMatches = findBoardIds(item);
    
    if (boardIdMatches.length > 0) {
      // This item likely contains our board data in some form
      
      // Extract from item.data structure if it exists
      if (item.data?.M) {
        const dataM = item.data.M;
        
        // If this item has media data, it's probably a pin
        if (dataM.media?.M || dataM.image?.S || dataM.images?.M) {
          const pin = {
            id: dataM.id?.S || item.id?.S || `pin-${Date.now()}`,
            title: dataM.title?.S || dataM.name?.S || item.title?.S || item.name?.S || 'Pin',
            description: dataM.description?.S || item.description?.S || '',
            board_id: boardId,
            image_url: dataM.image?.S || 
                      dataM.media?.M?.url?.S || 
                      (dataM.images?.M?.orig?.M?.url?.S) ||
                      item.image?.S ||
                      '',
            link: dataM.link?.S || dataM.url?.S || item.link?.S || '',
            created_at: dataM.created_at?.S || item.created_at?.S || new Date().toISOString(),
            transformedData: transformDynamoDBJson(dataM)
          };
          
          if (pin.image_url || pin.title !== 'Pin') {
            extractedPins.push(pin);
          }
        }
      }
      
      // Directly use the item itself as a pin
      const pinFromItem = {
        id: item.id?.S || `pin-${Date.now()}`,
        title: item.title?.S || item.name?.S || 'Pinterest Pin',
        description: item.description?.S || '',
        board_id: boardId,
        image_url: item.image?.S || 
                  item.image_url?.S || 
                  (item.images?.M?.orig?.M?.url?.S) ||
                  (item.media?.M?.url?.S) || 
                  '',
        link: item.link?.S || item.url?.S || '',
        created_at: item.created_at?.S || new Date().toISOString(),
        transformedData: transformDynamoDBJson(item)
      };
      
      extractedPins.push(pinFromItem);
      
      // Look for a pins array in the item
      if (item.pins?.L && Array.isArray(item.pins.L)) {
        for (const pinItem of item.pins.L) {
          const pin = pinItem.M || pinItem;
          const transformedPin = transformDynamoDBJson(pin);
          
          const extractedPin = {
            id: (pin as DynamoDBItem).id?.S || `pin-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            title: (pin as DynamoDBItem).title?.S || (pin as DynamoDBItem).name?.S || 'Pin',
            description: (pin as DynamoDBItem).description?.S || '',
            board_id: boardId, // Use the board ID we know matches
            image_url: (pin as DynamoDBItem).image_url?.S || 
                      (pin as DynamoDBItem).media?.M?.url?.S || 
                      (pin as DynamoDBItem).image?.S || 
                      (pin as DynamoDBItem).images?.M?.orig?.M?.url?.S || 
                      '',
            link: (pin as DynamoDBItem).link?.S || (pin as DynamoDBItem).url?.S || '',
            created_at: (pin as DynamoDBItem).created_at?.S || new Date().toISOString(),
            transformedData: transformedPin
          };
          
          extractedPins.push(extractedPin);
        }
      }
    }
  }
  
  return extractedPins;
}

export async function POST(request: NextRequest) {
  try {
    // Get account username/ID and board ID from request body
    const { username, accountId, boardId } = await request.json();
    
    if ((!username && !accountId) || !boardId) {
      console.error('Missing username/accountId or boardId for fetching pins');
      return NextResponse.json(
        { message: 'Either username or accountId, and boardId are required', success: false },
        { status: 400 }
      );
    }
    
    console.log(`Fetching pins for board ${boardId} from account ${username || accountId}`);

    // Try to get data from cache first
    const cacheKey = getPinsCacheKey(accountId, username, boardId);
    const cachedData = await getCachedData<{ success: boolean; pins: any[] }>(cacheKey);

    if (cachedData) {
      console.log('Returning pins data from cache');
      return NextResponse.json(cachedData);
    }

    console.log('No cached data found, fetching from DynamoDB...');
    
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
    
    // Step 2: Filter tables containing "pinterest" and "pins"
    const relevantTables = TableNames.filter(
      table => table?.toLowerCase().includes('pinterest') && table?.toLowerCase().includes('pins')
    );
    
    if (relevantTables.length === 0) {
      console.log('No relevant Pinterest pins tables found');
      return NextResponse.json(
        { message: 'No Pinterest pins tables found in DynamoDB', success: false },
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
        
        // Deep search for identifier (username or accountId) in the first item
        const searchForIdentifier = (obj: any): boolean => {
          if (!obj || typeof obj !== 'object') return false;
          
          // Check if this is a DynamoDB string that matches our username or accountId
          if ((username && obj.S === username) || (accountId && obj.S === accountId)) return true;
          
          // Loop through all properties
          for (const key in obj) {
            // For DynamoDB Map (M) type, search inside
            if (obj[key]?.M && searchForIdentifier(obj[key].M)) return true;
            // For DynamoDB List (L) type, search each item
            else if (obj[key]?.L && Array.isArray(obj[key].L)) {
              for (let i = 0; i < obj[key].L.length; i++) {
                if (searchForIdentifier(obj[key].L[i])) return true;
              }
            }
            // For other DynamoDB types, check directly
            else if (searchForIdentifier(obj[key])) return true;
          }
          
          return false;
        };
        
        const isMatch = searchForIdentifier(firstItem);
        
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
        message: `No Pinterest account found with the provided credentials in DynamoDB`
      });
    }
    
    // Step 4: Now that we've verified the account exists, fetch all pins using pagination
    console.log(`Account verified, now fetching all pins from table ${foundTableName}`);
    let allPins: any[] = [];
    
    try {
      // Implement pagination for fetching all pins
      let lastEvaluatedKey: Record<string, any> | undefined = undefined;
      let totalItemsScanned = 0;
      let batchNumber = 0;
      const BATCH_SIZE = 100; // Number of items to fetch in each batch
      
      do {
        batchNumber++;
        console.log(`Fetching batch #${batchNumber}...`);
        
        // Fetch batch of items from the verified table
        const scanParams: any = {
          TableName: foundTableName,
          Limit: BATCH_SIZE
        };
        
        // Add the ExclusiveStartKey for pagination if we have a lastEvaluatedKey
        if (lastEvaluatedKey) {
          scanParams.ExclusiveStartKey = lastEvaluatedKey;
        }
        
        // Execute the scan
        const scanResponse = await dynamoClient.send(new ScanCommand(scanParams));
        
        // Process this batch of items
        if (scanResponse.Items && scanResponse.Items.length > 0) {
          totalItemsScanned += scanResponse.Items.length;
          console.log(`Retrieved ${scanResponse.Items.length} items (total so far: ${totalItemsScanned})`);
          
          // Process each item in this batch
          for (const item of scanResponse.Items) {
            // Extract pins for this board from the item
            const pinsFromItem = extractPinsFromItem(item, boardId);
            
            // Add pins to our collection
            if (pinsFromItem.length > 0) {
              allPins = [...allPins, ...pinsFromItem];
              console.log(`Found ${pinsFromItem.length} pins for board ${boardId} in this item (total pins: ${allPins.length})`);
            }
          }
        }
        
        // Get the key for the next batch
        lastEvaluatedKey = scanResponse.LastEvaluatedKey;
        
      } while (lastEvaluatedKey);
    } catch (error) {
      console.error(`Error fetching pins from table ${foundTableName}:`, error);
    }
    
    console.log(`Found ${allPins.length} pins for board ${boardId}`);
    
    // Make sure every pin has transformedData and the best possible image
    const enhancedPins = allPins.map(pin => {
      // If pin already has transformedData, use it, otherwise create it
      const transformedData = pin.transformedData || {};
      
      // Get the best image URL we can find
      const imageUrl = pin.image_url || extractBestImageUrl(pin, transformedData);
      
      // Create a complete enhanced pin with fallbacks between transformed and original data
      const enhancedPin = {
        ...pin,
        image_url: imageUrl,
        // Ensure the transformedData is always available
        transformedData: transformedData
      };
      
      // Return enhanced pin
      return enhancedPin;
    });
    
    // Remove duplicate pins based on id
    const uniquePins = Array.from(new Map(enhancedPins.map(pin => [pin.id, pin])).values());
    console.log(`After removing duplicates: ${uniquePins.length} unique pins`);
    
    // After successfully fetching pins, cache the response
    const response = {
      success: true,
      pins: uniquePins,
      total: uniquePins.length
    };

    // Cache the response
    await cacheData(cacheKey, response, CACHE_TTL);
    console.log(`Cached pins data with key: ${cacheKey}`);

    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error in Pinterest pins fetch:', error);
    return NextResponse.json(
      { message: 'Failed to fetch Pinterest pins', success: false },
      { status: 500 }
    );
  }
}

// Add DELETE method to invalidate cache
export async function DELETE(request: NextRequest) {
  try {
    const { username, accountId, boardId } = await request.json();
    
    if ((!username && !accountId) || !boardId) {
      return NextResponse.json(
        { message: 'Either username or accountId, and boardId are required', success: false },
        { status: 400 }
      );
    }

    const cacheKey = getPinsCacheKey(accountId, username, boardId);
    await deleteCachedData(cacheKey);
    
    return NextResponse.json({
      success: true,
      message: 'Pins cache invalidated successfully'
    });
  } catch (error) {
    console.error('Error invalidating pins cache:', error);
    return NextResponse.json(
      { message: 'Failed to invalidate pins cache', success: false },
      { status: 500 }
    );
  }
} 