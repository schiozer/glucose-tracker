/**
 * Custom hook for fetching and managing chart data
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GlucoseReading, GlucoseContext } from '@/types/database';
import type { ReadingStats } from '@/app/api/readings/stats/route';

export interface UseChartDataFilters {
  context?: GlucoseContext;
  startDate?: string;
  endDate?: string;
}

interface UseChartDataResult {
  readings: GlucoseReading[];
  stats: ReadingStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook to fetch chart data (readings + stats) for a profile
 */
export function useChartData(
  profileId: string | null,
  filters: UseChartDataFilters = {}
): UseChartDataResult {
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams({
        profile_id: profileId,
        page_size: '1000', // Fetch more for charts
      });

      if (filters.context) {
        params.append('context', filters.context);
      }
      if (filters.startDate) {
        params.append('start_date', filters.startDate);
      }
      if (filters.endDate) {
        params.append('end_date', filters.endDate);
      }

      // Fetch readings and stats in parallel
      const [readingsResponse, statsResponse] = await Promise.all([
        fetch(`/api/readings?${params.toString()}`),
        fetch(`/api/readings/stats?${params.toString()}`),
      ]);

      if (!readingsResponse.ok || !statsResponse.ok) {
        throw new Error('Erro ao buscar dados dos gráficos');
      }

      const [readingsData, statsData] = await Promise.all([
        readingsResponse.json(),
        statsResponse.json(),
      ]);

      if (!readingsData.success || !statsData.success) {
        throw new Error('Erro ao processar dados dos gráficos');
      }

      setReadings(readingsData.data);
      setStats(statsData.data);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar dados dos gráficos'
      );
    } finally {
      setLoading(false);
    }
  }, [profileId, filters.context, filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refresh = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    readings,
    stats,
    loading,
    error,
    refresh,
  };
}
