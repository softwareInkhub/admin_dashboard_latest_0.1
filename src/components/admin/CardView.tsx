import React, { useState, useEffect } from 'react';
import DataCard from './DataCard';
import InfiniteScroll from './InfiniteScroll';
import Toast from './Toast';

interface CardViewProps {
  items: Record<string, any>[];
  keyFields: string[];
  displayFields: string[]; // The fields to display in each card
  modalFields: string[]; // The fields to display in the modal
  loading: boolean;
  hasMoreItems?: boolean;
  onLoadMore?: () => void;
  totalCount?: number; // Add totalCount prop
}

const CardView: React.FC<CardViewProps> = ({ 
  items, 
  keyFields, 
  displayFields,
  modalFields,
  loading, 
  hasMoreItems = false,
  onLoadMore = () => {},
  totalCount
}) => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Handle initial load
  useEffect(() => {
    if (items.length > 0 && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [items, isInitialLoad]);

  const handleItemSelect = (item: Record<string, any>) => {
    const itemId = keyFields.map(field => item[field]).join(':');
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const isItemSelected = (item: Record<string, any>) => {
    const itemId = keyFields.map(field => item[field]).join(':');
    return selectedItems.has(itemId);
  };

  // Show loading state only for initial load or when explicitly loading more
  const showLoadingState = loading && (isInitialLoad || items.length === 0);

  // Handle bulk copy
  const handleBulkCopy = () => {
    if (selectedItems.size === 0) {
      setToastMessage('No items selected');
      setToastType('error');
      setShowToast(true);
      return;
    }

    try {
      const selectedItemsArray = Array.from(selectedItems).map(id => {
        const [key, value] = id.split(':');
        return { [key]: value };
      });
      const textToCopy = JSON.stringify(selectedItemsArray, null, 2);
      navigator.clipboard.writeText(textToCopy);
      setToastMessage(`${selectedItems.size} items copied to clipboard!`);
      setToastType('success');
      setShowToast(true);
    } catch (error) {
      setToastMessage('Failed to copy items');
      setToastType('error');
      setShowToast(true);
    }
  };

  // Handle select all
  const handleSelectAll = () => {
    setSelectedItems(new Set(items.map(item => keyFields.map(field => item[field]).join(':'))));
  };

  // No items case
  if (items.length === 0 && !loading) {
    return <div className="text-center text-gray-500 p-4">No items found</div>;
  }

  return (
    <div className="space-y-4">
      {/* Selection information - only visible when items are selected */}
      {selectedItems.size > 0 && (
        <div className="flex justify-start items-center">
          <div className="flex items-center gap-1 text-xs">
            <span className="text-blue-600 font-medium">
              {selectedItems.size}/{items.length} selected
            </span>
            <button
              onClick={handleBulkCopy}
              className="text-blue-600 hover:text-blue-800"
              title="Copy selected items to clipboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Column Headers */}
      <div className="sticky top-0 z-10">
        <div className="bg-gray-100 rounded-lg p-2 sm:p-4 shadow-sm overflow-hidden">
          <div className="flex relative min-w-max w-full">
            {/* Select All button at left side of header */}
            <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-12 flex items-center justify-center">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSelectAll}
                  title={selectedItems.size === items.length ? 'Deselect All Items' : 'Select All Items'}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border ${
                    selectedItems.size === items.length 
                      ? 'bg-blue-500 border-blue-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-100'
                  } flex items-center justify-center focus:outline-none`}
                >
                  {selectedItems.size === items.length && (
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  )}
                </button>
                <span className="text-xs text-gray-500">All</span>
              </div>
            </div>

            {/* Serial Number column - to align with data rows */}
            <div className="absolute top-0 bottom-0 left-10 sm:left-12 w-5 sm:w-6 flex items-center justify-start">
              <span className="text-xs font-medium text-gray-500">#</span>
            </div>

            {/* Field names with left padding to make room for select button */}
            <div className="pl-14 sm:pl-16 flex w-full">
              {displayFields.map((field) => (
                <div key={field} className="flex-1 min-w-[150px] sm:min-w-[200px] px-1 sm:px-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-700">{field}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showLoadingState ? (
        <div className="text-center p-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading items...</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-max">
            <InfiniteScroll
              hasMore={hasMoreItems}
              isLoading={loading}
              onLoadMore={onLoadMore}
            >
              <div className="space-y-4">
                {items.map((item, index) => (
                  <DataCard
                    key={index}
                    item={item}
                    keyFields={keyFields}
                    displayFields={displayFields}
                    modalFields={modalFields}
                    serialNumber={index + 1}
                    onSelect={handleItemSelect}
                    isSelected={isItemSelected(item)}
                  />
                ))}
              </div>
            </InfiniteScroll>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
};

export default CardView; 