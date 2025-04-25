import { NextRequest, NextResponse } from 'next/server';

/**
 * Handles the OAuth callback from Pinterest
 * Receives the authorization code and exchanges it for an access token
 */
export async function GET(request: NextRequest) {
  // Get the code and state from the URL query parameters
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  
  // Get the stored state from the cookie
  const storedState = request.cookies.get('pinterest_oauth_state')?.value;
  
  // Validate the state to prevent CSRF attacks
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/admin/pinterest?error=invalid_state', request.url));
  }
  
  // Validate the authorization code
  if (!code) {
    return NextResponse.redirect(new URL('/admin/pinterest?error=missing_code', request.url));
  }
  
  try {
    // Exchange the code for an access token
    const tokenResponse = await fetch('/api/pinterest/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Error exchanging code for token:', errorData);
      return NextResponse.redirect(new URL(`/admin/pinterest?error=${errorData.error || 'token_exchange_failed'}`, request.url));
    }
    
    // Successfully authenticated
    // Clear the state cookie
    const response = NextResponse.redirect(new URL('/admin/pinterest?success=true', request.url));
    response.cookies.delete('pinterest_oauth_state');
    
    return response;
  } catch (error) {
    console.error('Error in Pinterest callback:', error);
    return NextResponse.redirect(new URL('/admin/pinterest?error=server_error', request.url));
  }
} 