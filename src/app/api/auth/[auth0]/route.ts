import { handleAuth, handleLogin } from '@auth0/nextjs-auth0';

/**
 * Auth0 dynamic route handler
 *
 * Handles all Auth0 authentication routes:
 * - /api/auth/login - Initiates Auth0 login flow
 * - /api/auth/logout - Logs out the user
 * - /api/auth/callback - Auth0 callback after authentication
 * - /api/auth/me - Returns current user session
 *
 * The handleAuth() function from Auth0 SDK automatically creates these routes
 */
export const GET = handleAuth({
  login: handleLogin({
    returnTo: '/dashboard',
  }),
});
