/**
 * Reports Page
 * Allows users to generate and export glucose monitoring reports
 */

'use client';

import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText } from 'lucide-react';
import { ReportFilters } from '@/components/features/reports/report-filters';
import { ReportSummary } from '@/components/features/reports/report-summary';
import { ReportTable } from '@/components/features/reports/report-table';
import { useReportData } from '@/hooks/use-report-data';
import { exportReadingsAsCsv } from '@/lib/utils/export-csv';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get profile_id from URL or use null
  const profileId = searchParams.get('profile_id');

  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);

  const { readings, stats, loading, error } = useReportData({
    profileId,
    startDate,
    endDate,
  });

  const handleFilterChange = (newStartDate: string, newEndDate: string) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleExport = () => {
    if (readings.length === 0) {
      return;
    }

    // Generate filename with date range
    const startDateStr = startDate
      ? new Date(startDate).toISOString().split('T')[0]
      : 'inicio';
    const endDateStr = endDate
      ? new Date(endDate).toISOString().split('T')[0]
      : 'fim';
    const filename = `relatorio-glicemia-${startDateStr}-${endDateStr}.csv`;

    exportReadingsAsCsv(readings, filename);
  };

  // Check if profile_id is missing
  if (!profileId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios detalhados do seu monitoramento
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum perfil selecionado. Por favor, selecione um perfil no dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Relatórios
        </h1>
        <p className="text-muted-foreground">
          Visualize estatísticas e exporte suas leituras de glicemia
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <ReportFilters
        onFilterChange={handleFilterChange}
        onExport={handleExport}
        disabled={loading}
        hasData={readings.length > 0}
      />

      {/* Results Grid */}
      {(loading || stats || readings.length > 0) && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Summary - 1 column on large screens */}
          <div className="lg:col-span-1">
            <ReportSummary stats={stats} loading={loading} />
          </div>

          {/* Table - 2 columns on large screens */}
          <div className="lg:col-span-2">
            <ReportTable readings={readings} loading={loading} />
          </div>
        </div>
      )}

      {/* Empty State - only show if not loading and no data */}
      {!loading && !stats && readings.length === 0 && startDate && endDate && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Selecione um período e clique em &quot;Gerar Relatório&quot; para visualizar os dados.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
