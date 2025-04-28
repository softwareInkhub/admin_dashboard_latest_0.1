'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

function OAuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      setError('No authorization code received');
      return;
    }

    // Process the OAuth callback
    const processCallback = async () => {
      try {
        const response = await fetch('/api/pinterest/oauth/callback', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process OAuth callback');
        }

        // Redirect to the Pinterest admin page on success
        router.push('/admin/pinterest');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    };

    processCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => router.push('/admin/pinterest')}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Return to Pinterest Admin
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">Processing OAuth callback...</p>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <LoadingSpinner size="lg" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
} 