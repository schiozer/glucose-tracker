import { getSession } from '@/lib/auth0/session';
import { AppLayout } from '@/components/layouts/app-layout';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Get user session from Auth0
  const session = await getSession();

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/api/auth/login');
  }

  return (
    <AppLayout
      userName={session.user.name}
      userPicture={session.user.picture}
    >
      {children}
    </AppLayout>
  );
}
