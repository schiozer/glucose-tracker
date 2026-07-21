/**
 * Report Summary Component
 * Displays statistics summary for the report period
 */

'use client';

import {
  Activity,
  TrendingDown,
  TrendingUp,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import type { ReadingStats } from '@/app/api/readings/stats/route';

interface ReportSummaryProps {
  stats: ReadingStats | null;
  loading: boolean;
}

function StatItem({
  label,
  value,
  icon: Icon,
  colorClass = 'text-foreground',
  loading,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass?: string;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <Skeleton className="h-6 w-20" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className={`text-lg font-semibold ${colorClass}`}>{value}</span>
    </div>
  );
}

export function ReportSummary({ stats, loading }: ReportSummaryProps) {
  if (!loading && !stats) {
    return null;
  }

  // Extract values
  const average = stats?.statistics?.average || 0;
  const min = stats?.statistics?.min || 0;
  const max = stats?.statistics?.max || 0;
  const stdDev = stats?.statistics?.stdDev || 0;
  const count = stats?.statistics?.count || 0;
  const inTargetPct = stats?.timeInRange?.inTargetPct || 0;
  const belowTargetPct = stats?.timeInRange?.belowTargetPct || 0;
  const aboveTargetPct = stats?.timeInRange?.aboveTargetPct || 0;

  // Determine color classes
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo Estatístico</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Basic Statistics */}
        <div className="space-y-3">
          <StatItem
            label="Média"
            value={average > 0 ? `${average} mg/dL` : '--'}
            icon={Activity}
            colorClass={getAverageColor(average)}
            loading={loading}
          />
          <StatItem
            label="Valor Mínimo"
            value={min > 0 ? `${min} mg/dL` : '--'}
            icon={TrendingDown}
            colorClass={min < 70 ? 'text-red-600' : 'text-foreground'}
            loading={loading}
          />
          <StatItem
            label="Valor Máximo"
            value={max > 0 ? `${max} mg/dL` : '--'}
            icon={TrendingUp}
            colorClass={max > 180 ? 'text-orange-600' : 'text-foreground'}
            loading={loading}
          />
          <StatItem
            label="Desvio Padrão"
            value={stdDev > 0 ? `${stdDev} mg/dL` : '--'}
            icon={BarChart3}
            loading={loading}
          />
          <StatItem
            label="Total de Leituras"
            value={count.toString()}
            icon={Activity}
            loading={loading}
          />
        </div>

        <Separator />

        {/* Time in Range Statistics */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            Tempo em Faixa
          </h4>
          <StatItem
            label="No Alvo"
            value={inTargetPct > 0 ? `${inTargetPct}%` : '--'}
            icon={CheckCircle2}
            colorClass={getTimeInTargetColor(inTargetPct)}
            loading={loading}
          />
          <StatItem
            label="Abaixo do Alvo"
            value={belowTargetPct > 0 ? `${belowTargetPct}%` : '--'}
            icon={TrendingDown}
            colorClass={belowTargetPct > 15 ? 'text-red-600' : 'text-muted-foreground'}
            loading={loading}
          />
          <StatItem
            label="Acima do Alvo"
            value={aboveTargetPct > 0 ? `${aboveTargetPct}%` : '--'}
            icon={TrendingUp}
            colorClass={aboveTargetPct > 25 ? 'text-orange-600' : 'text-muted-foreground'}
            loading={loading}
          />
        </div>

        {/* Period Info */}
        {!loading && stats?.period && (
          <>
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              {stats.period.start_date && (
                <div>
                  Período: {new Date(stats.period.start_date).toLocaleDateString('pt-BR')} até{' '}
                  {stats.period.end_date
                    ? new Date(stats.period.end_date).toLocaleDateString('pt-BR')
                    : 'hoje'}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
