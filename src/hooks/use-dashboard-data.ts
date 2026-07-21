/**
 * Custom hook for fetching dashboard data
 * Fetches glucose readings and statistics for the dashboard
 */

'use client';

import { useState, useEffect } from 'react';
import type { GlucoseReading } from '@/types/database';
import type { PaginatedResponse } from '@/types/api';

export interface DashboardStats {
  average: number;
  count: number;
  timeInTargetPct: number;
  alertCount: number;
}

interface UseDashboardDataResult {
  readings: GlucoseReading[];
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
}

/**
 * Fetch dashboard data for a profile
 */
export function useDashboardData(profileId: string | null): UseDashboardDataResult {
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Calculate date range for "today"
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Fetch recent readings (last 5)
        const readingsResponse = await fetch(
          `/api/readings?profile_id=${profileId}&page=1&page_size=5`
        );

        if (!readingsResponse.ok) {
          throw new Error('Erro ao buscar leituras');
        }

        const readingsData: PaginatedResponse<GlucoseReading> =
          await readingsResponse.json();

        // Fetch statistics for last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const statsResponse = await fetch(
          `/api/readings/stats?profile_id=${profileId}&start_date=${sevenDaysAgo.toISOString()}`
        );

        if (!statsResponse.ok) {
          throw new Error('Erro ao buscar estatísticas');
        }

        const statsData = await statsResponse.json();

        // Fetch today's readings for count
        const todayResponse = await fetch(
          `/api/readings?profile_id=${profileId}&start_date=${today.toISOString()}&end_date=${tomorrow.toISOString()}&page_size=100`
        );

        if (!todayResponse.ok) {
          throw new Error('Erro ao buscar leituras de hoje');
        }

        const todayData: PaginatedResponse<GlucoseReading> =
          await todayResponse.json();

        // Fetch last 24h readings for alert count
        const yesterday = new Date();
        yesterday.setHours(yesterday.getHours() - 24);

        const alertsResponse = await fetch(
          `/api/readings?profile_id=${profileId}&start_date=${yesterday.toISOString()}&page_size=100`
        );

        if (!alertsResponse.ok) {
          throw new Error('Erro ao buscar alertas');
        }

        const alertsData: PaginatedResponse<GlucoseReading> =
          await alertsResponse.json();

        // Count high/low readings (simple threshold: <70 or >180)
        const alertCount = alertsData.data.filter(
          (r) => r.value < 70 || r.value > 180
        ).length;

        setReadings(readingsData.data);
        setStats({
          average: statsData.data?.statistics?.average || 0,
          count: todayData.pagination?.total_items || 0,
          timeInTargetPct: statsData.data?.timeInRange?.inTargetPct || 0,
          alertCount,
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar dados'
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [profileId]);

  return { readings, stats, loading, error };
}
