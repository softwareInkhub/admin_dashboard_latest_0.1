# DynamoDB Admin & Pinterest Board Manager

A Next.js application for managing and visualizing DynamoDB tables, with advanced disk-based caching and Pinterest board/account integration.

---

## Architecture Overview

The application is built with a multi-layered architecture:

1. **Frontend Layer (React/Next.js)**
   - UI for managing Pinterest accounts and boards
   - Table and pin visualization
   - Account creation and verification flows

2. **API Layer (Next.js API routes)**
   - RESTful endpoints for DynamoDB operations
   - Pinterest account and board management
   - Disk-based cache management

3. **Cache Layer (Disk Storage)**
   - Caches DynamoDB data on disk for fast access
   - Implements stale-while-revalidate and TTL
   - Handles cache invalidation and background refresh

4. **DynamoDB Layer**
   - AWS DynamoDB client (using IAM roles on EC2)
   - Table and item operations
   - Query and scan support

---

## Data Flow: DynamoDB, Caching, and UI

### 1. Fetching Table Data
- When a user requests data (e.g., Pinterest boards or pins), the API first checks the disk cache.
- If cached data is available and fresh, it is returned immediately.
- If the cache is missing or stale, the API fetches data from DynamoDB, updates the cache, and returns the data.
- The cache is stored on disk (not Redis), using structured keys and TTLs for each data type.

### 2. Caching Mechanics
- **Disk-based cache**: Data is serialized and stored in files on disk, with metadata for TTL and staleness.
- **Stale-While-Revalidate**: If cached data is stale, it is returned immediately, and a background refresh is triggered to update the cache from DynamoDB.
- **Cache Keys**: Keys are structured by table, query, and parameters to avoid collisions.
- **Cache Invalidation**: Manual or automatic invalidation is supported via API endpoints or TTL expiry.
- **Cache Stats**: The app tracks cache hits, misses, and stale hits for monitoring.

### 3. Pinterest Account Creation & Verification
- **Account Creation**:
  - User enters a Pinterest username in the UI.
  - The API verifies the account by scanning the relevant DynamoDB board table for a matching username.
  - If a match is found, the account and its boards are loaded into the UI and cached on disk.
  - If the board table for that account has not been uploaded to DynamoDB, account creation will fail (ensuring only valid Pinterest accounts are added).
- **Data Loading**:
  - When an account is loaded, all its boards and pins are fetched from DynamoDB (with caching) and displayed in a responsive, masonry-style UI.
  - The first item in the board table is queried to verify the username and load associated data.

### 4. Pinterest Board & Pin Management
- Boards and pins are visualized using a masonry layout for a Pinterest-like experience.
- Pin data is fetched from DynamoDB, cached on disk, and displayed with support for search, sort, and filter.
- The UI supports modal previews, tag filtering, and responsive layouts.

---

## Caching Implementation Details

- **Location**: All cache files are stored on disk (see `src/utils/disk-storage.ts`).
- **Structure**: Each cache entry includes the data, a timestamp, and TTL metadata.
- **Stale-While-Revalidate**: When a cache entry is stale, it is returned immediately, and a background refresh is triggered to update the cache asynchronously.
- **Cache Keys**: Keys are generated based on table name, query parameters, and data type (e.g., `dynamodb:table:accounts:items`).
- **Invalidation**: Cache can be invalidated manually via API or automatically via TTL expiry.
- **Stats**: The app tracks cache hits, misses, and stale hits for each table and query.
- **Performance**: Disk caching provides fast access for repeated queries and reduces DynamoDB costs.

---

## Error Handling & Monitoring

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

---

## Project Features

