'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TableDetails } from '@/components/admin';

export default function TableDetailsPage({
  params,
}: {
  params: { tableName: string };
}) {
  const { tableName } = params;
  const [tableDetails, setTableDetails] = useState<any>(null);
  const [processedTableDetails, setProcessedTableDetails] = useState<boolean>(false);
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<any>(undefined);
  const [hasMoreItems, setHasMoreItems] = useState(false);
  const [limit, setLimit] = useState(250);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [isQueryMode, setIsQueryMode] = useState(false);
  const [currentQueryParams, setCurrentQueryParams] = useState<any>(null);

  const fetchTableDetails = async (resetItems = true, loadMore = false, forceRefresh = false) => {
    try {
      setIsLoading(true);
      setProcessedTableDetails(false);
      let url = `/api/admin/dynamodb/tables/${tableName}?limit=${limit}`;
      
      // Add pagination key if loading more
      if (loadMore && lastEvaluatedKey) {
        url += `&lastKey=${encodeURIComponent(JSON.stringify(lastEvaluatedKey))}`;
      }
      
      // Add force refresh parameter
      if (forceRefresh) {
        url += `&refresh=true`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("API Response:", JSON.stringify(data, null, 2));
      console.log("Table details from API:", data.table);
      
      if (resetItems) {
        setItems(data.items || []);
      } else {
        setItems((prevItems) => [...prevItems, ...(data.items || [])]);
      }
      
      setTableDetails(data.table || null);
      setLastEvaluatedKey(data.lastEvaluatedKey);
      setHasMoreItems(data.hasMoreItems || false);
      setTotalCount(data.totalCount);
      setError(null);
      setIsQueryMode(false);
    } catch (err: any) {
      console.error(`Error fetching table ${tableName}:`, err);
      setError(err.message || `Failed to fetch table ${tableName}`);
    } finally {
      setIsLoading(false);
    }
  };

  const runQuery = async (queryParams: any, forceRefresh = false) => {
    try {
      setIsLoading(true);
      setIsQueryMode(true);
      setCurrentQueryParams(queryParams);
      
      const response = await fetch(`/api/admin/dynamodb/tables/${tableName}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...queryParams,
          limit,
          forceRefresh
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setItems(data.items || []);
      setLastEvaluatedKey(data.lastEvaluatedKey);
      setHasMoreItems(data.hasMoreItems || false);
      setTotalCount(data.count);
      setError(null);
    } catch (err: any) {
      console.error(`Error querying table ${tableName}:`, err);
      setError(err.message || `Failed to query table ${tableName}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMore = async () => {
    if (isQueryMode && currentQueryParams) {
      try {
        setIsLoading(true);
        
        const response = await fetch(`/api/admin/dynamodb/tables/${tableName}/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...currentQueryParams,
            limit,
            lastEvaluatedKey
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setItems((prevItems) => [...prevItems, ...(data.items || [])]);
        setLastEvaluatedKey(data.lastEvaluatedKey);
        setHasMoreItems(data.hasMoreItems || false);
        setTotalCount(data.count);
        setError(null);
      } catch (err: any) {
        console.error(`Error querying table ${tableName}:`, err);
        setError(err.message || `Failed to query table ${tableName}`);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Load more items from scan
      fetchTableDetails(false, true);
    }
  };

  useEffect(() => {
    fetchTableDetails();
  }, [tableName]);

  // Process table details to ensure consistent structure
  useEffect(() => {
    if (tableDetails && !processedTableDetails) {
      console.log("Raw table details:", tableDetails);
      
      // Create a processed version with normalized structure
      const normalizedTableDetails = {
        ...tableDetails,
        // Ensure all required fields have values
        ItemCount: tableDetails.ItemCount || 0,
        TableSizeBytes: tableDetails.TableSizeBytes || 0,
        CreationDateTime: tableDetails.CreationDateTime || new Date().toISOString(),
        TableStatus: tableDetails.TableStatus || 'ACTIVE'
      };
      
      // Update the table details with processed version
      setTableDetails(normalizedTableDetails);
      setProcessedTableDetails(true);
    }
  }, [tableDetails, processedTableDetails]);

  return (
    <div>
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <nav className="sm:hidden" aria-label="Back">
            <Link
              href="/admin/dynamodb/tables"
              className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              <svg
                className="flex-shrink-0 -ml-1 mr-1 h-5 w-5 text-gray-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Back
            </Link>
          </nav>
          <nav className="hidden sm:flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <div className="flex">
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Dashboard
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg
                    className="flex-shrink-0 h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <Link
                    href="/admin/dynamodb/tables"
                    className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                  >
                    Tables
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg
                    className="flex-shrink-0 h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-500">
                    {tableName}
                  </span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">
            Table: {tableName}
          </h1>
        </div>
        <div className="mt-3 sm:mt-0 sm:ml-4">
          <div className="flex space-x-2">
            {isQueryMode && (
              <button
                type="button"
                onClick={() => fetchTableDetails()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                Clear Query
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <TableDetails
          tableDetails={tableDetails}
          items={items}
          isLoading={isLoading}
          error={error}
          hasMoreItems={hasMoreItems}
          lastEvaluatedKey={lastEvaluatedKey}
          onLoadMore={loadMore}
          onRefresh={() => fetchTableDetails(true, false, true)}
          onRunQuery={runQuery}
          totalCount={totalCount}
          isQueryMode={isQueryMode}
        />
      </div>
    </div>
  );
} 