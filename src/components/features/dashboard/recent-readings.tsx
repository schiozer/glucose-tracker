/**
 * Recent Readings Component
 * Displays the most recent glucose readings
 */

'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { GlucoseReading } from '@/types/database';
import {
  determineGlucoseLevel,
  formatDateTime,
  getGlucoseLevelColor,
  getGlucoseLevelBgColor,
} from '@/lib/utils/calculations';
import { getContextLabel } from '@/lib/utils/context-labels';
import { DEFAULT_THRESHOLDS } from '@/lib/supabase/queries';

interface RecentReadingsProps {
  readings: GlucoseReading[];
  loading: boolean;
}

function ReadingSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-8 w-24" />
    </div>
  );
}

export function RecentReadings({ readings, loading }: RecentReadingsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Suas últimas medições de glicemia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <ReadingSkeleton key={i} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (readings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Suas últimas medições de glicemia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Nenhuma medição registrada ainda.
            </p>
            <Button asChild>
              <Link href="/readings?action=new">Registrar primeira medição</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Atividade Recente</CardTitle>
          <CardDescription>Suas últimas medições de glicemia</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/readings">
            Ver todas
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {readings.map((reading) => {
            const threshold = DEFAULT_THRESHOLDS[reading.context];
            const level = determineGlucoseLevel(reading.value, threshold);
            const colorClass = getGlucoseLevelColor(level);
            const bgColorClass = getGlucoseLevelBgColor(level);

            return (
              <div
                key={reading.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-lg font-semibold ${colorClass}`}>
                      {reading.value} mg/dL
                    </span>
                    <Badge variant="outline" className={bgColorClass}>
                      {getContextLabel(reading.context)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(reading.reading_date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
