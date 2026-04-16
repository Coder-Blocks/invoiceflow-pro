import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    const session = await auth();
    const isLoggedIn = !!session;

    const pathname = request.nextUrl.pathname;

    // Public paths that don't require authentication
    const publicPaths = [
        '/',
        '/login',
        '/signup',
        '/forgot-password',
        '/pricing',
        '/terms',
        '/privacy',
        '/invite',          // Allow invitation acceptance without auth
        '/api/auth',        // Allow auth API routes
        '/api/auth/register', // Allow registration endpoint
    ];

    const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

    // Dashboard paths require authentication
    const isDashboardPath = pathname.startsWith('/dashboard');

    // API routes that are not auth-related should still be protected if needed
    const isApiPath = pathname.startsWith('/api');

    if (isApiPath && !pathname.startsWith('/api/auth')) {
        // For non-auth API routes, we'll handle authentication in the route handler itself
        return NextResponse.next();
    }

    // If not logged in and trying to access dashboard, redirect to login
    if (!isLoggedIn && isDashboardPath) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    // If logged in and trying to access auth pages, redirect to dashboard
    if (isLoggedIn && (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password')) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};