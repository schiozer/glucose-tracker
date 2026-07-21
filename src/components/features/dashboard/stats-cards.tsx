/**
 * Stats Cards Component
 * Displays glucose statistics as metric cards
 */

'use client';

import { Activity, Calendar, Target, AlertCircle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { DashboardStats } from '@/hooks/use-dashboard-data';

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  colorClass,
  loading,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  // Determine color classes based on values
  const getAverageColor = (avg: number) => {
    if (avg === 0) return 'text-muted-foreground';
    if (avg < 70) return 'text-red-600';
    if (avg >= 70 && avg <= 140) return 'text-green-600';
    if (avg > 140 && avg <= 180) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getTimeInTargetColor = (pct: number) => {
    if (pct === 0) return 'text-muted-foreground';
    if (pct >= 70) return 'text-green-600';
    if (pct >= 50) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getAlertColor = (count: number) => {
    if (count === 0) return 'text-green-600';
    if (count <= 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const averageValue = stats?.average || 0;
  const countValue = stats?.count || 0;
  const timeInTargetValue = stats?.timeInTargetPct || 0;
  const alertValue = stats?.alertCount || 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Média de Glicemia"
        value={averageValue > 0 ? `${averageValue} mg/dL` : '--'}
        description="Últimos 7 dias"
        icon={Activity}
        colorClass={getAverageColor(averageValue)}
        loading={loading}
      />
      <StatCard
        title="Leituras Hoje"
        value={countValue.toString()}
        description={countValue === 1 ? 'Medição registrada' : 'Medições registradas'}
        icon={Calendar}
        colorClass="text-primary"
        loading={loading}
      />
      <StatCard
        title="Tempo no Alvo"
        value={timeInTargetValue > 0 ? `${timeInTargetValue}%` : '--'}
        description="Últimos 7 dias"
        icon={Target}
        colorClass={getTimeInTargetColor(timeInTargetValue)}
        loading={loading}
      />
      <StatCard
        title="Alertas"
        value={alertValue.toString()}
        description="Últimas 24 horas"
        icon={AlertCircle}
        colorClass={getAlertColor(alertValue)}
        loading={loading}
      />
    </div>
  );
}
