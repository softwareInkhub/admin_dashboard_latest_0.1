'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// Add responsive styles
const responsiveStyles = `
  @media (max-width: 768px) {
    .page-title {
      font-size: 1.25rem;
    }
    .page-icon {
      height: 2rem;
      width: 2rem;
      margin-right: 0.5rem;
    }
    .add-button {
      padding: 0.3rem 0.6rem;
      font-size: 0.75rem;
    }
    
    .account-card {
      padding: 1.25rem;
    }
    .account-avatar {
      height: 3rem;
      width: 3rem;
    }
    .account-name {
      font-size: 1rem;
    }
    .account-meta {
      font-size: 0.75rem;
    }
    .board-chip {
      font-size: 0.7rem;
      padding: 0.25rem 0.5rem;
    }
  }
  
  @media (max-width: 640px) {
    .page-title {
      font-size: 1.1rem;
    }
    .page-icon {
      height: 1.75rem;
      width: 1.75rem;
      margin-right: 0.4rem;
    }
    
    .add-button-icon {
      height: 0.8rem;
      width: 0.8rem;
    }
    .account-card {
      padding: 1rem;
    }
    .account-avatar {
      height: 2.5rem;
      width: 2.5rem;
    }
    .add-button {
      padding: 0.25rem 0.5rem;
      font-size: 0.7rem;
    }
    .account-name {
      font-size: 0.875rem;
    }
    .board-section-title {
      font-size: 0.75rem;
    }
    .board-chip {
      font-size: 0.65rem;
      padding: 0.2rem 0.4rem;
    }
  }
  
  @media (max-width: 480px) {
    .page-title {
      font-size: 1rem;
    }
    .page-icon {
      height: 1.5rem;
      width: 1.5rem;
      margin-right: 0.3rem;
    }
    .add-button-icon {
      height: 0.9rem;
      width: 0.9rem;
      margin-right: 0.2rem;
    }
    .account-avatar {
      height: 2.25rem;
      width: 2.25rem;
    }
    .account-info {
      margin-left: 0.75rem;
    }
    .account-name {
      font-size: 0.8125rem;
    }
    .account-meta {
      font-size: 0.6875rem;
    }
    .board-card-grid {
      gap: 0.25rem;
    }
    .board-chip {
      font-size: 0.625rem;
      padding: 0.125rem 0.375rem;
    }
  }
`;

interface Board {
  id: string;
  name: string;
  url?: string;
  description?: string;
}

interface PinterestAccount {
  id: string;
  username: string;
  createdAt: string;
  boards?: Board[];
}

// API-based account functions
const fetchAccounts = async (): Promise<PinterestAccount[]> => {
  try {
    const response = await fetch('/api/admin/pinterest/accounts');
    if (!response.ok) {
      throw new Error('Failed to fetch accounts');
    }
    
    const data = await response.json();
    return data.accounts || [];
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
};

const saveAccount = async (account: PinterestAccount): Promise<PinterestAccount | null> => {
  try {
    const response = await fetch('/api/admin/pinterest/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(account),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save account');
    }
    
    const data = await response.json();
    return data.account || null;
  } catch (error) {
    console.error('Error saving account:', error);
    return null;
  }
};

