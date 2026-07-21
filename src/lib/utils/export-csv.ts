/**
 * CSV Export Utility
 * Provides functions to export data to CSV format
 */

import type { GlucoseReading, GlucoseContext, ReadingSource } from '@/types/database';
import { formatDate, formatTime } from '@/lib/utils/calculations';

/**
 * Context label mapping (Portuguese)
 */
const CONTEXT_LABELS: Record<GlucoseContext, string> = {
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

/**
 * Source label mapping (Portuguese)
 */
const SOURCE_LABELS: Record<ReadingSource, string> = {
  manual: 'Manual',
  glucometer: 'Glicosímetro',
  cgm: 'CGM',
  import: 'Importação',
};

/**
 * Get context label in Portuguese
 */
export function getContextLabel(context: GlucoseContext): string {
  return CONTEXT_LABELS[context];
}

/**
 * Get source label in Portuguese
 */
export function getSourceLabel(source: ReadingSource): string {
  return SOURCE_LABELS[source];
}

/**
 * Escape CSV field value
 * Wraps in quotes if contains comma, quote, or newline
 */
function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert glucose readings to CSV format
 *
 * Format:
 * Data,Hora,Valor (mg/dL),Contexto,Fonte,Notas
 * DD/MM/YYYY,HH:MM,value,context_label,source_label,notes
 */
export function readingsToCsv(readings: GlucoseReading[]): string {
  // CSV header
  const header = 'Data,Hora,Valor (mg/dL),Contexto,Fonte,Notas';

  // CSV rows
  const rows = readings.map((reading) => {
    const date = formatDate(reading.reading_date);
    const time = formatTime(reading.reading_date);
    const value = reading.value;
    const context = getContextLabel(reading.context);
    const source = getSourceLabel(reading.source);
    const notes = reading.notes || '';

    return [
      escapeCsvField(date),
      escapeCsvField(time),
      escapeCsvField(value),
      escapeCsvField(context),
      escapeCsvField(source),
      escapeCsvField(notes),
    ].join(',');
  });

  return [header, ...rows].join('\n');
}

/**
 * Trigger CSV file download in browser
 */
export function downloadCsv(csvContent: string, filename: string): void {
  // Add BOM for proper UTF-8 encoding in Excel
  const BOM = '﻿';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
}

/**
 * Export glucose readings as CSV
 *
 * @param readings - Array of glucose readings to export
 * @param filename - Optional filename (defaults to "relatorio-glicemia-YYYY-MM-DD.csv")
 */
export function exportReadingsAsCsv(
  readings: GlucoseReading[],
  filename?: string
): void {
  const csvContent = readingsToCsv(readings);
  const defaultFilename = `relatorio-glicemia-${new Date().toISOString().split('T')[0]}.csv`;
  downloadCsv(csvContent, filename || defaultFilename);
}
