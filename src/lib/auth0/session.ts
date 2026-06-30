import { getSession as getAuth0Session } from '@auth0/nextjs-auth0';

/**
 * Session interface with user information from Auth0
 */
export interface Session {
  user: {
    sub: string;           // Auth0 user ID (auth0|123456...)
    email: string;
    name?: string;
    picture?: string;
    email_verified?: boolean;
  };
}

/**
 * Get the current user session from Auth0
 * Returns null if user is not authenticated
 *
 * @returns Session object or null
 */
export async function getSession(): Promise<Session | null> {
  try {
    const session = await getAuth0Session();
    return session as Session | null;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Extract user ID from Auth0 session
 * Removes the Auth0 provider prefix (e.g., "auth0|" or "google-oauth2|")
 * to get the clean user identifier
 *
 * @param session - Auth0 session object
 * @returns User ID string or null if session is invalid
 */
export function getUserIdFromSession(session: Session | null): string | null {
  if (!session?.user?.sub) {
    return null;
  }

  // Auth0 sub format: "auth0|123456", "google-oauth2|123456", etc.
  // We keep the full sub as the user ID for consistency with database
  return session.user.sub;
}

/**
 * Check if a user is authenticated
 *
 * @returns boolean indicating authentication status
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}
