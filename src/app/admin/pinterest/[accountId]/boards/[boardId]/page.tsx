'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
// Import Masonry component (you'll need to run: npm install react-masonry-css)
import Masonry from 'react-masonry-css';

// Add masonry CSS styles
const masonryStyles = `
  .my-masonry-grid {
    display: flex;
    width: auto;
    margin-left: -16px; /* gutter size offset */
  }
  .my-masonry-grid_column {
    padding-left: 16px; /* gutter size */
    background-clip: padding-box;
  }
  .my-masonry-grid_column > div {
    margin-bottom: 16px;
  }
  
  /* Responsive styles for pin cards */
  @media (max-width: 768px) {
    .pin-card {
      max-width: 100%;
      margin-bottom: 12px;
    }
    .pin-card-img {
      max-height: 280px;
    }
    .pin-card-title {
      font-size: 0.85rem;
    }
    .board-title {
      font-size: 1.5rem;
    }
    .username {
      font-size: 1rem;
    }
  }
  
  @media (max-width: 640px) {
    .pin-card-img {
      max-height: 220px;
    }
    .pin-card-title {
      font-size: 0.75rem;
    }
    .board-title {
      font-size: 1.25rem;
    }
    .username {
      font-size: 0.875rem;
    }
    .btn-text {
      display: none;
    }
    .search-input {
      font-size: 0.875rem;
    }
  }
  
  @media (max-width: 480px) {
    .pin-card-img {
      max-height: 180px;
    }
    .my-masonry-grid_column {
      padding-left: 8px; /* smaller gutter for mobile */
    }
    .my-masonry-grid {
      margin-left: -8px; /* smaller gutter for mobile */
    }
    .board-title {
      font-size: 1.125rem;
    }
    .button-icon {
      height: 1rem;
      width: 1rem;
    }
  }
  
  @media (max-width: 360px) {
    .pin-card-img {
      max-height: 160px;
    }
    .board-title {
      font-size: 1rem;
    }
  }
`;

interface Pin {
  id: string;
  title: string;
  description?: string;
  board_id: string;
  image_url?: string;
  link?: string;
  created_at?: string;
  transformedData?: any; // The transformed DynamoDB data
}

interface Board {
  id: string;
  name: string;
  description?: string;
}

