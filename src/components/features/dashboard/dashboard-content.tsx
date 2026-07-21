/**
 * Dashboard Content Component
 * Client component that fetches and displays dashboard data
 */

'use client';

import { StatsCards } from './stats-cards';
import { RecentReadings } from './recent-readings';
import { QuickActions } from './quick-actions';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface DashboardContentProps {
  profileId: string;
}

export function DashboardContent({ profileId }: DashboardContentProps) {
  const { readings, stats, loading, error } = useDashboardData(profileId);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar dados</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <StatsCards stats={stats} loading={loading} />
      <RecentReadings readings={readings} loading={loading} />
      <QuickActions />
    </div>
  );
}
