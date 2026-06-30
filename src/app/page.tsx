import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth0/session';

/**
 * Root page
 *
 * Redirects users based on authentication status:
 * - Authenticated users -> /dashboard
 * - Unauthenticated users -> /login
 *
 * This page is dynamic because it checks session (uses cookies)
 */
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
