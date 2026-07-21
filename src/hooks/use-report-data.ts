/**
 * Custom hook for fetching report data
 * Fetches glucose readings and statistics for report generation
 */

'use client';

import { useState, useEffect } from 'react';
import type { GlucoseReading } from '@/types/database';
import type { PaginatedResponse, ApiResponse } from '@/types/api';
import type { ReadingStats } from '@/app/api/readings/stats/route';

interface UseReportDataParams {
  profileId: string | null;
  startDate: string | null;
  endDate: string | null;
}

interface UseReportDataResult {
  readings: GlucoseReading[];
  stats: ReadingStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch report data (readings + statistics) for a given date range
 */
export function useReportData({
  profileId,
  startDate,
  endDate,
}: UseReportDataParams): UseReportDataResult {
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [stats, setStats] = useState<ReadingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!profileId || !startDate || !endDate) {
      setReadings([]);
      setStats(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Validate date range
      if (new Date(startDate) > new Date(endDate)) {
        throw new Error('Data inicial deve ser anterior ou igual à data final');
      }

      // Fetch all readings for the period (paginated with high limit)
      // For very large datasets, consider implementing true pagination
      const readingsResponse = await fetch(
        `/api/readings?profile_id=${profileId}&start_date=${startDate}&end_date=${endDate}&page=1&page_size=1000`
      );

      if (!readingsResponse.ok) {
        throw new Error('Erro ao buscar leituras');
      }

      const readingsData: PaginatedResponse<GlucoseReading> =
        await readingsResponse.json();

      // Fetch statistics for the same period
      const statsResponse = await fetch(
        `/api/readings/stats?profile_id=${profileId}&start_date=${startDate}&end_date=${endDate}`
      );

      if (!statsResponse.ok) {
        throw new Error('Erro ao buscar estatísticas');
      }

      const statsData: ApiResponse<ReadingStats> = await statsResponse.json();

      if (!statsData.success || !statsData.data) {
        throw new Error('Erro ao processar estatísticas');
      }

      setReadings(readingsData.data);
      setStats(statsData.data);
    } catch (err) {
      console.error('Error fetching report data:', err);
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar dados do relatório'
      );
      setReadings([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, startDate, endDate]);

  return {
    readings,
    stats,
    loading,
    error,
    refetch: fetchData,
  };
}
