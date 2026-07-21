/**
 * Report Filters Component
 * Allows users to select date range for report generation
 */

'use client';

import { useState } from 'react';
import { Calendar, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ReportFiltersProps {
  onFilterChange: (startDate: string, endDate: string) => void;
  onExport: () => void;
  disabled?: boolean;
  hasData?: boolean;
}

/**
 * Get default date range (last 30 days)
 */
function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  // Format as YYYY-MM-DD for input[type="date"]
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

export function ReportFilters({
  onFilterChange,
  onExport,
  disabled = false,
  hasData = false,
}: ReportFiltersProps) {
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState(defaultRange.start);
  const [endDate, setEndDate] = useState(defaultRange.end);

  const handleApplyFilters = () => {
    if (startDate && endDate) {
      // Convert to ISO timestamps for API
      const startISO = new Date(startDate + 'T00:00:00').toISOString();
      const endISO = new Date(endDate + 'T23:59:59').toISOString();
      onFilterChange(startISO, endISO);
    }
  };

  // Apply filters on mount
  useState(() => {
    handleApplyFilters();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Período do Relatório
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="start-date">Data Inicial</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={disabled}
                max={endDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Data Final</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={disabled}
                min={startDate}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={handleApplyFilters}
              disabled={disabled || !startDate || !endDate}
              className="flex-1 sm:flex-none"
            >
              Gerar Relatório
            </Button>
            <Button
              onClick={onExport}
              disabled={disabled || !hasData}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
