/**
 * Chart filters component - date range and context filters
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import type { GlucoseContext } from '@/types/database';

export interface ChartFiltersProps {
  onFiltersChange: (filters: {
    startDate?: string;
    endDate?: string;
    context?: GlucoseContext;
  }) => void;
}

type DateRange = '7d' | '14d' | '30d' | '90d';

const CONTEXT_LABELS: Record<string, string> = {
  all: 'Todos os contextos',
  fasting: 'Jejum',
  pre_meal: 'Pré-refeição',
  post_meal: 'Pós-refeição',
  bedtime: 'Antes de dormir',
  night: 'Durante a noite',
  exercise: 'Exercício',
  sick: 'Doente',
  stress: 'Estresse',
  other: 'Outro',
};

export function ChartFilters({ onFiltersChange }: ChartFiltersProps) {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [context, setContext] = useState<string>('all');

  const handleDateRangeChange = (value: DateRange) => {
    setDateRange(value);
    applyFilters(value, context);
  };

  const handleContextChange = (value: string) => {
    setContext(value);
    applyFilters(dateRange, value);
  };

  const applyFilters = (range: DateRange, ctx: string) => {
    const now = new Date();
    const endDate = now.toISOString();

    let startDate: string;
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '14d':
        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
        break;
    }

    onFiltersChange({
      startDate,
      endDate,
      context: ctx === 'all' ? undefined : (ctx as GlucoseContext),
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Período
            </label>
            <Select value={dateRange} onValueChange={handleDateRangeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="14d">Últimos 14 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Contexto
            </label>
            <Select value={context} onValueChange={handleContextChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CONTEXT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
