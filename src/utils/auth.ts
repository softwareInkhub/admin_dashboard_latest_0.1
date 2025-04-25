import { NextRequest, NextResponse } from 'next/server';

// Basic admin authentication middleware
// Authentication has been disabled as per user request
export function isAuthenticated(request: NextRequest) {
  // Always return true to bypass authentication
  return true;
}

// Middleware to protect admin routes
export function withAdminAuth(handler: Function) {
  // Simply pass through to the handler without auth checks
  return async (request: NextRequest) => {
    return handler(request);
  };
} 