- **DynamoDB Table Management**: List, scan, and query tables; view table details and items.
- **Pinterest Account Management**: Add, verify, and view Pinterest accounts and boards.
- **Pin Visualization**: Responsive, masonry-style layout for pins, with search, sort, and filter.
- **Disk-Based Caching**: Fast, persistent caching of DynamoDB data with stale-while-revalidate.
- **Background Refresh**: Automatic cache refresh in the background for stale data.
- **Cache Stats**: Real-time cache hit/miss/stale statistics in the UI.
- **Error Handling**: Robust error handling for DynamoDB and cache operations.
- **EC2/IAM Integration**: Secure AWS access using IAM roles (no hardcoded credentials).

---

## How to Use

1. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```
2. **Run the development server**:
   ```bash
   npm run dev
   # or
   yarn dev
   ```
3. **Access the app**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Add a Pinterest Account**:
   - Go to the Pinterest Accounts page.
   - Enter a username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

5. **View Boards and Pins**:
   - Click on an account to view its boards.
   - Click on a board to view pins in a masonry layout.
   - Use search, sort, and filter to explore pins.

6. **Cache Management**:
   - The app automatically caches all DynamoDB data on disk.
   - Stale data is refreshed in the background.
   - Cache stats and invalidation options are available in the UI.

---

## Environment Variables

- `AWS_REGION`: AWS region for DynamoDB
- `CACHE_TTL`: Default cache TTL (in seconds)
- `TABLE_LIST_TTL`, `TABLE_DETAILS_TTL`, `TABLE_ITEMS_TTL`, `QUERY_RESULTS_TTL`, `STATS_TTL`, `STALE_THRESHOLD`: Fine-tune cache behavior

---

## Further Details

- **No Account Deletion**: For data safety, account deletion is disabled in both the UI and API.
- **Automatic Table Creation**: If a required DynamoDB table does not exist, the app will attempt to create it automatically.
- **IAM Role Usage**: The app is designed to run securely on EC2 with IAM roles, avoiding hardcoded AWS credentials.
- **Extensible Caching**: The disk cache can be extended or replaced with Redis or another backend if needed.
- **Background Tasks**: Background refresh and cache maintenance are handled asynchronously for performance.

---

## Contributing

Pull requests and issues are welcome! Please open an issue for bugs or feature requests.

---

## License

MIT

# Next.js Project

This is a [Next.js](https://nextjs.org/) project bootstrapped with custom configuration.

## Getting Started

First, install the dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Project Structure

- `src/app/` - Contains the application routes and pages
- `src/components/` - Reusable UI components
- `src/utils/` - Utility functions and helpers
- `src/styles/` - Global styles and CSS modules
- `public/` - Static assets like images and fonts 

# DynamoDB Admin Application - Caching Implementation

This document provides a comprehensive guide to the caching implementation used in the DynamoDB Admin Application. The application implements a robust caching layer using Redis to optimize the performance of DynamoDB operations and reduce costs associated with frequent API calls.

## Table of Contents

1. [Caching Architecture Overview](#caching-architecture-overview)
2. [Redis Client Implementation](#redis-client-implementation)
3. [DynamoDB Cache Service](#dynamodb-cache-service)
4. [Stale-While-Revalidate Pattern](#stale-while-revalidate-pattern)
5. [Cache Invalidation](#cache-invalidation)
6. [Cache Statistics and Analysis](#cache-statistics-and-analysis)
7. [Configuration Options](#configuration-options)
8. [Performance Considerations](#performance-considerations)

## Caching Architecture Overview

The application implements a multi-layered caching strategy:

1. **Redis Cache Layer**: Primary cache storage using Redis Cloud
2. **DynamoDB Service Layer**: Interacts with AWS DynamoDB and handles data normalization
3. **API Layer**: Provides endpoints for the frontend and manages cache interactions
4. **UI Layer**: React components that display the cached data

The caching flow is:
- Check Redis cache first for requested data
- Return cached data if available (even if stale)
- If data is stale, trigger background refresh 
- If data is not in cache, fetch from DynamoDB and cache it

## Redis Client Implementation

The Redis client (`src/utils/redis-client.ts`) handles all interactions with Redis:

### Connection Management

- Establishes connection to Redis Cloud
- Implements connection pooling for efficient resource utilization
- Handles reconnection with exponential backoff
- Provides robust error handling for network failures

### Data Operations

- **Data Compression**: Compresses large data payloads using zlib before storing
- **Chunking Mechanism**: Automatically chunks large data (>1MB) into smaller pieces
- **Pipelining**: Uses Redis pipelining for bulk operations to reduce network roundtrips
- **Batch Operations**: Implements MGET for retrieving multiple keys in a single operation

```typescript
// Example of pipelining and batch operations
const pipeline = redisClient.pipeline();
for (let i = 0; i < chunksCount; i++) {
  pipeline.set(chunkKey, chunk, 'EX', expiryInSeconds);
}
await pipeline.exec();
```

## DynamoDB Cache Service

The cache service (`src/utils/dynamodb-cache-service.ts`) manages the caching logic:

### Cache Keys

Structured naming convention for different types of data:
- `dynamodb:tables`: List of all tables
- `dynamodb:table:{tableName}:details`: Table metadata
- `dynamodb:table:{tableName}:items:{params}`: Table items with specific query parameters
- `dynamodb:table:{tableName}:query:{queryHash}`: Results of specific queries
- `dynamodb:cache:stats`: Cache statistics

### TTL Management

Different TTL values for different types of data:
- Table List: 30 minutes (configurable via `TABLE_LIST_TTL`)
- Table Details: 1 hour (configurable via `TABLE_DETAILS_TTL`)
- Table Items: 30 minutes (configurable via `TABLE_ITEMS_TTL`)
- Query Results: 15 minutes (configurable via `QUERY_RESULTS_TTL`)
- Cache Stats: 24 hours (configurable via `STATS_TTL`)

## Stale-While-Revalidate Pattern

The application implements the stale-while-revalidate pattern to provide optimal performance:

1. **Definition**: Return stale (cached) data immediately while refreshing it asynchronously in the background
2. **Implementation**: 
   - Each cached item includes a timestamp
   - When a request comes in, the timestamp is checked against the TTL
   - If > 75% of TTL has elapsed, data is considered "stale" (configurable via `STALE_THRESHOLD`)
   - Stale data is returned immediately while a background job fetches fresh data
   - Background refresh updates the cache without blocking the response

```typescript
// Stale check logic
function isDataStale(timestamp: number, ttl: number): boolean {
  const age = (Date.now() - timestamp) / 1000; // Age in seconds
  return age > (ttl * STALE_THRESHOLD);
}
```

### Background Refresh

In route handlers (e.g., `src/app/api/admin/dynamodb/tables/[tableName]/route.ts`), background refresh is implemented using non-blocking promises:

```typescript
if (detailsAreStale) {
  backgroundRefreshPromises.push(
    (async () => {
      try {
        console.log(`[BACKGROUND] Refreshing stale table details for ${tableName}`);
        const freshDetails = await getTableDetails(tableName);
        await cacheTableDetails(tableName, freshDetails);
      } catch (error) {
        console.error(`[BACKGROUND] Error refreshing table details:`, error);
      }
    })()
  );
}
```

## Cache Invalidation

Several mechanisms for invalidation are implemented:

1. **Automatic**: TTL-based expiry handled by Redis
2. **Manual**: Clear cache button in the UI
3. **Selective**: Route handlers for explicit invalidation of specific tables
4. **Pattern-based**: Clear cache by pattern (e.g., all data for a specific table)

```typescript
// Pattern-based cache clearing
export async function clearCacheByPattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

