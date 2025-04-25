import { NextResponse } from 'next/server';

// Pinterest OAuth configuration
const PINTEREST_CLIENT_ID = process.env.PINTEREST_CLIENT_ID;
const PINTEREST_REDIRECT_URI = process.env.PINTEREST_REDIRECT_URI || 'http://localhost:3000/api/pinterest/callback';
const SCOPES = 'boards:read,pins:read,boards:write,pins:write,user_accounts:read';

/**
 * Initiates the Pinterest OAuth flow by redirecting the user to the Pinterest OAuth page
 */
export async function GET() {
  if (!PINTEREST_CLIENT_ID) {
    return NextResponse.json(
      { error: 'Pinterest client ID is not configured' },
      { status: 500 }
    );
  }

  // Generate a random state value for CSRF protection
  const state = Math.random().toString(36).substring(2, 15);
  
  // Create the OAuth URL
  const authUrl = new URL('https://www.pinterest.com/oauth/');
  authUrl.searchParams.append('client_id', PINTEREST_CLIENT_ID);
  authUrl.searchParams.append('redirect_uri', PINTEREST_REDIRECT_URI);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', SCOPES);
  authUrl.searchParams.append('state', state);

  // Set the state in a cookie for later verification
  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set('pinterest_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  });

  return response;
} 