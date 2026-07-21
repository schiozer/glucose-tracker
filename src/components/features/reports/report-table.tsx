/**
 * Report Table Component
 * Displays all readings in a table format
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { formatDate, formatTime, determineGlucoseLevel } from '@/lib/utils/calculations';
import { getContextLabel, getSourceLabel } from '@/lib/utils/export-csv';
import { DEFAULT_THRESHOLDS } from '@/lib/supabase/queries';
import type { GlucoseReading } from '@/types/database';
import type { GlucoseLevel } from '@/lib/utils/calculations';

interface ReportTableProps {
  readings: GlucoseReading[];
  loading: boolean;
}

/**
 * Get badge variant for glucose level
 */
function getLevelBadgeVariant(level: GlucoseLevel): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level) {
    case 'target':
      return 'default'; // Green in most themes
    case 'low':
      return 'destructive'; // Red
    case 'high':
      return 'secondary'; // Orange/yellow
    case 'unknown':
      return 'outline'; // Gray
    default:
      return 'outline';
  }
}

/**
 * Get level label in Portuguese
 */
function getLevelLabel(level: GlucoseLevel): string {
  switch (level) {
    case 'target':
      return 'Alvo';
    case 'low':
      return 'Baixa';
    case 'high':
      return 'Alta';
    case 'unknown':
      return 'Transição';
    default:
      return 'Desconhecido';
  }
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      ))}
    </div>
  );
}

export function ReportTable({ readings, loading }: ReportTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leituras Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (readings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leituras Detalhadas</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Nenhuma leitura encontrada para o período selecionado.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Leituras Detalhadas ({readings.length} {readings.length === 1 ? 'registro' : 'registros'})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Data
                </th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Hora
                </th>
                <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                  Valor
                </th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Contexto
                </th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Fonte
                </th>
                <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                  Notas
                </th>
              </tr>
            </thead>
            <tbody>
              {readings.map((reading) => {
                const threshold = DEFAULT_THRESHOLDS[reading.context];
                const level = determineGlucoseLevel(reading.value, threshold);

                return (
                  <tr key={reading.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">{formatDate(reading.reading_date)}</td>
                    <td className="py-3 px-2">{formatTime(reading.reading_date)}</td>
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-semibold">{reading.value} mg/dL</span>
                        <Badge variant={getLevelBadgeVariant(level)} className="text-xs">
                          {getLevelLabel(level)}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-3 px-2">{getContextLabel(reading.context)}</td>
                    <td className="py-3 px-2 text-muted-foreground">
                      {getSourceLabel(reading.source)}
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-xs max-w-xs truncate">
                      {reading.notes || '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-3">
          {readings.map((reading) => {
            const threshold = DEFAULT_THRESHOLDS[reading.context];
            const level = determineGlucoseLevel(reading.value, threshold);

            return (
              <div
                key={reading.id}
                className="p-3 border rounded-lg space-y-2 bg-card hover:bg-muted/50"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">
                      {formatDate(reading.reading_date)} às {formatTime(reading.reading_date)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getContextLabel(reading.context)}
                    </div>
                  </div>
                  <Badge variant={getLevelBadgeVariant(level)}>
                    {getLevelLabel(level)}
                  </Badge>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{reading.value}</span>
                  <span className="text-sm text-muted-foreground">mg/dL</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Fonte: {getSourceLabel(reading.source)}</span>
                </div>
                {reading.notes && (
                  <div className="text-sm text-muted-foreground pt-2 border-t">
                    {reading.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
