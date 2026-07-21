/**
 * Charts page - visualize glucose readings with interactive charts
 */

'use client';

import { useState, useEffect } from 'react';
import { useChartData } from '@/hooks/use-chart-data';
import type { UseChartDataFilters } from '@/hooks/use-chart-data';
import { ChartFilters } from '@/components/features/charts/chart-filters';
import { GlucoseLineChart } from '@/components/features/charts/glucose-line-chart';
import { GlucoseDistributionChart } from '@/components/features/charts/glucose-distribution-chart';
import { TimeInRangeChart } from '@/components/features/charts/time-in-range-chart';
import { Alert } from '@/components/ui/alert';

export default function ChartsPage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [filters, setFilters] = useState<UseChartDataFilters>({
    // Default to last 30 days
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  });

  const { readings, stats, loading, error } = useChartData(profileId, filters);

  // Fetch profile ID on mount
  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch('/api/profiles');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            setProfileId(data.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    }

    fetchProfile();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gráficos</h1>
        <p className="text-muted-foreground">
          Visualize suas medições em gráficos interativos
        </p>
      </div>

      {/* Filters */}
      <ChartFilters onFiltersChange={setFilters} />

      {/* Error Message */}
      {error && (
        <Alert className="bg-red-50 border-red-200 text-red-800">
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="h-[500px] bg-gray-100 animate-pulse rounded-lg" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-[400px] bg-gray-100 animate-pulse rounded-lg" />
            <div className="h-[400px] bg-gray-100 animate-pulse rounded-lg" />
          </div>
        </div>
      )}

      {/* Charts */}
      {!loading && (
        <>
          {/* Main Line Chart */}
          <GlucoseLineChart readings={readings} />

          {/* Distribution and Time in Range Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlucoseDistributionChart stats={stats} />
            <TimeInRangeChart stats={stats} />
          </div>
        </>
      )}
    </div>
  );
}
