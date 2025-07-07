import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
// guestRegex removed from import
import { isDevelopmentEnvironment } from './lib/constants';

export async function middleware(request: NextRequest) {
  const { pathname , searchParams} = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (!token) {
    // If the user is not authenticated and trying to access the landing page, plans page, login page or register page, let them through.
    if (['/', '/plans', '/login', '/register'].includes(pathname)) {
      return NextResponse.next();
    }
    // For any other page, redirect to the login page.
    // We are no longer using guest users.
    // const redirectUrl = encodeURIComponent(request.url); // redirectUrl can be handled by NextAuth's callbackUrl
    return NextResponse.redirect(new URL(`/login`, request.url));
  }

  // const isGuest = guestRegex.test(token?.email ?? ''); // guestRegex and isGuest logic removed
  // Since guest users are removed, any authenticated user is considered non-guest.
  // The original logic was to redirect logged-in (non-guest) users away from /login or /register.
  // This should now apply to any authenticated user.
  if (token && ['/login', '/register'].includes(pathname)) {
    // Redirect authenticated users trying to access login/register to the chat page
    if (searchParams.getAll('redirect').length != 0) {
      return NextResponse.redirect(new URL(searchParams.getAll('redirect')[0], request.url));
    }
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/chat',
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
