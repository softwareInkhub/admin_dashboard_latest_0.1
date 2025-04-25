'use client';

import React from 'react';
import { CombinedTableView } from '@/components/admin/CombinedTableView';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const [tables, setTables] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTables() {
      try {
        setIsLoading(true);
        const response = await fetch('/api/admin/dynamodb/tables');
        
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setTables(data.tables || []);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching tables:', err);
        setError(err.message || 'Failed to fetch DynamoDB tables');
      } finally {
        setIsLoading(false);
      }
    }

    fetchTables();
  }, []);

  return (
    <div>
      <div className="pb-5 border-b border-gray-200 sm:flex sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">DynamoDB Tables</h1>
      </div>

      <div className="mt-6">
        <CombinedTableView tables={tables} isLoading={isLoading} error={error} />
      </div>
    </div>
  );
} 