## Cache Statistics and Analysis

The application tracks and stores cache performance metrics:

1. **Cache Hits**: Count of successful cache retrievals
2. **Cache Misses**: Count of failed cache retrievals
3. **Stale Hits**: Count of stale data retrievals
4. **Per-Table Stats**: Statistics broken down by table

This data is used for:
- Performance monitoring
- Cache optimization
- Identifying popular tables for prefetching

The `prefetchPopularData` function uses these statistics to proactively cache frequently accessed tables:

```typescript
export async function prefetchPopularData(
  fetchTablesFunction: () => Promise<string[]>,
  fetchTableDetailsFunction: (tableName: string) => Promise<any>
): Promise<void> {
  // Get cache stats to find popular tables
  const stats = await getCacheStats();
  
  // Sort tables by access frequency
  const sortedTables = Object.entries(stats.tableStats)
    .map(([tableName, tableStats]) => ({
      tableName,
      accessCount: tableStats.hits + tableStats.misses + tableStats.staleHits
    }))
    .sort((a, b) => b.accessCount - a.accessCount)
    .slice(0, 5); // Get top 5 most accessed tables
    
  // Prefetch data for popular tables
  for (const { tableName } of sortedTables) {
    // Check if cache is stale or missing
    const key = CACHE_KEYS.TABLE_DETAILS(tableName);
    const cachedData = await getCachedData(key);
    const isStale = !cachedData || await isCacheStale(key);
    
    if (isStale) {
      console.log(`Prefetching data for popular table: ${tableName}`);
      const details = await fetchTableDetailsFunction(tableName);
      await cacheTableDetails(tableName, details);
    }
  }
}
```

