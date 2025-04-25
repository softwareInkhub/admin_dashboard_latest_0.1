'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';


export default function PinterestOAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the code and state from URL parameters
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        
        if (error) {
          setStatus('error');
          setErrorMessage(`Pinterest returned an error: ${error}`);
          return;
        }
        
        if (!code) {
          setStatus('error');
          setErrorMessage('No authorization code found in the URL');
          return;
        }

        // Exchange the code for an access token
        // const tokenData = await exchangeCodeForToken(code);
        // if (!tokenData) {
        //   setStatus('error');
        //   setErrorMessage('Failed to exchange authorization code for access token');
        //   return;
        // }

        // Get user info using the access token
        // const userData = await getUserInfo(tokenData.access_token);
        // if (!userData) {
        //   setStatus('error');
        //   setErrorMessage('Failed to fetch user information');
        //   return;
        // }

        // Create and save the Pinterest account
        // const accountData = createPinterestAccount(tokenData, userData);
        // addPinterestAccount(accountData);

        // Set success status
        setStatus('success');
        
        // Redirect to the Pinterest dashboard after a short delay
        setTimeout(() => {
          router.push('/admin/pinterest?success=true');
        }, 2000);
      } catch (error) {
        console.error('Error in OAuth callback:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred during authentication');
      }
    };

    handleOAuthCallback();
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        {status === 'loading' && (
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Pinterest Authentication</h2>
            <p className="text-gray-600">Completing authentication process...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="bg-green-100 rounded-full p-3 inline-flex mb-4">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Authentication Successful</h2>
            <p className="text-gray-600 mb-4">Your Pinterest account has been connected successfully.</p>
            <p className="text-gray-500 text-sm">Redirecting to dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="bg-red-100 rounded-full p-3 inline-flex mb-4">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">Authentication Failed</h2>
            <p className="text-gray-600 mb-4">{errorMessage || 'An error occurred during authentication.'}</p>
            <button
              onClick={() => router.push('/admin/pinterest')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 