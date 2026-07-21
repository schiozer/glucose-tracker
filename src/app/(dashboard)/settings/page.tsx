import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import { getProfilesByUserId } from '@/lib/supabase/queries';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThresholdsList } from '@/components/features/settings/thresholds-list';
import Link from 'next/link';

export default async function SettingsPage() {
  const session = await getSession();
  const userId = getUserIdFromSession(session);

  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Você precisa estar autenticado para acessar as configurações.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Fetch user's profiles
  const supabase = createServerClient();
  const profiles = await getProfilesByUserId(supabase, userId);

  // Get the first active profile (user's own profile)
  const activeProfile = profiles.find((p) => p.user_id === userId);

  if (!activeProfile) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Personalize suas preferências e alertas
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Perfil Necessário</CardTitle>
            <CardDescription>
              Você precisa criar um perfil antes de configurar os limites de glicemia.
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize os limites de glicemia para cada contexto
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Limites de Glicemia</CardTitle>
          <CardDescription>
            Defina os limites personalizados de glicemia para diferentes contextos do
            seu dia a dia. Consulte seu médico antes de alterar os valores padrão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThresholdsList profileId={activeProfile.id} />
        </CardContent>
      </Card>
    </div>
  );
}
