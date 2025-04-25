'use client';

import React, { useState, useEffect } from 'react';

interface CacheStatsProps {
  showRefreshButton?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  staleHits: number;
  size: number;
  itemCount: number;
}

export const CacheStats: React.FC<CacheStatsProps> = ({ showRefreshButton = true }) => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clearingCache, setClearingCache] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/cache/stats');
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setStats(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching cache stats:', err);
      setError(err.message || 'Failed to fetch cache statistics');
    } finally {
      setLoading(false);
    }
  };

  const clearAllCache = async () => {
    try {
      setClearingCache(true);
      const response = await fetch('/api/admin/cache/clear', {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      await fetchStats();
    } catch (err: any) {
      console.error('Error clearing cache:', err);
      setError(err.message || 'Failed to clear cache');
    } finally {
      setClearingCache(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !stats) {
    return (
      <div className="animate-pulse bg-white shadow rounded-lg p-3">
        <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-2 text-xs">
        <p className="text-red-800">Error loading cache stats</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-gray-900">Cache Stats</h3>
        <div className="flex gap-1">
          {showRefreshButton && (
            <button
              onClick={fetchStats}
              className="p-1 text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 rounded"
              title="Refresh stats"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
          <button
            onClick={clearAllCache}
            disabled={clearingCache}
            className="p-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"
            title="Clear all cache"
          >
            {clearingCache ? (
              <svg className="animate-spin h-3 w-3 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-blue-50 rounded p-2">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-2">
              <p className="font-medium text-blue-900">Hits: {stats?.hits || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded p-2">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-2">
              <p className="font-medium text-red-900">Misses: {stats?.misses || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded p-2">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-3 w-3 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-2">
              <p className="font-medium text-yellow-900">Stale: {stats?.staleHits || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded p-2">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
              </svg>
            </div>
            <div className="ml-2">
              <p className="font-medium text-green-900">{stats ? `${(stats.size / (1024 * 1024)).toFixed(2)} MB` : '0 MB'}</p>
              <p className="text-green-800">{stats?.itemCount || 0} items</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 