import React, { useState, useEffect, useRef } from 'react';
import CardView from './CardView';

interface TableDetailsProps {
  tableDetails: any;
  items: any[];
  isLoading: boolean;
  error: string | null;
  hasMoreItems: boolean;
  lastEvaluatedKey?: any;
  onLoadMore: () => void;
  onRefresh: () => void;
  onRunQuery: (queryParams: any) => void;
  totalCount?: number;
  isQueryMode: boolean;
  cacheInfo?: {
    detailsTimestamp: string | null;
    itemsTimestamp: string | null;
  };
}

export const TableDetails: React.FC<TableDetailsProps> = ({
  tableDetails,
  items,
  isLoading,
  error,
  hasMoreItems,
  lastEvaluatedKey,
  onLoadMore,
  onRefresh,
  onRunQuery,
  totalCount,
  isQueryMode,
  cacheInfo
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'data'>('info');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [displayFields, setDisplayFields] = useState<string[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>(items);
  const [clearingCache, setClearingCache] = useState(false);
  const [modalFields, setModalFields] = useState<string[]>([]);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const fieldSelectorRef = useRef<HTMLDivElement>(null);

  // Find primary key attributes for query UI and card view - moved up before useEffect
  const primaryKeyAttributes = tableDetails?.KeySchema?.map((key: any) => {
    const attributeDef = tableDetails.AttributeDefinitions?.find(
      (attr: { AttributeName: string }) => attr.AttributeName === key.AttributeName
    );
    return {
      name: key.AttributeName,
      type: attributeDef?.AttributeType || 'S',
      keyType: key.KeyType
    };
  }) || [];

  const keyFields = primaryKeyAttributes.map((attr: { name: string }) => attr.name);

  // This useEffect will set display fields based on the first item, if not already set
  useEffect(() => {
    if (items.length > 0 && displayFields.length === 0 && keyFields.length > 0) {
      // Start with key fields
      const fields = [...keyFields];
      
      // Add up to 6 more fields that aren't key fields
      const firstItem = items[0];
      Object.keys(firstItem).forEach(key => {
        if (!fields.includes(key) && fields.length < 8) {
          fields.push(key);
        }
      });
      
      setDisplayFields(fields);
    }
  }, [items, keyFields, displayFields]);

  // This useEffect will filter items based on the search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredItems(items);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = items.filter(item => {
      // Search through all the fields
      return Object.entries(item).some(([key, value]) => {
        if (value === null || value === undefined) return false;
        
        // Convert to string for comparison
        const valueStr = typeof value === 'object' 
          ? JSON.stringify(value) 
          : String(value);
          
        return valueStr.toLowerCase().includes(term);
      });
    });
    
    setFilteredItems(filtered);
  }, [items, searchTerm]);

  // Get all unique fields from items
  const getAllFields = () => {
    if (!items.length) return { fields: [] as string[], nestedFields: {} as Record<string, Set<string>> };
    
    const fieldsSet = new Set<string>();
    const nestedFields: Record<string, Set<string>> = {};
    
    // Function to extract nested fields - limited to one level
    const extractFields = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      
      // Add top-level fields
      Object.entries(obj).forEach(([key, value]) => {
        fieldsSet.add(key);
        
        // Add one level of nested fields if value is an object (but not an array)
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Store parent-child relationship
          if (!nestedFields[key]) {
            nestedFields[key] = new Set<string>();
          }
          
          // Add child properties
          Object.keys(value).forEach(childKey => {
            const fullKey = `${key}.${childKey}`;
            fieldsSet.add(fullKey);
            nestedFields[key].add(fullKey);
          });
        }
      });
    };
    
    // Process all items
    items.forEach(item => {
      extractFields(item);
    });
    
    // Return sorted fields
    return {
      fields: Array.from(fieldsSet).sort(),
      nestedFields
    };
  };
  
  const { fields: allFields, nestedFields } = getAllFields();

  // This useEffect will initialize modalFields with all fields when items change
  useEffect(() => {
    if (items.length > 0 && modalFields.length === 0) {
      setModalFields(allFields);
    }
  }, [items, allFields.length, modalFields.length]);

  // Check if field has children
  const hasChildren = (field: string) => {
    return nestedFields[field] && nestedFields[field].size > 0;
  };

  // Get parent field
  const getParentField = (field: string) => {
    const lastDotIndex = field.lastIndexOf('.');
    return lastDotIndex > 0 ? field.substring(0, lastDotIndex) : '';
  };

  // Get all child fields including nested children
  const getAllChildFields = (field: string): string[] => {
    if (!nestedFields[field]) return [];
    
    const children: string[] = Array.from(nestedFields[field]);
    const nestedChildren = children.flatMap(child => getAllChildFields(child));
    
    return [...children, ...nestedChildren];
  };

  // Handle field selection toggle
  const handleFieldToggle = (field: string) => {
    // If this field has children, toggle them all together
    if (hasChildren(field)) {
      const childFields = getAllChildFields(field);
      
      if (modalFields.includes(field)) {
        // If deselecting parent, deselect all children
        setModalFields(modalFields.filter(f => f !== field && !childFields.includes(f)));
      } else {
        // If selecting parent, select all children
        const newFields = [...modalFields, field, ...childFields].filter(
          (f, i, arr) => arr.indexOf(f) === i // Remove duplicates
        );
        setModalFields(newFields);
      }
    } else {
      // Regular toggle for fields without children
      if (modalFields.includes(field)) {
        setModalFields(modalFields.filter(f => f !== field));
      } else {
        setModalFields([...modalFields, field]);
      }
    }
  };

  // Display field with proper indentation and parent/child structure
  const renderField = (field: string) => {
    const isParent = hasChildren(field);
    const indentLevel = field.split('.').length - 1;
    const displayName = field.includes('.') ? field.split('.').pop()! : field;
    
    return (
      <label key={field} className="flex items-center py-1 px-2 hover:bg-gray-50 rounded cursor-pointer">
        <div style={{ width: `${indentLevel * 16}px` }} className="flex-shrink-0"></div>
        <input 
          type="checkbox" 
          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          checked={modalFields.includes(field)}
          onChange={() => handleFieldToggle(field)}
        />
        <span className="ml-2 text-sm text-gray-700 truncate flex items-center">
          {isParent && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
          {displayName}
        </span>
        {keyFields.includes(field) && (
          <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
            key
          </span>
        )}
      </label>
    );
  };

  // Handle select all fields
  const handleSelectAllFields = () => {
    if (modalFields.length === allFields.length) {
      setModalFields([]);
    } else {
      setModalFields([...allFields]);
    }
  };

  // Close field selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        fieldSelectorRef.current && 
        !fieldSelectorRef.current.contains(event.target as Node) &&
        showFieldSelector
      ) {
        setShowFieldSelector(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFieldSelector]);

  // Debug tableDetails
  useEffect(() => {
    if (tableDetails) {
      console.log('TableDetails component received:', tableDetails);
      // Log specific properties we're having trouble with
      console.log('ItemCount:', tableDetails.ItemCount);
      console.log('TableSizeBytes:', tableDetails.TableSizeBytes);
      console.log('CreationDateTime:', tableDetails.CreationDateTime);
      console.log('TableStatus:', tableDetails.TableStatus);
    }
  }, [tableDetails]);

  if (isLoading && !items.length) {
    return (
      <div className="flex justify-center items-center h-40">
        <div className="text-gray-600">Loading table details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 m-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">Error loading table data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={onRefresh}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tableDetails) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-gray-900 px-4 py-3 rounded">
        <p>No table details found.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-6 py-3 border-b-2 text-sm font-medium ${
              activeTab === 'info'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Table Info
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-6 py-3 border-b-2 text-sm font-medium ${
              activeTab === 'data'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Table Data
          </button>
        </nav>
      </div>

      <div className="p-6">
        {activeTab === 'info' ? (
          <div>
            <h3 className="text-lg font-semibold mb-4">Table Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Table Name</p>
                <p className="font-medium text-gray-900">{tableDetails?.TableName || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tableDetails?.TableStatus === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {tableDetails?.TableStatus || 'Unknown'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Item Count</p>
                <p className="font-medium text-gray-900">
                  {typeof tableDetails?.ItemCount === 'number' 
                    ? tableDetails.ItemCount.toLocaleString() 
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Table Size</p>
                <p className="font-medium text-gray-900">
                  {typeof tableDetails?.TableSizeBytes === 'number'
                    ? `${(tableDetails.TableSizeBytes / 1024 / 1024).toFixed(2)} MB`
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Creation Date</p>
                <p className="font-medium text-gray-900">
                  {tableDetails?.CreationDateTime
                    ? new Date(tableDetails.CreationDateTime).toLocaleString()
                    : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Table ARN</p>
                <p className="font-medium text-xs truncate text-gray-900" title={tableDetails?.TableArn || 'Unknown'}>
                  {tableDetails?.TableArn || 'Unknown'}
                </p>
              </div>
              {cacheInfo?.detailsTimestamp && (
                <div>
                  <p className="text-sm text-gray-600">Details Cache Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(cacheInfo.detailsTimestamp).toLocaleString()}
                  </p>
                </div>
              )}
              {cacheInfo?.itemsTimestamp && (
                <div>
                  <p className="text-sm text-gray-600">Items Cache Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(cacheInfo.itemsTimestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <h3 className="text-lg font-semibold mt-6 mb-4">Primary Key</h3>
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Attribute Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Key Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Type
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableDetails?.KeySchema && tableDetails.KeySchema.length > 0 ? (
                    tableDetails.KeySchema.map((key: any) => {
                      const attributeDef = tableDetails?.AttributeDefinitions?.find(
                        (attr: any) => attr.AttributeName === key.AttributeName
                      );
                      return (
                        <tr key={key.AttributeName}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {key.AttributeName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {key.KeyType}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {attributeDef?.AttributeType || 'Unknown'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                        No key schema information available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {isQueryMode ? 'Query Results' : 'Table Data'} 
                {totalCount !== undefined && ` (${items.length} of ${totalCount})`}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setClearingCache(true);
                    // Use a direct fetch to invalidate cache
                    fetch(`/api/admin/dynamodb/tables/${tableDetails.TableName}`, {
                      method: 'DELETE'
                    })
                    .then(() => {
                      // Then refresh the data
                      onRefresh();
                    })
                    .finally(() => {
                      setClearingCache(false);
                    });
                  }}
                  disabled={clearingCache}
                  className="px-3 py-1 text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 rounded flex items-center disabled:opacity-50"
                  title="Manually clear cached data from disk storage and reload from DynamoDB"
                >
                  {clearingCache ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Clearing Cache...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Clear Cache
                    </>
                  )}
                </button>
                <button
                  onClick={onRefresh}
                  className="px-3 py-1 text-sm bg-green-50 text-green-600 hover:bg-green-100 rounded flex items-center"
                  title="Refresh data using current cached settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>

            {/* Search and filter area */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                {/* Status Bar */}
                <div className="bg-gray-50 px-3 py-1 rounded-md border border-gray-200 text-xs text-gray-600 inline-flex items-center">
                  <span className="font-medium">Loaded:</span>
                  <span className="ml-1">{items.length}</span>
                  {totalCount !== undefined && (
                    <>
                      <span className="text-gray-400 mx-1">of</span>
                      <span>{totalCount}</span>
                    </>
                  )}
                  {isLoading && (
                    <div className="ml-2 w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                  )}
                </div>
                
                {/* Search bar */}
                <div className="w-64">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 text-gray-600 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  {searchTerm && (
                    <div className="mt-2 text-sm text-gray-500">
                      {filteredItems.length} of {items.length}
                      {filteredItems.length === 0 && (
                        <button 
                          className="ml-2 text-blue-500 hover:text-blue-700"
                          onClick={() => setSearchTerm('')}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Field Selector */}
              <div className="relative" ref={fieldSelectorRef}>
                <button 
                  className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 focus:outline-none flex items-center"
                  onClick={() => setShowFieldSelector(!showFieldSelector)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Field Filter
                  <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                    {modalFields.length}/{allFields.length}
                  </span>
                </button>
                
                {/* Dropdown menu */}
                {showFieldSelector && (
                  <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                    <div className="p-2 border-b border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700">Display Fields in Modal</h3>
                        <button 
                          className="text-xs text-blue-600 hover:text-blue-800" 
                          onClick={handleSelectAllFields}
                        >
                          {modalFields.length === allFields.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">Select which fields to display in item details</div>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      <div className="py-1 px-2">
                        {allFields.map(field => renderField(field))}
                      </div>
                    </div>
                    <div className="p-2 border-t border-gray-200 flex justify-end">
                      <button 
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        onClick={() => setShowFieldSelector(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable area with always-visible horizontal scrollbar */}
            <div className="overflow-x-auto bg-white" style={{ width: "100%" }}>
              <div className="min-w-max">
                <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
                  <CardView 
                    items={filteredItems} 
                    keyFields={keyFields}
                    displayFields={displayFields}
                    modalFields={modalFields}
                    loading={isLoading} 
                    hasMoreItems={hasMoreItems && !searchTerm}
                    onLoadMore={searchTerm ? () => {} : onLoadMore}
                    totalCount={totalCount}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 