export default function BoardDetailPage({ 
  params 
}: { 
  params: { accountId: string; boardId: string } 
}) {
  const router = useRouter();
  const { accountId, boardId } = params;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pins, setPins] = useState<Pin[]>([]);
  const [board, setBoard] = useState<Board | null>(null);
  const [accountUsername, setAccountUsername] = useState<string>('');
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New state for search, sort, filter
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterBy, setFilterBy] = useState<string[]>([]);
  
  // References for dropdown menus
  const sortRef = React.useRef<HTMLDivElement>(null);
  const filterRef = React.useRef<HTMLDivElement>(null);
  
  // Add new state for available filters
  const [availableHashtags, setAvailableHashtags] = useState<Set<string>>(new Set());
  
  // Define breakpoints for the masonry layout
  const breakpointColumnsObj = {
    default: 4, // default number of columns
    1280: 4,    // 4 columns at 1280px or more
    1024: 3,    // 3 columns at 1024px or more
    768: 2,     // 2 columns at 768px or more
    480: 2,     // 2 columns at 480px or more
    360: 1      // 1 column at 360px or below (very small phones)
  };
  
  // Handler for clicks outside the sort and filter dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Close sort dropdown if click is outside
      if (sortRef.current && !sortRef.current.contains(event.target as Node) && isSortOpen) {
        setIsSortOpen(false);
      }
      
      // Close filter dropdown if click is outside
      if (filterRef.current && !filterRef.current.contains(event.target as Node) && isFilterOpen) {
        setIsFilterOpen(false);
      }
    }
    
    // Add event listener when modals are open
    if (isSortOpen || isFilterOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    // Clean up the event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSortOpen, isFilterOpen]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching board details and pins for board ID: ${boardId}`);
        
        // Step 1: Get account info from API
        let username = '';
        let boardInfo: Board | null = null;
        
        // First fetch the account details using the new API
        const accountResponse = await fetch('/api/admin/pinterest/fetch-account', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountId }),
        });
        
        const accountData = await accountResponse.json();
        
        if (!accountResponse.ok || !accountData.success) {
          console.log('Falling back to localStorage for account data');
          // Fallback to localStorage if API fails
          if (typeof window !== 'undefined') {
            try {
              const savedAccounts = localStorage.getItem('pinterestAccounts');
              if (savedAccounts) {
                const accounts = JSON.parse(savedAccounts);
                const account = accounts.find((acc: any) => acc.id === accountId);
                
                if (account) {
                  username = account.username;
                  setAccountUsername(username);
                  console.log(`Found username ${username} for account ${accountId} in localStorage`);
                  
                  // Also look for board info
                  if (account.boards && Array.isArray(account.boards)) {
                    const foundBoard = account.boards.find((b: any) => b.id === boardId);
                    if (foundBoard) {
                      boardInfo = {
                        id: foundBoard.id,
                        name: foundBoard.name,
                        description: foundBoard.description
                      };
                      setBoard(boardInfo);
                      console.log(`Found board info for ${boardId}: ${foundBoard.name}`);
                    }
                  }
                }
              }
            } catch (e) {
              console.error('Error reading from localStorage:', e);
            }
          }
        } else {
          // Use data from API response
          const account = accountData.account;
          username = account.username;
          setAccountUsername(username);
          console.log(`Found username ${username} for account ${accountId} from API`);
          
          // Look for board info in the account data
          if (account.boards && Array.isArray(account.boards)) {
            const foundBoard = account.boards.find((b: any) => b.id === boardId);
            if (foundBoard) {
              boardInfo = {
                id: foundBoard.id,
                name: foundBoard.name,
                description: foundBoard.description
              };
              setBoard(boardInfo);
              console.log(`Found board info for ${boardId}: ${foundBoard.name}`);
            }
          }
        }
        
        if (!username) {
          throw new Error('Could not find account username');
        }
        
        // Step 2: Call our API to fetch pins for this board
        const response = await fetch('/api/admin/pinterest/fetch-pins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            username,
            accountId,
            boardId
          }),
        });
        
        const data = await response.json();
        console.log('API response:', data);
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch pins');
        }
        
        if (!data.success) {
          throw new Error(data.message || 'No pins found for this board');
        }
        
        setPins(data.pins || []);
        
        // If we still don't have board info and have at least one pin
        if (!boardInfo && data.pins && data.pins.length > 0) {
          // Try to get board info from first pin
          const firstPin = data.pins[0];
          setBoard({
            id: boardId,
            name: `Pinterest Board: ${boardId}`, // Generic name if we can't find actual name
            description: ''
          });
        }
        
      } catch (err) {
        console.error('Error fetching board pins:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [accountId, boardId]);
  
  // Update useEffect to collect available hashtags
  useEffect(() => {
    const hashtags = new Set<string>();
    pins.forEach(pin => {
      const transformed = pin.transformedData;
      const pinData = transformed?.Item || transformed;
      
      // Collect hashtags from various possible locations
      const tags = [
        ...(pinData?.hashtags || []),
        ...(pinData?.categories || []),
        ...(pinData?.tags || [])
      ];
      
      tags.forEach(tag => hashtags.add(tag));
    });
    setAvailableHashtags(hashtags);
  }, [pins]);
  
  const openPinModal = (pin: Pin) => {
    // Log the entire pin object
    console.log('Selected Pin (full object):', pin);
    
    // Log the transformed data structure specifically
    console.log('Pin transformedData:', pin.transformedData);
    
    // If there's an Item property, log that structure too
    if (pin.transformedData?.Item) {
      console.log('Pin Item structure:', pin.transformedData.Item);
    }
    
    setSelectedPin(pin);
    setIsModalOpen(true);
  };
  
  const openPinLink = (pin: Pin, openInNewTab: boolean = false) => {
    if (openInNewTab && pin.link) {
      window.open(pin.link, '_blank');
    } else {
      openPinModal(pin);
    }
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPin(null);
  };
  
  // Filter pins based on search term and filters
  const filteredPins = React.useMemo(() => {
    return pins.filter(pin => {
      const transformed = pin.transformedData;
      const pinData = transformed?.Item || transformed;
      
      // Search term filtering
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        
        // Get title from all possible locations
        const titles = [
          pin.title,
          pinData?.title,
          pinData?.name,
          pinData?.alt_text
        ].filter(Boolean).map(t => t.toLowerCase());
        
        // Get description from all possible locations
        const descriptions = [
          pin.description,
          pinData?.description,
          pinData?.note
        ].filter(Boolean).map(d => d.toLowerCase());
        
        // Check if search term exists in any title or description
        const matchesTitle = titles.some(title => title.includes(searchLower));
        const matchesDescription = descriptions.some(desc => desc.includes(searchLower));
        
        if (!matchesTitle && !matchesDescription) return false;
      }
      
      // Apply filters
      if (filterBy.length > 0) {
        for (const filter of filterBy) {
          switch (filter) {
            case 'has-link':
              if (!pin.link && !pinData?.link && !pinData?.source_url) return false;
              break;
            case 'no-link':
              if (pin.link || pinData?.link || pinData?.source_url) return false;
              break;
            case 'has-image':
              if (!pin.image_url && !pinData?.media?.images) return false;
              break;
            case 'no-image':
              if (pin.image_url || pinData?.media?.images) return false;
              break;
            default:
              // Check if filter is a hashtag
              const tags = [
                ...(pinData?.hashtags || []),
                ...(pinData?.categories || []),
                ...(pinData?.tags || [])
              ];
              if (!tags.includes(filter)) return false;
          }
        }
      }
      
      return true;
    });
  }, [pins, searchTerm, filterBy]);
  
  // Sort pins based on selection
  const sortedPins = React.useMemo(() => {
    return [...filteredPins].sort((a, b) => {
      // Get data from both direct pin and transformed data
      const transformedA = a.transformedData;
      const transformedB = b.transformedData;
      const pinDataA = transformedA?.Item || transformedA;
      const pinDataB = transformedB?.Item || transformedB;

      // Get dates from all possible locations
      const dateA = pinDataA?.created_at || a.created_at || '0';
      const dateB = pinDataB?.created_at || b.created_at || '0';

      // Get titles from all possible locations
      const titleA = pinDataA?.title || pinDataA?.name || a.title || '';
      const titleB = pinDataB?.title || pinDataB?.name || b.title || '';

      switch (sortBy) {
        case 'newest':
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        case 'oldest':
          return new Date(dateA).getTime() - new Date(dateB).getTime();
        case 'a-z':
          return titleA.localeCompare(titleB);
        case 'z-a':
          return titleB.localeCompare(titleA);
        default:
          return 0;
      }
    });
  }, [filteredPins, sortBy]);
  
  // Helper function to toggle filters
  const toggleFilter = (filter: string) => {
    setFilterBy(prev => 
      prev.includes(filter) 
        ? prev.filter(f => f !== filter)
        : [...prev, filter]
    );
  };
  
  return (
    <div className="py-8">
      {/* Add the masonry styles */}
      <style jsx global>{masonryStyles}</style>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 board-title">
            {board?.name || 'Board Details'}
            {accountUsername && (
              <span className="ml-2 text-gray-500 text-lg username">@{accountUsername}</span>
              
            )}
            {!loading && !error && (
              <span className="text-gray-500 text-lg ml-2 username">({pins.length})</span>
            )}
          </h1>
          <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:ml-4">
            {/* Search Button and Dropdown */}
            <div className="relative flex-1 min-w-[200px] sm:min-w-[250px]">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search pins..."
                  className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 search-input"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchTerm && filteredPins.length === 0 && (
                <div className="absolute w-full bg-white mt-1 py-2 px-3 rounded-md shadow-lg border border-gray-200">
                  <p className="text-sm text-gray-500">No pins found matching "{searchTerm}"</p>
                </div>
              )}
            </div>
            
            {/* Sort Button and Dropdown */}
            <div className="relative" ref={sortRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Sort pins"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 button-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
                <span className="ml-2 btn-text">Sort</span>
              </button>
              
              {isSortOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => { setSortBy('newest'); setIsSortOpen(false); }}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${sortBy === 'newest' ? 'bg-gray-100 font-medium' : ''}`}
                    >
                      Newest first
                    </button>
                    <button
                      onClick={() => { setSortBy('oldest'); setIsSortOpen(false); }}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${sortBy === 'oldest' ? 'bg-gray-100 font-medium' : ''}`}
                    >
                      Oldest first
                    </button>
                    <button
                      onClick={() => { setSortBy('a-z'); setIsSortOpen(false); }}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${sortBy === 'a-z' ? 'bg-gray-100 font-medium' : ''}`}
                    >
                      A-Z
                    </button>
                    <button
                      onClick={() => { setSortBy('z-a'); setIsSortOpen(false); }}
                      className={`block px-4 py-2 text-sm text-left w-full hover:bg-gray-100 ${sortBy === 'z-a' ? 'bg-gray-100 font-medium' : ''}`}
                    >
                      Z-A
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Filter Button and Dropdown */}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                aria-label="Filter pins"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 button-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span className="ml-2 btn-text">
                  Filter {filterBy.length > 0 && `(${filterBy.length})`}
                </span>
                {filterBy.length > 0 && (
                  <span className="hidden ml-1 sm:hidden md:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {filterBy.length}
                  </span>
                )}
              </button>
              
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg z-10">
                  <div className="py-1 divide-y divide-gray-100">
                    {/* Link filters */}
                    <div className="px-4 py-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Link Status</h3>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filterBy.includes('has-link')}
                            onChange={() => toggleFilter('has-link')}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Has Link</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filterBy.includes('no-link')}
                            onChange={() => toggleFilter('no-link')}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">No Link</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Image filters */}
                    <div className="px-4 py-2">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Image Status</h3>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filterBy.includes('has-image')}
                            onChange={() => toggleFilter('has-image')}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Has Image</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filterBy.includes('no-image')}
                            onChange={() => toggleFilter('no-image')}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">No Image</span>
                        </label>
                      </div>
                    </div>
                    
                    {/* Hashtag filters */}
                    {availableHashtags.size > 0 && (
                      <div className="px-4 py-2">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Tags</h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {Array.from(availableHashtags).sort().map(tag => (
                            <label key={tag} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={filterBy.includes(tag)}
                                onChange={() => toggleFilter(tag)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">#{tag}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Clear filters button */}
                    {filterBy.length > 0 && (
                      <div className="px-4 py-2">
                        <button
                          onClick={() => setFilterBy([])}
                          className="w-full text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Clear all filters
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Show active filters */}
            {filterBy.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2 w-full">
                {filterBy.map(filter => (
                  <span
                    key={filter}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {filter}
                    <button
                      type="button"
                      onClick={() => toggleFilter(filter)}
                      className="flex-shrink-0 ml-1 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-600 hover:bg-blue-200 hover:text-blue-500 focus:outline-none focus:bg-blue-500 focus:text-white"
                    >
                      <span className="sr-only">Remove filter for {filter}</span>
                      <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                        <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                      </svg>
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setFilterBy([])}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        {board?.description && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Board Description</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>{board.description}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
          </div>
        ) : error ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6 text-center">
              <svg
                className="mx-auto h-12 w-12 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Pins</h3>
              <p className="mt-1 text-sm text-red-500">{error}</p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/pinterest/${accountId}/boards`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Return to Boards
                </button>
              </div>
            </div>
          </div>
        ) : pins.length === 0 ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No Pins Found</h3>
              <p className="mt-1 text-sm text-gray-500">
                This board does not have any pins or they could not be found.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => router.push(`/admin/pinterest/${accountId}/boards`)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Return to Boards
                </button>
              </div>
            </div>
          </div>
        ) : (
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {sortedPins.map((pin) => {
              // Update the pin data extraction to handle the correct nested structure
              const transformed = pin.transformedData;
              const pinData = transformed?.Item || transformed; // Get from Item if it exists, otherwise use root
              let imageUrl = pin.image_url;
              
              console.log("Pin structure:", JSON.stringify({
                id: pin.id,
                hasTransformedData: !!transformed,
                transformedKeys: transformed ? Object.keys(transformed) : [],
                hasItemProperty: transformed?.Item ? true : false,
                imagesPaths: transformed?.Item?.media?.images ? Object.keys(transformed.Item.media.images) : []
              }, null, 2));
              
              // Extract title from transformed data with correct nesting
              let title = pin.title || 'Pinterest Pin';
              if (pinData) {
                if (pinData.title) {
                  title = pinData.title;
                  console.log(`Using pinData.title: ${title}`);
                } else if (pinData.name) {
                  title = pinData.name;
                  console.log(`Using pinData.name: ${title}`);
                } else if (pinData.alt_text) {
                  title = pinData.alt_text;
                  console.log(`Using pinData.alt_text: ${title}`);
                }
              }
              
              // Extract description from transformed data with correct nesting
              let description = pin.description || '';
              if (pinData && pinData.description) {
                description = pinData.description;
                console.log(`Using pinData.description: ${description.substring(0, 50)}...`);
              } else if (pinData && pinData.note) {
                description = pinData.note;
                console.log(`Using pinData.note: ${description.substring(0, 50)}...`);
              }
              
              // Extract link from transformed data with correct nesting
              let link = pin.link || '';
              if (pinData && pinData.link) {
                link = pinData.link;
                console.log(`Using pinData.link: ${link}`);
              }
              
              // Extract created date
              const createdDate = pinData?.created_at || pin.created_at;
              
              // Get image URLs from the correct structure in media.images
              if (!imageUrl && pinData?.media?.images) {
                // Pinterest stores images at various sizes - try them in order of preference
                const imageSizes = ['original', '1200x', '600x', '400x300', '150x150'];
                
                for (const size of imageSizes) {
                  if (pinData.media.images[size]?.url) {
                    imageUrl = pinData.media.images[size].url;
                    console.log(`Using media.images.${size}.url: ${imageUrl}`);
                    break;
                  }
                }
                
                // If we still don't have an image, try any available size
                if (!imageUrl) {
                  const availableSizes = Object.keys(pinData.media.images);
                  if (availableSizes.length > 0) {
                    const firstSize = availableSizes[0];
                    imageUrl = pinData.media.images[firstSize].url;
                    console.log(`Using first available size ${firstSize}: ${imageUrl}`);
                  }
                }
              }
              
              // Extract hashtags or categories
              let hashtags: string[] = [];
              if (transformed) {
                if (transformed.hashtags && Array.isArray(transformed.hashtags)) {
                  hashtags = transformed.hashtags.slice(0, 3);
                  console.log(`Found ${hashtags.length} hashtags`);
                } else if (transformed.categories && Array.isArray(transformed.categories)) {
                  hashtags = transformed.categories.slice(0, 3);
                  console.log(`Using categories as hashtags: ${hashtags.join(', ')}`);
                } else if (transformed.tags && Array.isArray(transformed.tags)) {
                  hashtags = transformed.tags.slice(0, 3);
                  console.log(`Using tags as hashtags: ${hashtags.join(', ')}`);
                }
              }
              
              // Get save/repin counts if available
              let saveCount = transformed?.counts?.saves || transformed?.repin_count || transformed?.repins || 0;
              
              // Ensure the URL is properly formed
              if (imageUrl) {
                if (imageUrl.startsWith('//')) {
                  imageUrl = 'https:' + imageUrl;
                  console.log('Fixed URL format (added https):', imageUrl);
                } else if (!imageUrl.startsWith('http')) {
                  imageUrl = 'https://' + imageUrl;
                  console.log('Fixed URL format (added https://):', imageUrl);
                }
              } else {
                console.log('No image URL found for pin:', pin.id);
              }
              
              // Update the card styles for masonry layout
              return (
                <div
                  key={pin.id}
                  onClick={(e) => {
                    // Prevent opening modal if clicking on the visit site button
                    if ((e.target as Element).closest('.visit-site-btn')) {
                      e.stopPropagation();
                      return;
                    }
                    openPinModal(pin);
                  }}
                  className="mb-4 cursor-pointer pin-card"
                >
                  <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-200 relative group">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={title}
                          className="w-full object-cover pin-card-img"
                          style={{ maxHeight: '320px' }}
                          onError={(e) => {
                            // If image fails to load, replace with placeholder
                            const target = e.target as HTMLImageElement;
                            console.log(`Image failed to load: ${target.src}`);
                            target.onerror = null; // Prevent infinite loop
                            target.src = 'https://via.placeholder.com/400x300?text=Pinterest+Pin';
                          }}
                        />
                        {/* Overlay that appears on hover */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity duration-200">
                          {/* Visit site button that appears on hover if link exists */}
                          {link && (
                            <a 
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="visit-site-btn absolute bottom-3 left-3 bg-white text-gray-900 text-xs font-medium px-2 py-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-100"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                            >
                              Visit site
                            </a>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-48 flex items-center justify-center text-gray-400 pin-card-img">
                        <svg
                          className="h-12 w-12"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Pinterest-style title below the image - only shown if title exists */}
                  {title && title !== 'Pinterest Pin' && (
                    <h3 className="mt-2 text-sm font-medium text-gray-900 truncate pin-card-title">
                      {title}
                    </h3>
                  )}
                </div>
              );
            })}
          </Masonry>
        )}
      </div>
      
      {/* Pin Detail Modal */}
      {isModalOpen && selectedPin && (() => {
        // Move the console.logs to a self-executing function
        console.log('Modal rendering with pin:', selectedPin);
        console.log('Modal pin transformedData keys:', selectedPin.transformedData ? Object.keys(selectedPin.transformedData) : 'No transformedData');
        
        return (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4"
            onClick={closeModal} // Close modal when clicking the overlay
          >
            <div 
              className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()} // Prevent clicks on the modal from closing it
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center p-4 border-b">
                <h3 className="text-xl font-semibold text-gray-900 truncate">{selectedPin.transformedData?.Item?.title || selectedPin.title}</h3>
                <button 
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Modal Content */}
              <div className="flex-grow overflow-auto">
                <div className="md:flex">
                  {/* Image Container */}
                  <div className="md:w-1/2 p-4">
                    {(() => {
                      // Extract image URL using the same logic as for pin cards
                      const pinData = selectedPin.transformedData?.Item || selectedPin.transformedData;
                      let modalImageUrl = selectedPin.image_url;
                      
                      // If image_url is empty, try to extract from transformedData
                      if (!modalImageUrl && pinData) {
                        // Try Pinterest's common image paths
                        if (pinData.media?.images) {
                          // Try various size options in order of preference
                          const imageSizes = ['original', '600x', '236x', '400x'];
                          for (const size of imageSizes) {
                            if (pinData.media.images[size]?.url) {
                              modalImageUrl = pinData.media.images[size].url;
                              console.log(`Modal using image from size ${size}:`, modalImageUrl);
                              break;
                            }
                          }
                          
                          // If no specific size found, take the first available size
                          if (!modalImageUrl) {
                            const availableSizes = Object.keys(pinData.media.images);
                            if (availableSizes.length > 0) {
                              const firstSize = availableSizes[0];
                              if (pinData.media.images[firstSize]?.url) {
                                modalImageUrl = pinData.media.images[firstSize].url;
                                console.log(`Modal using first available size ${firstSize}:`, modalImageUrl);
                              }
                            }
                          }
                        }
                        
                        // Try other common paths
                        if (!modalImageUrl) {
                          modalImageUrl = pinData.image_url || 
                                         pinData.image || 
                                         pinData.images?.orig?.url || 
                                         pinData.media?.url;
                        }
                      }
                      
                      console.log('Modal final image URL:', modalImageUrl);
                      
                      return modalImageUrl ? (
                        <img 
                          src={modalImageUrl}
                          alt={selectedPin.transformedData?.Item?.title || selectedPin.title} 
                          className="w-full h-auto object-contain max-h-[60vh] rounded"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = 'https://via.placeholder.com/400x300?text=Pinterest+Pin';
                          }}
                        />
                      ) : (
                        <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded">
                          <svg className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {/* Details Container */}
                  <div className="md:w-1/2 p-4">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                      <p className="text-gray-800">{selectedPin.transformedData?.Item?.description || selectedPin.description || "No description available"}</p>
                    </div>
                    
                    {selectedPin.transformedData?.Item?.created_at && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Created</h4>
                        <p className="text-gray-800">{new Date(selectedPin.transformedData.Item.created_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</p>
                      </div>
                    )}
                    
                    {(() => {
                      // Extract link URL using similar logic to image extraction
                      const pinData = selectedPin.transformedData?.Item || selectedPin.transformedData;
                      let linkUrl = selectedPin.link;
                      
                      // If link is empty, try to extract from transformedData
                      if (!linkUrl && pinData) {
                        // Try different possible paths for link
                        linkUrl = pinData.link || 
                                  pinData.url || 
                                  pinData.source_url || 
                                  pinData.media?.link_url || 
                                  pinData.destination || 
                                  pinData.source?.url;
                                  
                        console.log('Modal extracted link URL:', linkUrl);
                      }
                      
                      return linkUrl ? (
                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-500 mb-1">Source</h4>
                          <a 
                            href={linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate block"
                          >
                            {linkUrl}
                          </a>
                        </div>
                      ) : null;
                    })()}
                    
                    {selectedPin.transformedData?.Item?.media?.link_url && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Source URL</h4>
                        <a 
                          href={selectedPin.transformedData.Item.media.link_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {selectedPin.transformedData.Item.media.link_url}
                        </a>
                      </div>
                    )}
                    
                    {selectedPin.link && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Link</h4>
                        <a 
                          href={selectedPin.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline break-all"
                        >
                          {selectedPin.link}
                        </a>
                      </div>
                    )}
                    
                    {selectedPin.transformedData?.Item?.id && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Pin ID</h4>
                        <p className="text-gray-800 font-mono text-sm">{selectedPin.transformedData.Item.id}</p>
                      </div>
                    )}
                    
                    {/* Display hashtags if available */}
                    {selectedPin.transformedData?.Item?.hashtags && selectedPin.transformedData.Item.hashtags.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-500 mb-1">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedPin.transformedData.Item.hashtags.map((tag: string, index: number) => (
                            <span key={index} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
} 