## Configuration Options

All caching parameters are configurable via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | Redis Cloud URL |
| `REDIS_CACHE_TTL` | Default TTL for cached items | 3600 (1 hour) |
| `TABLE_LIST_TTL` | TTL for table list | 1800 (30 minutes) |
| `TABLE_DETAILS_TTL` | TTL for table details | 3600 (1 hour) |
| `TABLE_ITEMS_TTL` | TTL for table items | 1800 (30 minutes) |
| `QUERY_RESULTS_TTL` | TTL for query results | 900 (15 minutes) |
| `STATS_TTL` | TTL for cache statistics | 86400 (24 hours) |
| `STALE_THRESHOLD` | Threshold for considering data stale | 0.75 (75% of TTL) |

## Performance Considerations

### Optimizations Implemented

1. **Data Compression**: Uses zlib to compress cached data
2. **Chunking**: Automatically splits large datasets into manageable chunks
3. **Connection Pooling**: Reuses Redis connections
4. **Pipelining**: Batches operations to reduce round trips
5. **MGET for Batch Retrieval**: Fetches multiple keys in one operation
6. **Smaller Chunk Size**: Uses 512KB chunks for optimal network transfer

### Potential Bottlenecks and Solutions

1. **Network Latency**: 
   - Redis Cloud region selection is critical
   - Monitor latency between application server and Redis

2. **Large Datasets**: 
   - For very large tables, consider selective caching of critical fields
   - Implement pagination at cache level

3. **High Write Volume**: 
   - Implement cache write debouncing for frequently updated data
   - Consider write-through vs. write-behind strategies

4. **Cache Eviction**: 
   - Monitor cache memory usage
   - Implement size-based limits for very large tables

---

This caching implementation provides significant performance improvements and cost savings by reducing the number of direct DynamoDB API calls, while ensuring that users always get fast responses with the most up-to-date data possible. 

# Project Name

A modern web application with social media integration capabilities.

## Pinterest Integration

This project includes a comprehensive Pinterest integration that allows users to:

- Connect Pinterest accounts via OAuth
- View and create Pinterest boards
- View and create Pinterest pins
- Manage multiple Pinterest accounts

### Setting Up Pinterest Integration

