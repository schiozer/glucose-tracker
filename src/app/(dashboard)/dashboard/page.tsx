import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import { getProfilesByUserId } from '@/lib/supabase/queries';
import { DashboardContent } from '@/components/features/dashboard/dashboard-content';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await getSession();
  const userId = getUserIdFromSession(session);

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa estar autenticado para acessar o dashboard.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const firstName = session?.user.name?.split(' ')[0] || 'Usuário';

  // Fetch user's profiles
  const supabase = createServerClient();
  const profiles = await getProfilesByUserId(supabase, userId);

  // Get the first active profile (user's own profile)
  const activeProfile = profiles.find((p) => p.user_id === userId);

  if (!activeProfile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Olá, {firstName}!
          </h1>
          <p className="text-muted-foreground">
            Aqui está um resumo do seu monitoramento de glicemia.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Perfil Necessário</CardTitle>
            <CardDescription>
              Você precisa criar um perfil antes de começar a monitorar sua glicemia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/profile">Criar Perfil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Olá, {firstName}!
        </h1>
        <p className="text-muted-foreground">
          Aqui está um resumo do seu monitoramento de glicemia.
        </p>
      </div>

      {/* Dashboard content with real data */}
      <DashboardContent profileId={activeProfile.id} />
    </div>
  );
}
