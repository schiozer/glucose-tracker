import { withMiddlewareAuthRequired } from '@auth0/nextjs-auth0/edge';

/**
 * Authentication middleware using Auth0
 *
 * Protects the following routes:
 * - /dashboard/* - Main dashboard and all subpages
 * - /readings/* - Glucose readings management
 * - /charts/* - Data visualization pages
 * - /reports/* - Reports and analytics
 * - /settings/* - User settings
 * - /api/profiles/* - Profile API routes
 * - /api/readings/* - Readings API routes
 * - /api/thresholds/* - Thresholds API routes
 * - /api/reports/* - Reports API routes
 *
 * Unauthenticated users will be redirected to /api/auth/login
 */
export default withMiddlewareAuthRequired();

/**
 * Middleware configuration
 * Specifies which routes should be protected by authentication
 */
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/readings/:path*',
    '/charts/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/api/profiles/:path*',
    '/api/readings/:path*',
    '/api/thresholds/:path*',
    '/api/reports/:path*',
  ],
};
