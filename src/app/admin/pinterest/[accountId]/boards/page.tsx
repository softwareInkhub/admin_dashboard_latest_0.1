'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Add responsive CSS styles
const responsiveStyles = `
  @media (max-width: 768px) {
    .board-title {
      font-size: 1.5rem;
    }
    .username {
      font-size: 1rem;
    }
    .board-card-img {
      height: 160px;
    }
    .board-card-title {
      font-size: 0.875rem;
    }
    .board-card-description {
      font-size: 0.75rem;
    }
  }
  
  @media (max-width: 640px) {
    .board-title {
      font-size: 1.25rem;
    }
    .username {
      font-size: 0.875rem;
    }
    .board-card-img {
      height: 140px;
    }
    .board-card-title {
      font-size: 0.8125rem;
    }
    .board-card-description {
      font-size: 0.6875rem;
      -webkit-line-clamp: 1;
    }
    .board-card-date {
      font-size: 0.625rem;
    }
  }
  
  @media (max-width: 480px) {
    .board-title {
      font-size: 1.125rem;
    }
    .username {
      font-size: 0.75rem;
    }
    .board-card-img {
      height: 120px;
    }
    .board-card-title {
      font-size: 0.75rem;
    }
    .board-card-description {
      font-size: 0.625rem;
    }
  }
  
  @media (max-width: 360px) {
    .board-title {
      font-size: 1rem;
    }
    .username {
      font-size: 0.6875rem;
    }
    .board-card-img {
      height: 100px;
    }
  }
`;

interface Board {
  id: string;
  name: string;
  description?: string;
  url?: string;
  image_thumbnail_url?: string;
  created_at?: string;
  pin_count?: number;
  media?: {
    pin_thumbnail_urls?: string[];
    image_cover_url?: string;
  };
}

