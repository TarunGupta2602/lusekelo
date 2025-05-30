import { NextResponse } from 'next/server';

// List of protected vendor routes
const protectedRoutes = [
  '/vendor/dashboard',
  '/vendor/add-inventory',
  '/vendor/edit-inventory',
  '/vendor/create-store',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Check if the current path is a protected vendor route
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // Check for a Supabase auth token in cookies (adjust as needed for your auth)
    const token = request.cookies.get('sb-access-token')?.value;

    // If no token, redirect to vendor login
    if (!token) {
      const loginUrl = new URL('/vendor', request.url);
      loginUrl.searchParams.set('redirected', '1');
      return NextResponse.redirect(loginUrl);
    }
    // Optionally, you can add more logic here to validate the token with Supabase
  }

  return NextResponse.next();
}

// Enable middleware for the vendor routes only
export const config = {
  matcher: [
    '/vendor/dashboard',
    '/vendor/add-inventory',
    '/vendor/edit-inventory',
    '/vendor/create-store',
  ],
};