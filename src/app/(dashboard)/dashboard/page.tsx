import { getSession } from '@/lib/auth0/session';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Activity, TrendingUp, AlertCircle, Calendar } from 'lucide-react';

export default async function DashboardPage() {
  const session = await getSession();

  const firstName = session?.user.name?.split(' ')[0] || 'Usuário';

  // Placeholder stats - will be replaced with real data in Task 12
  const stats = [
    {
      title: 'Média de Glicemia',
      value: '120 mg/dL',
      description: 'Últimos 7 dias',
      icon: Activity,
      trend: '+2.5%',
    },
    {
      title: 'Leituras Hoje',
      value: '4',
      description: 'De 6 planejadas',
      icon: Calendar,
      trend: '66%',
    },
    {
      title: 'Tendência',
      value: 'Estável',
      description: 'Últimos 30 dias',
      icon: TrendingUp,
      trend: 'Normal',
    },
    {
      title: 'Alertas',
      value: '2',
      description: 'Últimas 24 horas',
      icon: AlertCircle,
      trend: 'Baixa',
    },
  ];

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

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
                <div className="mt-2 text-xs font-medium text-primary">
                  {stat.trend}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent activity placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>
            Suas últimas medições de glicemia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <p>Nenhuma medição registrada ainda.</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesso rápido às funcionalidades principais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border p-4 hover:bg-accent transition-colors cursor-pointer">
              <Activity className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold">Nova Medição</h3>
              <p className="text-sm text-muted-foreground">
                Registrar nova leitura
              </p>
            </div>
            <div className="rounded-lg border p-4 hover:bg-accent transition-colors cursor-pointer">
              <TrendingUp className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold">Ver Gráficos</h3>
              <p className="text-sm text-muted-foreground">
                Análise visual dos dados
              </p>
            </div>
            <div className="rounded-lg border p-4 hover:bg-accent transition-colors cursor-pointer">
              <AlertCircle className="h-8 w-8 mb-2 text-primary" />
              <h3 className="font-semibold">Configurar Alertas</h3>
              <p className="text-sm text-muted-foreground">
                Definir limites de glicemia
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