export default function BoardsPage({ params }: { params: { accountId: string } }) {
  const router = useRouter();
  const { accountId } = params;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [accountUsername, setAccountUsername] = useState<string>('');
  
  useEffect(() => {
    const fetchBoards = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Fetching boards for account ID: ${accountId}`);
        
        // First, get account information from our fetch-account API
        let username = '';
        try {
          const accountResponse = await fetch('/api/admin/pinterest/fetch-account', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ accountId }),
          });
          
          const accountData = await accountResponse.json();
          
          if (accountResponse.ok && accountData.success) {
            const account = accountData.account;
            username = account.username;
            setAccountUsername(username);
            console.log(`Found username ${username} for account ${accountId} from API`);
          } else {
            console.warn(`Account with ID ${accountId} not found via API: ${accountData.message}`);
            
            // Fallback to localStorage for backward compatibility
            console.log('Falling back to localStorage for account data');
            if (typeof window !== 'undefined') {
              const savedAccounts = localStorage.getItem('pinterestAccounts');
              if (savedAccounts) {
                const accounts = JSON.parse(savedAccounts);
                const localAccount = accounts.find((acc: any) => acc.id === accountId);
                if (localAccount) {
                  username = localAccount.username;
                  setAccountUsername(username);
                  console.log(`Found username ${username} for account ${accountId} in localStorage`);
                }
              }
            }
          }
        } catch (e) {
          console.error('Error fetching account information:', e);
          
          // Fallback to localStorage if API call fails completely
          console.log('API call failed, falling back to localStorage');
          if (typeof window !== 'undefined') {
            const savedAccounts = localStorage.getItem('pinterestAccounts');
            if (savedAccounts) {
              const accounts = JSON.parse(savedAccounts);
              const localAccount = accounts.find((acc: any) => acc.id === accountId);
              if (localAccount) {
                username = localAccount.username;
                setAccountUsername(username);
                console.log(`Found username ${username} for account ${accountId} in localStorage`);
              }
            }
          }
        }
        
        // If we still don't have a username, try to use accountId as a fallback
        if (!username) {
          console.warn('Username not found in API or localStorage, using account ID as fallback');
          // Some users might have set the accountId to be the username
          username = accountId;
        }
        
        // Call our API to fetch the boards
        const response = await fetch('/api/admin/pinterest/fetch-boards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            accountId, 
            username // Include username as a fallback
          }),
        });
        
        const data = await response.json();
        console.log('API response:', data);
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch boards');
        }
        
        if (!data.success) {
          throw new Error(data.message || 'No boards found for this account');
        }
        
        setBoards(data.boards || []);
      } catch (err) {
        console.error('Error fetching boards:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBoards();
  }, [accountId]);
  
  return (
    <div className="py-8">
      {/* Add the responsive styles */}
      <style jsx global>{responsiveStyles}</style>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 board-title">
            Pinterest Boards
      
            {accountUsername && (
              <span className="ml-2 text-gray-500 text-lg username">@{accountUsername}</span>
            )}
            {!loading && !error && (
              <span className="text-gray-500 text-lg ml-2 username">({boards.length})</span>
            )}
          </h1>
          <div className="mt-3 sm:mt-0 sm:ml-4">
            <button
              type="button"
              onClick={() => router.push('/admin/pinterest')}
              className="inline-flex items-center justify-center p-2 border border-gray-300 shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded-full h-9 w-9"
              aria-label="Back to accounts"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path 
                  fillRule="evenodd" 
                  d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                  clipRule="evenodd" 
                />
              </svg>
            </button>
          </div>
        </div>

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
              <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Boards</h3>
              <p className="mt-1 text-sm text-red-500">{error}</p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => router.push('/admin/pinterest')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  aria-label="Back to accounts"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-1" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                  Return
                </button>
              </div>
            </div>
          </div>
        ) : boards.length === 0 ? (
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
              <h3 className="mt-2 text-lg font-medium text-gray-900">No Pinterest Boards</h3>
              <p className="mt-1 text-sm text-gray-500">
                This account does not have any Pinterest boards or they could not be found.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => router.push('/admin/pinterest')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  aria-label="Back to accounts"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4 mr-1" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                  Return
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4 lg:gap-6">
            {boards.map((board) => {
              // Determine the best image to use
              let imageUrl = board.image_thumbnail_url;
              if (!imageUrl && board.media) {
                if (board.media.image_cover_url) {
                  imageUrl = board.media.image_cover_url;
                } else if (board.media.pin_thumbnail_urls && board.media.pin_thumbnail_urls.length > 0) {
                  imageUrl = board.media.pin_thumbnail_urls[0];
                }
              }
              
              // Format the date nicely
              const createdDate = board.created_at 
                ? new Date(board.created_at).toLocaleDateString(undefined, { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })
                : '';
                
              return (
                <Link
                  key={board.id}
                  href={`/admin/pinterest/${accountId}/boards/${board.id}`}
                  className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow duration-200"
                >
                  <div className="h-24 xs:h-28 sm:h-32 md:h-40 bg-gray-200 relative board-card-img">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={board.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // If image fails to load, replace with placeholder
                          const target = e.target as HTMLImageElement;
                          console.log(`Image failed to load: ${target.src}`);
                          target.onerror = null; // Prevent infinite loop
                          target.src = 'https://via.placeholder.com/400x300?text=Pinterest+Board';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <svg
                          className="h-6 w-6 xs:h-8 xs:w-8 sm:h-10 sm:w-10 md:h-12 md:w-12"
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
                    {board.pin_count !== undefined && board.pin_count > 0 && (
                      <div className="absolute top-1 right-1 bg-black bg-opacity-60 text-white text-xs px-1 xs:px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] xs:text-xs">
                        {board.pin_count} {board.pin_count === 1 ? 'pin' : 'pins'}
                      </div>
                    )}
                  </div>
                  <div className="p-1.5 xs:p-2 sm:p-3 md:p-4">
                    <h3 className="text-xs xs:text-sm sm:text-base md:text-lg font-medium text-gray-900 truncate board-card-title">{board.name}</h3>
                    {board.description && (
                      <p className="mt-0.5 text-[10px] xs:text-xs sm:text-sm text-gray-500 line-clamp-1 sm:line-clamp-2 board-card-description">{board.description}</p>
                    )}
                    {createdDate && (
                      <p className="mt-0.5 xs:mt-1 sm:mt-2 text-[10px] xs:text-xs text-gray-400 board-card-date">
                        Created {createdDate}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
} 