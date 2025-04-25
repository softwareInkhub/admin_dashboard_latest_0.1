import { NextRequest, NextResponse } from 'next/server';

// Environment variables for Pinterest OAuth
const PINTEREST_CLIENT_ID = process.env.PINTEREST_CLIENT_ID || '';
const PINTEREST_CLIENT_SECRET = process.env.PINTEREST_CLIENT_SECRET || '';
const PINTEREST_REDIRECT_URI = process.env.PINTEREST_REDIRECT_URI || '';

/**
 * Handle the Pinterest OAuth callback
 * This route will receive the authorization code from Pinterest,
 * exchange it for an access token, fetch the user profile,
 * and redirect back to the Pinterest accounts page with the account data
 */
export async function GET(request: NextRequest) {
  try {
    // Get the authorization code from the URL query parameter
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    
    // If there is no code, redirect back with an error
    if (!code) {
      return NextResponse.redirect(`${request.nextUrl.origin}/admin/pinterest?error=Missing authorization code`);
    }
    
    // Exchange the authorization code for an access token
    const tokenResponse = await fetch('https://api.pinterest.com/v5/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${PINTEREST_CLIENT_ID}:${PINTEREST_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: PINTEREST_REDIRECT_URI
      }).toString()
    });
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Error exchanging code for token:', errorData);
      return NextResponse.redirect(`${request.nextUrl.origin}/admin/pinterest?error=${encodeURIComponent('Failed to exchange authorization code for token')}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    // Get the user info from Pinterest
    const userResponse = await fetch('https://api.pinterest.com/v5/user_account', {
      headers: {
        'Authorization': `${tokenData.token_type} ${tokenData.access_token}`
      }
    });
    
    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      console.error('Error fetching user data:', errorData);
      return NextResponse.redirect(`${request.nextUrl.origin}/admin/pinterest?error=${encodeURIComponent('Failed to fetch user data')}`);
    }
    
    const userData = await userResponse.json();
    
    // Store the account data in a secure HTTP-only cookie
    // We'll use this cookie to populate the account in localStorage via a script on the client side
    const accountData = {
      id: userData.username, // Using username as ID for uniqueness
      name: userData.username, // Pinterest API v5 doesn't return a user's full name
      username: userData.username,
      avatar: `https://api.pinterest.com/v5/user/avatar/${userData.username}.png`, // Placeholder, actual avatar URL might vary
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresIn: tokenData.expires_in,
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      createdAt: new Date().toISOString()
    };
    
    // Set a temporary cookie with the account data
    const response = NextResponse.redirect(`${request.nextUrl.origin}/admin/pinterest?success=true`);
    response.cookies.set('pinterest_account_data', JSON.stringify(accountData), {
      maxAge: 60 * 5, // 5 minutes expiry
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    return response;
  } catch (error) {
    console.error('Error in Pinterest OAuth callback:', error);
    return NextResponse.redirect(`${request.nextUrl.origin}/admin/pinterest?error=${encodeURIComponent('An unexpected error occurred')}`);
  }
} 