const deleteAccount = async (id: string): Promise<boolean> => {
  try {
    const response = await fetch(`/api/admin/pinterest/accounts?id=${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete account');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting account:', error);
    return false;
  }
};

export default function PinterestPage() {
  const [accounts, setAccounts] = useState<PinterestAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load accounts from DynamoDB on initial render
  useEffect(() => {
    const loadAccounts = async () => {
      setIsLoading(true);
      const loadedAccounts = await fetchAccounts();
      setAccounts(loadedAccounts);
      setIsLoading(false);
    };
    
    loadAccounts();
  }, []);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    setError(null);
    setVerifying(true);
    
    try {
      // First, verify the account using the existing API
      const verifyResponse = await fetch('/api/admin/pinterest/verify-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim() }),
      });
      
      const verifyData = await verifyResponse.json();
      console.log('Verification API response:', verifyData);
      
      if (!verifyResponse.ok) {
        throw new Error(verifyData.error || verifyData.message || 'Failed to verify account');
      }
      
      if (!verifyData.exists) {
        setError(`Account not found: ${verifyData.message || 'Username does not exist in DynamoDB'}`);
        return;
      }
      
      // Check for duplicate accounts
      const existingAccount = accounts.find(acc => 
        acc.username.toLowerCase() === verifyData.account.username.toLowerCase()
      );
      
      if (existingAccount) {
        setError(`Account with username "${verifyData.account.username}" already exists`);
        return;
      }
      
      // Account exists and is valid, save it to DynamoDB
      console.log('Adding verified account:', verifyData.account);
      
      const savedAccount = await saveAccount(verifyData.account);
      
      if (savedAccount) {
        // Update the accounts list with the newly saved account
        setAccounts(prev => [...prev, savedAccount]);
        
        // Reset form
        setUsername('');
        setShowAddForm(false);
      } else {
        setError('Failed to save account to database');
      }
    } catch (error) {
      console.error('Error adding account:', error);
      setError(`Failed to add account: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveAccount = async (id: string) => {
    const success = await deleteAccount(id);
    
    if (success) {
      const updatedAccounts = accounts.filter(account => account.id !== id);
      setAccounts(updatedAccounts);
    } else {
      setError('Failed to delete account');
    }
  };

  return (
    <div className="py-8 bg-gray-50 min-h-screen">
      {/* Add the responsive styles */}
      <style jsx global>{responsiveStyles}</style>
      
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6 pb-2">
          <div className="flex items-center">
            <svg className="h-7 w-7 text-red-600 mr-2 page-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0a12 12 0 0 0-4.373 23.178c-.017-.976-.003-2.149.244-3.209.267-1.129 1.695-7.186 1.695-7.186s-.422-.846-.422-2.094c0-1.961 1.136-3.424 2.552-3.424 1.206 0 1.782.894 1.782 1.965 0 1.198-.768 2.988-1.163 4.645-.329 1.394.7 2.535 2.081 2.535 2.492 0 4.168-3.208 4.168-7.013 0-2.891-1.968-5.051-5.499-5.051-4.008 0-6.513 2.990-6.513 6.327 0 1.152.34 1.961.871 2.587.243.291.277.39.187.712-.63.24-.207.82-.268 1.048-.084.337-.357.456-.659.331-1.843-.756-2.702-2.785-2.702-5.066 0-3.764 3.173-8.279 9.469-8.279 5.068 0 8.394 3.666 8.394 7.599 0 5.203-2.889 9.095-7.148 9.095-1.43 0-2.773-.772-3.234-1.649l-.881 3.495c-.314 1.14-.96 2.282-1.542 3.163A12 12 0 1 0 12 0z"/>
            </svg>
            <h1 className="text-xl font-bold text-gray-900 page-title">Pinterest Accounts</h1>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center px-3 py-1 border border-transparent rounded text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-red-500 transition-colors duration-200 add-button"
          >
            <svg className="mr-1 h-4 w-4 add-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Account
          </button>
        </div>

        {/* Add Account Form */}
        {showAddForm && (
          <div className="mb-8 bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            <div className="px-6 py-5">
              <h3 className="text-xl font-semibold text-gray-900 mb-1 account-name">Add Pinterest Account</h3>
              <div className="text-sm text-gray-500 mb-4 account-meta">
                <p>Enter the Pinterest username to verify and add a new account. The account must exist in DynamoDB.</p>
              </div>
              <form className="flex flex-col sm:flex-row items-start sm:items-center gap-3" onSubmit={handleAddAccount}>
                <div className="w-full sm:max-w-md">
                  <label htmlFor="username" className="sr-only">Username</label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">@</span>
                    </div>
                    <input
                      type="text"
                      name="username"
                      id="username"
                      className="block w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                      placeholder="Pinterest username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={verifying}
                    />
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="inline-flex items-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors duration-200"
                    disabled={verifying}
                  >
                    {verifying ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                      </>
                    ) : (
                      'Verify & Add'
                    )}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                    onClick={() => {
                      setShowAddForm(false);
                      setError(null);
                    }}
                    disabled={verifying}
                  >
                    Cancel
                  </button>
                </div>
              </form>
              {error && (
                <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 account-meta">
                  <div className="flex">
                    <svg className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700"></div>
          </div>
        )}

        {/* Accounts List */}
        {!isLoading && accounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map(account => (
              <div key={account.id} className="group relative">
                <Link
                  href={`/admin/pinterest/${account.id}/boards`}
                  className="block bg-white rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 border border-gray-100 h-full"
                >
                  <div className="p-6 account-card">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center text-red-600 font-bold border border-red-200 account-avatar">
                          {account.username.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div className="ml-4 flex-1 account-info">
                        <h3 className="text-lg font-medium text-gray-900 account-name">{account.username}</h3>
                        <div className="flex items-center text-sm text-gray-500 account-meta">
                          <svg className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Added {new Date(account.createdAt).toLocaleDateString()}</span>
                        </div>
                        {account.boards && account.boards.length > 0 && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 account-meta">
                              <svg className="-ml-0.5 mr-1.5 h-3 w-3 text-red-700" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3 1h10v8H5V6z" clipRule="evenodd" />
                              </svg>
                              {account.boards.length} {account.boards.length === 1 ? 'board' : 'boards'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Account boards preview */}
                    {account.boards && account.boards.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center board-section-title">
                          <svg className="mr-1.5 h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                          </svg>
                          Boards
                        </h4>
                        <div className="grid grid-cols-2 gap-2 board-card-grid">
                          {account.boards.slice(0, 4).map(board => (
                            <div key={board.id} className="bg-gray-50 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 border border-gray-100 truncate board-chip">
                              {board.name}
                            </div>
                          ))}
                          {account.boards.length > 4 && (
                            <div className="bg-red-50 px-3 py-2 rounded-lg text-xs font-medium text-red-600 border border-red-100 flex items-center justify-center board-chip">
                              +{account.boards.length - 4} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => {
                          e.preventDefault(); // Prevent navigation
                          handleRemoveAccount(account.id);
                        }}
                        className="p-1.5 bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500 focus:outline-none border border-gray-200 hover:border-red-200 transition-colors duration-200"
                        title="Remove account"
                      >
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        ) : !isLoading ? (
          <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            <div className="px-6 py-12 text-center">
              <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-red-50">
                <svg className="h-12 w-12 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0a12 12 0 0 0-4.373 23.178c-.017-.976-.003-2.149.244-3.209.267-1.129 1.695-7.186 1.695-7.186s-.422-.846-.422-2.094c0-1.961 1.136-3.424 2.552-3.424 1.206 0 1.782.894 1.782 1.965 0 1.198-.768 2.988-1.163 4.645-.329 1.394.7 2.535 2.081 2.535 2.492 0 4.168-3.208 4.168-7.013 0-2.891-1.968-5.051-5.499-5.051-4.008 0-6.513 2.990-6.513 6.327 0 1.152.34 1.961.871 2.587.243.291.277.39.187.712-.63.24-.207.82-.268 1.048-.084.337-.357.456-.659.331-1.843-.756-2.702-2.785-2.702-5.066 0-3.764 3.173-8.279 9.469-8.279 5.068 0 8.394 3.666 8.394 7.599 0 5.203-2.889 9.095-7.148 9.095-1.43 0-2.773-.772-3.234-1.649l-.881 3.495c-.314 1.14-.96 2.282-1.542 3.163A12 12 0 1 0 12 0z"/>
                </svg>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-gray-900 account-name">No Pinterest accounts</h3>
              <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto account-meta">
                Get started by adding a Pinterest account. You'll be able to manage boards and pins from your verified accounts.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 add-button"
                >
                  <svg className="-ml-1 mr-2 h-5 w-5 add-button-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Add Pinterest Account
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
} 