1. Create a Pinterest Developer account at [https://developers.pinterest.com/](https://developers.pinterest.com/)
2. Create a new app in the Pinterest Developer Dashboard
3. Set the redirect URI to: `http://localhost:3000/pinterest/oauth-callback` (or your production URL)
4. Copy your App ID and Secret
5. Add the following environment variables to your `.env` file:

```
NEXT_PUBLIC_PINTEREST_CLIENT_ID=your_pinterest_client_id
PINTEREST_CLIENT_SECRET=your_pinterest_client_secret
NEXT_PUBLIC_PINTEREST_REDIRECT_URI=http://localhost:3000/pinterest/oauth-callback
```

### Pinterest API Features

The integration provides the following features:

- **Authentication**: OAuth 2.0 flow for secure user authentication
- **Account Management**: Connect and manage multiple Pinterest accounts
- **Board Management**: View and create Pinterest boards
- **Pin Management**: View and create pins on boards

### Project Structure

- `/src/types/pinterest.ts` - TypeScript interfaces for Pinterest data
- `/src/services/pinterestService.ts` - Service layer for Pinterest API interactions
- `/src/app/pinterest/oauth-callback/page.tsx` - OAuth callback handler
- `/src/app/admin/pinterest/page.tsx` - Pinterest accounts management page
- `/src/app/admin/pinterest/[accountId]/boards/page.tsx` - Board management for a specific account
- `/src/app/admin/pinterest/[accountId]/pins/page.tsx` - Pin management for a specific account

## Installation

```bash
npm install
```

## Running the Application

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file in the root directory and add the following variables:

```
NEXT_PUBLIC_PINTEREST_CLIENT_ID=your_pinterest_client_id
PINTEREST_CLIENT_SECRET=your_pinterest_client_secret
NEXT_PUBLIC_PINTEREST_REDIRECT_URI=http://localhost:3000/pinterest/oauth-callback
```

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes actions like editing, deleting, or adding new pins.

4. **Searching and Filtering**:
   - Users can search for specific boards or pins using the search bar.
   - Filters can be applied to narrow down the results.

## Implementation Details

- **Data Retrieval**: Pins are fetched from DynamoDB and cached on disk.
- **Layout**: Pins are displayed in a masonry layout for a Pinterest-like experience.
- **Search and Filter**: Pins are searchable and filterable based on various criteria.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

## Pinterest Account Management

This section provides detailed information about the Pinterest account management feature of the application.

## Features

- **Account Verification**: Users can verify their Pinterest account.
- **Account Management**: Users can manage multiple Pinterest accounts.

## Usage

1. **Adding a Pinterest Account**:
   - Navigate to the Pinterest Accounts section in the application.
   - Enter a Pinterest username and click "Verify & Add".
   - The app will verify the account by querying DynamoDB and load all boards/pins if found.

2. **Managing Multiple Accounts**:
   - Users can manage multiple Pinterest accounts in the application.
   - This includes adding new accounts and verifying existing ones.

## Implementation Details

- **Data Retrieval**: Accounts and boards are fetched from DynamoDB and cached on disk.
- **Verification**: The app verifies the account by querying DynamoDB.
- **Account Management**: Users can manage multiple accounts in the application.

## Error Handling

- **DynamoDB Errors**: All DynamoDB operations are wrapped in try/catch blocks, with detailed error logging and fallback to mock data if needed.
- **Cache Errors**: Disk I/O errors are handled gracefully, with fallback to direct DynamoDB queries if the cache is unavailable.
- **Monitoring**: The app exposes cache statistics and health metrics in the UI for transparency and debugging.

# Pinterest Board Manager

This section provides detailed information about the Pinterest board manager feature of the application.

## Features

- **Board Management**: Users can view and manage their Pinterest boards.
- **Pin Management**: Users can view and manage their pins on boards.
- **Search and Filter**: Users can search and filter boards and pins.
- **Responsive Layout**: Pins are displayed in a responsive, masonry-style layout.

## Usage

1. **Accessing the Pinterest Boards Page**:
   - Navigate to the Pinterest Boards section in the application.
   - This section allows users to view and manage their Pinterest boards.

2. **Viewing Boards**:
   - Users can click on a board to view pins in a masonry layout.
   - The layout is designed to be responsive and Pinterest-like.

3. **Managing Pins**:
   - Users can manage pins on a board by clicking on the pin and using the provided options.
   - This includes