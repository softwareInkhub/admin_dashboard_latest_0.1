'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TableDetails } from './TableDetails';
import { addTableToSidebar, isTableSaved } from '@/utils/dynamodbSidebar';
import { toast } from '@/components/ui/Toast';

interface CombinedTableViewProps {
  tables: string[];
  isLoading: boolean;
  error: string | null;
}

export const CombinedTableView: React.FC<CombinedTableViewProps> = ({ tables, isLoading, error }) => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableDetails, setTableDetails] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [hasMoreItems, setHasMoreItems] = useState(false);
  const [lastEvaluatedKey, setLastEvaluatedKey] = useState<any>(null);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [isQueryMode, setIsQueryMode] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableDetails(selectedTable);
    } else {
      // Reset details when no table is selected
      setTableDetails(null);
      setItems([]);
      setCacheInfo(null);
    }
  }, [selectedTable]);

  // Check if the selected table is saved to sidebar
  useEffect(() => {
    if (selectedTable) {
      setIsSaved(isTableSaved(selectedTable));
    } else {
      setIsSaved(false);
    }
  }, [selectedTable]);

  const fetchTableDetails = async (tableName: string) => {
    if (!tableName) return;

    try {
      setDetailsLoading(true);
      setDetailsError(null); // Clear any existing errors
      
      const response = await fetch(`/api/admin/dynamodb/tables/${tableName}`);

      if (!response.ok) {
        // Get detailed error from response if available
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          // If we can't parse the error JSON, use the status text
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTableDetails(data.table || null);
      setItems(data.items || []);
      setHasMoreItems(!!data.lastEvaluatedKey);
      setLastEvaluatedKey(data.lastEvaluatedKey);
      setTotalCount(data.totalCount);
      setCacheInfo(data.cacheInfo || null);
      setDetailsError(null);
      
      // Reset query mode when loading a new table
      setIsQueryMode(false);
    } catch (err: any) {
      console.error(`Error fetching table details for ${tableName}:`, err);
      setDetailsError(err.message || `Failed to fetch details for ${tableName}`);
      // Keep any previous data loaded so it's still usable
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!selectedTable || !lastEvaluatedKey) return;

    try {
      setDetailsLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.append('lastKey', encodeURIComponent(JSON.stringify(lastEvaluatedKey)));

      const response = await fetch(`/api/admin/dynamodb/tables/${selectedTable}?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setItems(prevItems => [...prevItems, ...(data.items || [])]);
      setHasMoreItems(!!data.lastEvaluatedKey);
      setLastEvaluatedKey(data.lastEvaluatedKey);
      setTotalCount(data.totalCount);
    } catch (err: any) {
      console.error(`Error loading more items for ${selectedTable}:`, err);
      setDetailsError(err.message || `Failed to load more items for ${selectedTable}`);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleRefresh = () => {
    if (selectedTable) {
      fetchTableDetails(selectedTable);
    }
  };

  const handleRunQuery = async (queryParams: any) => {
    if (!selectedTable) return;

    try {
      setDetailsLoading(true);
      setIsQueryMode(true);

      const queryStringParams = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined && value !== null) {
          queryStringParams.append(key, String(value));
        }
      }

      const response = await fetch(
        `/api/admin/dynamodb/tables/${selectedTable}/query?${queryStringParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setItems(data.items || []);
      setHasMoreItems(!!data.lastEvaluatedKey);
      setLastEvaluatedKey(data.lastEvaluatedKey);
      setTotalCount(data.count);
      setDetailsError(null);
    } catch (err: any) {
      console.error(`Error running query for ${selectedTable}:`, err);
      setDetailsError(err.message || `Failed to run query for ${selectedTable}`);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Add a retry function
  const handleRetry = () => {
    if (selectedTable) {
      fetchTableDetails(selectedTable);
    }
  };

  // Function to handle adding a table to sidebar
  const handleAddToSidebar = () => {
    if (selectedTable) {
      addTableToSidebar(selectedTable);
      setIsSaved(true);
      
      // Show a toast notification
      toast(`Table "${selectedTable}" has been added to sidebar`, 'success');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="text-gray-600">Loading tables...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        <p>No tables found. Make sure your AWS credentials are correct.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white shadow rounded-lg mb-4 inline-block">
        <div className="px-2 py-2">
          <div className="flex items-center space-x-3">
            <label htmlFor="table-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Select Table:
            </label>
            <div className="w-80 relative" ref={dropdownRef}>
              <div 
                className="block w-full px-4 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm cursor-pointer"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                <div className="flex items-center justify-between">
                  <span>{selectedTable || '-- Select a Table --'}</span>
                  <svg 
                    className={`h-5 w-5 text-gray-400 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>

              {isDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-300 max-h-48 overflow-y-auto">
                  <div 
                    className="cursor-pointer bg-gray-50 border-b border-gray-200 px-4 py-2 text-sm text-gray-700 font-medium hover:bg-gray-100"
                    onClick={() => {
                      setSelectedTable('');
                      setIsDropdownOpen(false);
                    }}
                  >
                    -- Select a Table --
                  </div>
                  {tables.map((tableName) => (
                    <div 
                      key={tableName} 
                      className={`cursor-pointer px-4 py-2 text-sm text-gray-800 ${selectedTable === tableName ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                      onClick={() => {
                        setSelectedTable(tableName);
                        setIsDropdownOpen(false);
                      }}
                    >
                      {tableName}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Add to Sidebar button - only show if table is selected and not already saved */}
            {selectedTable && (
              <button
                onClick={handleAddToSidebar}
                disabled={isSaved}
                className={`inline-flex items-center px-3 py-2 border ${
                  isSaved 
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'border-gray-300 shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                <svg className="-ml-0.5 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                </svg>
                {isSaved ? 'Added to Sidebar' : 'Add to Sidebar'}
              </button>
            )}
            
            {isQueryMode && (
              <button
                onClick={() => { setIsQueryMode(false); fetchTableDetails(selectedTable); }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Clear Query
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedTable ? (
        <div className="bg-white shadow rounded-lg">
          {detailsError ? (
            <div className="p-4">
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error loading table details</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{detailsError}</p>
                    </div>
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={handleRetry}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Try again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <TableDetails
              tableDetails={tableDetails}
              items={items}
              isLoading={detailsLoading}
              error={detailsError}
              hasMoreItems={hasMoreItems}
              onLoadMore={handleLoadMore}
              onRefresh={handleRefresh}
              onRunQuery={handleRunQuery}
              totalCount={totalCount}
              isQueryMode={isQueryMode}
              cacheInfo={cacheInfo}
            />
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 11h10" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 15h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No table selected</h3>
          <p className="mt-1 text-sm text-gray-500">Select a table from the dropdown above to view its details and data.</p>
        </div>
      )}
    </div>
  );
}; 