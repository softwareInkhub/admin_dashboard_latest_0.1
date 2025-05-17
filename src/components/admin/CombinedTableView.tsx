'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TableDetails } from './TableDetails';
import { addTableToSidebar, isTableSaved } from '@/utils/dynamodbSidebar';
import { toast } from '@/components/ui/Toast';
import { FaThumbtack, FaPlus } from 'react-icons/fa';

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
  const [pinnedTables, setPinnedTables] = useState<string[]>([]);
  const [pinnedTablesLoaded, setPinnedTablesLoaded] = useState(false);
  const [tablesLoaded, setTablesLoaded] = useState(false);
  const [openTerminalTable, setOpenTerminalTable] = useState<string | null>(null);
  const [openTerminalTableDetails, setOpenTerminalTableDetails] = useState<any>(null);
  const [openTerminalItems, setOpenTerminalItems] = useState<any[]>([]);
  const [openTerminalProps, setOpenTerminalProps] = useState<any>({});
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [openTerminalActiveTab, setOpenTerminalActiveTab] = useState<'info' | 'data'>('info');
  const [openTabs, setOpenTabs] = useState<("info" | "data")[]>(["info", "data"]);
  const [showAddTabMenu, setShowAddTabMenu] = useState(false);
  const [searchPinned, setSearchPinned] = useState('');
  const [searchUnpinned, setSearchUnpinned] = useState('');

  // Log the tables prop every time it changes
  useEffect(() => {
    console.log('Available tables:', tables);
  }, [tables]);

  // Log the loaded pinnedTables after fetching from API
  useEffect(() => {
    fetch('/api/user/pinned-tables')
      .then(res => res.json())
      .then(data => {
        console.log('Loaded pinnedTables from API:', data.pinnedTables);
        setPinnedTables(data.pinnedTables || []);
        setPinnedTablesLoaded(true);
      });
  }, []);

  // Save pinned tables whenever they change
  useEffect(() => {
    console.log('Saving pinnedTables to API:', pinnedTables);
    fetch('/api/user/pinned-tables', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinnedTables }),
    });
  }, [pinnedTables]);

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

  // Track when tables are loaded
  useEffect(() => {
    if (!isLoading && tables.length > 0) {
      setTablesLoaded(true);
    }
  }, [tables, isLoading]);

  // Re-filter pinnedTables if tables change
  useEffect(() => {
    setPinnedTables((prev) => prev.filter((t) => tables.includes(t)));
  }, [tables]);

  const pinnedTablesToShow = pinnedTables.filter((t) => tables.includes(t));
  const filteredPinnedTables = pinnedTablesToShow.filter((t) => t.toLowerCase().includes(searchPinned.toLowerCase()));
  const unpinnedTables = tables.filter((t) => !pinnedTablesToShow.includes(t));
  const filteredUnpinnedTables = unpinnedTables.filter((t) => t.toLowerCase().includes(searchUnpinned.toLowerCase()));

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
      
      // Remove toast notification
    }
  };

  // Card rendering helper
  const renderTableCards = (tableList: string[], isPinnedSection: boolean) => (
    <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-2">
      {tableList.map((tableName) => (
        <div
          key={tableName}
          className={`relative rounded-xl shadow-md px-2 py-2 min-w-[16px] text-center h-16 flex flex-col justify-between transition-all duration-200 cursor-pointer
            ${isPinnedSection
              ? 'border-4 border-blue-600 bg-blue-50 text-blue-900'
              : 'border border-gray-200 bg-white text-gray-900 hover:bg-gray-50'}
            ${selectedTable === tableName && !isPinnedSection ? 'ring-2 ring-blue-300' : ''}`}
          style={{ userSelect: 'none' }}
          onClick={async () => {
            setOpenTerminalTable(tableName);
            setOpenTerminalActiveTab('info');
            setModalLoading(true);
            setModalError(null);
            try {
              const detailsRes = await fetch(`/api/admin/dynamodb/tables/${tableName}`);
              if (!detailsRes.ok) throw new Error('Failed to fetch table details');
              const detailsData = await detailsRes.json();
              setOpenTerminalTableDetails(detailsData.table || {});
              setOpenTerminalItems(detailsData.items || []);
              setOpenTerminalProps({
                tableDetails: detailsData.table || {},
                items: detailsData.items || [],
                isLoading: false,
                error: null,
                hasMoreItems: !!detailsData.lastEvaluatedKey,
                lastEvaluatedKey: detailsData.lastEvaluatedKey,
                onLoadMore: () => {},
                onRefresh: () => {},
                onRunQuery: () => {},
                totalCount: detailsData.totalCount,
                isQueryMode: false,
                cacheInfo: detailsData.cacheInfo
              });
            } catch (err: any) {
              setModalError(err.message || 'Failed to load table details');
              setOpenTerminalTableDetails(null);
              setOpenTerminalItems([]);
              setOpenTerminalProps({});
            }
            setModalLoading(false);
          }}
        >
          <div className="w-full">
            <span className="text-sm font-normal truncate text-left block" title={tableName}>{tableName}</span>
          </div>
          <button
            type="button"
            className="absolute bottom-1 right-1 p-1 rounded-full bg-white border border-gray-200 shadow hover:bg-blue-50 z-10"
            onClick={e => {
              e.stopPropagation();
              if (isPinnedSection) {
                setPinnedTables((prev) => {
                  const updated = prev.filter((t) => t !== tableName);
                  console.log('Unpinning, new pinnedTables:', updated);
                  return updated;
                });
              } else {
                setPinnedTables((prev) => {
                  const updated = [...prev, tableName];
                  console.log('Pinning, new pinnedTables:', updated);
                  return updated;
                });
              }
            }}
            title={isPinnedSection ? 'Unpin' : 'Pin to Pinned Tables'}
          >
            <FaThumbtack className={`h-3 w-3 ${isPinnedSection ? 'text-blue-600 rotate-45' : 'text-gray-400'}`} />
          </button>
        </div>
      ))}
    </div>
  );

  if (!tablesLoaded || !pinnedTablesLoaded) {
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
      <div className="bg-white shadow rounded-lg mb-4 w-full">
        <div className="px-2 py-2">
          <div className="flex flex-col sm:flex-row sm:items-center flex-wrap gap-2 sm:gap-3">
            
            {/* Pinned Tables Section */}
            {pinnedTablesToShow.length > 0 && (
              <div className="w-full mb-4">
                <h3 className="text-2xl font-bold text-blue-700 mb-3">Pinned Tables</h3>
                <input
                  type="text"
                  placeholder="Search pinned tables..."
                  value={searchPinned}
                  onChange={e => setSearchPinned(e.target.value)}
                  className="mb-2 w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {renderTableCards(filteredPinnedTables, true)}
                </div>
              )}
            {/* Unpinned Tables Section */}
            <div className="w-full">
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Other Tables</h3>
              <input
                type="text"
                placeholder="Search tables..."
                value={searchUnpinned}
                onChange={e => setSearchUnpinned(e.target.value)}
                className="mb-2 w-full sm:w-1/2 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {renderTableCards(filteredUnpinnedTables, false)}
            </div>
            {/* Add to Sidebar button - only show if table is selected and not already saved */}
            {selectedTable && (
              <button
                onClick={handleAddToSidebar}
                disabled={isSaved}
                className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-2 border rounded-md text-xs sm:text-sm w-40 sm:w-auto ${
                  isSaved 
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'border-gray-300 shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                <svg className="-ml-0.5 mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                </svg>
                {isSaved ? 'Added to Sidebar' : 'Add to Sidebar'}
              </button>
            )}
            {isQueryMode && (
              <button
                onClick={() => { setIsQueryMode(false); fetchTableDetails(selectedTable); }}
                className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 shadow-sm text-xs sm:text-sm rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
      ) : null}

      {openTerminalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white text-gray-900 rounded-lg shadow-lg p-6 w-full max-w-6xl relative">
            <button
              className="absolute top-2 right-2 text-white bg-red-600 hover:bg-red-700 rounded px-2 py-1 text-xs"
              onClick={() => setOpenTerminalTable(null)}
            >
              Close
            </button>
            <div className="mb-2 font-bold text-lg text-gray-900">Terminal - {openTerminalTable}</div>
            <div className="bg-white rounded p-0 h-[44rem] overflow-auto font-mono text-sm pb-32 border border-gray-200">
              {openTabs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <span className="text-lg mb-2">No tabs open.</span>
                  <span className="text-sm">Use the <b>+</b> button below to add a tab.</span>
                </div>
              ) : modalLoading ? (
                <div className="text-gray-500">Loading table details...</div>
              ) : modalError ? (
                <div className="text-red-500">{modalError}</div>
              ) : openTerminalTableDetails ? (
                <TableDetails {...openTerminalProps} activeTab={openTerminalActiveTab} />
              ) : (
                <div className="text-gray-500">No table details found.</div>
              )}
            </div>
            {/* Tab navigation with independent close for each tab and always allow + if a tab is closed */}
            <nav className="flex items-center absolute left-8 bottom-8 z-20 bg-gray-50 rounded shadow px-2 border border-gray-200">
              {openTabs.includes('info') && (
                <div className="flex items-center">
                  <button
                    onClick={() => setOpenTerminalActiveTab('info')}
                    className={`px-3 sm:px-6 py-2 sm:py-3 border-b-2 text-xs sm:text-sm font-medium focus:outline-none transition-colors duration-150
                      ${openTerminalActiveTab === 'info'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    Table Info
                  </button>
                  {openTerminalActiveTab === 'info' && (
                    <button
                      onClick={() => {
                        if (openTabs.length === 1) {
                          setOpenTabs([]);
                        } else {
                          setOpenTabs(tabs => tabs.filter(t => t !== 'info'));
                          setOpenTerminalActiveTab('data');
                        }
                      }}
                      className="ml-1 px-2 py-1 rounded-full text-gray-500 hover:text-red-600 focus:outline-none text-lg"
                      title="Close Table Info"
                      style={{ lineHeight: 1 }}
                    >
                      &#10005;
                    </button>
                  )}
                </div>
              )}
              {openTabs.includes('data') && (
                <div className="flex items-center">
                  <button
                    onClick={() => setOpenTerminalActiveTab('data')}
                    className={`px-3 sm:px-6 py-2 sm:py-3 border-b-2 text-xs sm:text-sm font-medium focus:outline-none transition-colors duration-150
                      ${openTerminalActiveTab === 'data'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                  >
                    Table Data
                  </button>
                  {openTerminalActiveTab === 'data' && (
                    <button
                      onClick={() => {
                        if (openTabs.length === 1) {
                          setOpenTabs([]);
                        } else {
                          setOpenTabs(tabs => tabs.filter(t => t !== 'data'));
                          setOpenTerminalActiveTab('info');
                        }
                      }}
                      className="ml-1 px-2 py-1 rounded-full text-gray-500 hover:text-red-600 focus:outline-none text-lg"
                      title="Close Table Data"
                      style={{ lineHeight: 1 }}
                    >
                      &#10005;
                    </button>
                  )}
                </div>
              )}
              {/* + icon for adding closed tabs */}
              {openTabs.length < 2 && (
                <div className="relative ml-2">
                  <button
                    onClick={() => setShowAddTabMenu(v => !v)}
                    className="p-2 rounded-full text-gray-500 hover:text-blue-600 focus:outline-none text-lg bg-gray-100 hover:bg-blue-50"
                    title="Add Tab"
                  >
                    <FaPlus />
                  </button>
                  {showAddTabMenu && (
                    <div className="absolute left-0 bottom-10 bg-white border rounded shadow-lg z-30 min-w-[120px]">
                      {!openTabs.includes('info') && (
                        <button
                          onClick={() => {
                            setOpenTabs(tabs => [...tabs, 'info']);
                            setOpenTerminalActiveTab('info');
                            setShowAddTabMenu(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50"
                        >
                          Table Info
                        </button>
                      )}
                      {!openTabs.includes('data') && (
                        <button
                          onClick={() => {
                            setOpenTabs(tabs => [...tabs, 'data']);
                            setOpenTerminalActiveTab('data');
                            setShowAddTabMenu(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50"
                        >
                          Table Data
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </div>
  );
}; 