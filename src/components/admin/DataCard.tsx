import React, { useState, useEffect } from 'react';
import Toast from './Toast';

interface DataCardProps {
  item: Record<string, any>;
  keyFields: string[];
  displayFields: string[]; // The fields to display in the card
  modalFields: string[]; // The fields to display in the modal
  serialNumber: number;
  onSelect?: (item: Record<string, any>, selected: boolean) => void;
  isSelected?: boolean;
}

const DataCard: React.FC<DataCardProps> = ({ 
  item, 
  keyFields,
  displayFields,
  modalFields,
  serialNumber,
  onSelect,
  isSelected = false
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');
  const [selected, setSelected] = useState(isSelected);
  const [copied, setCopied] = useState(false);

  // Update selected state when isSelected prop changes
  useEffect(() => {
    setSelected(isSelected);
  }, [isSelected]);

  // Format a value for display
  const formatValue = (value: any) => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">null</span>;
    }
    
    if (typeof value === 'object') {
      return <span className="text-blue-600">{JSON.stringify(value).substring(0, 30)}...</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-purple-600">{value.toString()}</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-green-600">{value}</span>;
    }
    
    // For strings, limit the length for display
    if (typeof value === 'string' && value.length > 50) {
      return <span className="text-gray-900">{value.substring(0, 47)}...</span>;
    }
    
    return <span className="text-gray-900">{String(value)}</span>;
  };
  
  // Copy the full item data to clipboard
  const copyToClipboard = () => {
    const textToCopy = JSON.stringify(item, null, 2);
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        setToastMessage('Failed to copy data.');
        setToastType('error');
        setShowToast(true);
      });
  };

  // Handle selection
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    const newSelected = !selected;
    setSelected(newSelected);
    if (onSelect) {
      onSelect(item, newSelected);
    }
  };

  // Filter the item data according to modalFields
  const getFilteredItemData = () => {
    if (!modalFields || modalFields.length === 0) {
      return item; // Return full item if no fields selected
    }
    
    const filteredData: Record<string, any> = {};
    
    // Only include fields that are in modalFields
    modalFields.forEach(field => {
      if (field in item) {
        filteredData[field] = item[field];
      }
    });
    
    return filteredData;
  };

  return (
    <>
      <div 
        className={`bg-white rounded-lg shadow border ${selected ? 'border-blue-400 bg-blue-50' : 'border-gray-200'} p-1.5 sm:p-2 hover:shadow-md transition cursor-pointer w-full relative h-10 sm:h-12 flex items-center overflow-visible`}
        onClick={() => setShowModal(true)}
      >
        {/* Left side controls */}
        <div className="absolute top-0 bottom-0 left-0 w-10 sm:w-12 flex items-center justify-center z-1">
          {/* Select Button */}
          <button
            onClick={handleSelect}
            className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border ${
              selected 
                ? 'bg-blue-500 border-blue-600 text-white' 
                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-100'
            } flex items-center justify-center focus:outline-none`}
            aria-label={selected ? 'Deselect item' : 'Select item'}
          >
            {selected && (
              <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
            )}
          </button>
        </div>

        {/* Serial Number */}
        <div className="absolute top-0 bottom-0 left-10 sm:left-12 w-5 sm:w-6 flex items-center justify-start">
          <span className="text-xs font-medium text-gray-500">#{serialNumber}</span>
        </div>

        {/* Data grid - aligned with header */}
        <div className="flex pl-14 sm:pl-16 w-full overflow-visible">
          {displayFields.map((field) => (
            <div key={field} className="flex-1 min-w-[150px] sm:min-w-[200px] px-1 sm:px-2 overflow-hidden">
              <div className="text-xs sm:text-sm font-medium text-gray-800 overflow-hidden text-ellipsis">
                {formatValue(item[field])}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-2 sm:px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setShowModal(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl">
              <div className="bg-white px-2 sm:px-4 pt-3 sm:pt-5 pb-3 sm:pb-4 relative">
                {/* Top-right action buttons */}
                <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex space-x-1 sm:space-x-2">
                  <button
                    type="button"
                    className={`rounded-full p-1.5 sm:p-2 ${copied 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'} 
                      focus:outline-none transition-colors duration-200`}
                    onClick={copyToClipboard}
                    title={copied ? "Copied!" : "Copy to clipboard"}
                  >
                    {copied ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    className="rounded-full p-1.5 sm:p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none"
                    onClick={() => setShowModal(false)}
                    title="Close"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div>
                  <div className="mt-1 text-left w-full">
                    <h3 className="text-base sm:text-lg leading-6 font-medium text-gray-900" id="modal-title">
                      Item Details <span className="text-xs sm:text-sm font-normal text-gray-500">(#{serialNumber})</span>
                    </h3>
                    <div className="mt-2 sm:mt-4 w-full">
                      <div className="bg-gray-50 p-2 sm:p-4 rounded-lg overflow-x-auto">
                        <pre className="text-xs sm:text-sm text-gray-800 whitespace-pre-wrap text-left">
                          {JSON.stringify(getFilteredItemData(), null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
    </>
  );
};

export default DataCard; 