/**
 * Glucose statistics and formatting utilities
 *
 * Provides functions for:
 * - Determining glucose level classification (low/target/high)
 * - Calculating statistical metrics (average, std dev, time in range)
 * - Formatting glucose values and dates for display
 */

import type { GlucoseReading, GlucoseThreshold, GlucoseContext } from '@/types/database';

// ============================================================================
// Glucose Level Classification
// ============================================================================

export type GlucoseLevel = 'low' | 'target' | 'high' | 'borderline';

/**
 * Determine glucose level classification based on value and threshold
 *
 * Classification:
 * - 'low': value < low threshold (hypoglycemia)
 * - 'target': value between target_min and target_max (optimal range)
 * - 'high': value > high threshold (hyperglycemia)
 * - 'borderline': value in transition zones (between low and target_min, or between target_max and high)
 *
 * @param value - Glucose value in mg/dL
 * @param threshold - Threshold configuration
 * @returns Glucose level classification
 */
export function determineGlucoseLevel(
  value: number,
  threshold: Pick<GlucoseThreshold, 'low' | 'target_min' | 'target_max' | 'high'>
): GlucoseLevel {
  if (value < threshold.low) {
    return 'low';
  }
  if (value >= threshold.target_min && value <= threshold.target_max) {
    return 'target';
  }
  if (value > threshold.high) {
    return 'high';
  }
  return 'borderline'; // Between low and target_min, or between target_max and high
}

// ============================================================================
// Statistical Calculations
// ============================================================================

export interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  stdDev: number;
  count: number;
  timeInTargetPct: number;
  timeBelowTargetPct: number;
  timeAboveTargetPct: number;
  timeBorderlinePct: number;
}

/**
 * Calculate comprehensive statistics for glucose readings
 *
 * Computes:
 * - Average glucose value
 * - Minimum and maximum values
 * - Standard deviation (measure of variability)
 * - Time in range percentages (low/target/high/borderline)
 *
 * Time in range is calculated by classifying each reading and computing percentages.
 * Requires threshold information for each reading's context.
 *
 * @param readings - Array of glucose readings
 * @param thresholdGetter - Function to get threshold for a reading's context
 * @returns Statistical summary
 */
export function calculateStats(
  readings: GlucoseReading[],
  thresholdGetter: (
    context: GlucoseContext
  ) => Pick<GlucoseThreshold, 'low' | 'target_min' | 'target_max' | 'high'>
): GlucoseStats {
  if (readings.length === 0) {
    return {
      average: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      count: 0,
      timeInTargetPct: 0,
      timeBelowTargetPct: 0,
      timeAboveTargetPct: 0,
      timeBorderlinePct: 0,
    };
  }

  // Basic statistics
  const values = readings.map((r) => r.value);
  const sum = values.reduce((acc, v) => acc + v, 0);
  const average = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Standard deviation
  const squaredDiffs = values.map((v) => Math.pow(v - average, 2));
  const variance = squaredDiffs.reduce((acc, v) => acc + v, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  // Time in range calculation
  let inTarget = 0;
  let belowTarget = 0;
  let aboveTarget = 0;
  let borderline = 0;

  readings.forEach((reading) => {
    const threshold = thresholdGetter(reading.context);
    const level = determineGlucoseLevel(reading.value, threshold);

    switch (level) {
      case 'target':
        inTarget++;
        break;
      case 'low':
        belowTarget++;
        break;
      case 'high':
        aboveTarget++;
        break;
      case 'borderline':
        borderline++;
        break;
    }
  });

  const total = readings.length;

  return {
    average: Math.round(average),
    min,
    max,
    stdDev: Math.round(stdDev),
    count: total,
    timeInTargetPct: Math.round((inTarget / total) * 100),
    timeBelowTargetPct: Math.round((belowTarget / total) * 100),
    timeAboveTargetPct: Math.round((aboveTarget / total) * 100),
    timeBorderlinePct: Math.round((borderline / total) * 100),
  };
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/**
 * Format glucose value for display
 *
 * @param value - Glucose value in mg/dL
 * @returns Formatted string (e.g., "120 mg/dL")
 */
export function formatGlucoseValue(value: number): string {
  return `${value} mg/dL`;
}

/**
 * Format date for display (Brazilian format)
 *
 * @param dateString - ISO 8601 date string
 * @returns Formatted date (DD/MM/YYYY)
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Format date and time for display (Brazilian format)
 *
 * @param dateString - ISO 8601 timestamp string
 * @returns Formatted date and time (DD/MM/YYYY HH:MM)
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format time for display (Brazilian format)
 *
 * @param dateString - ISO 8601 timestamp string
 * @returns Formatted time (HH:MM)
 */
export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format relative time (e.g., "2 hours ago", "hoje às 14:30")
 *
 * @param dateString - ISO 8601 timestamp string
 * @returns Human-readable relative time
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return 'agora mesmo';
  }
  if (diffMins < 60) {
    return `há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
  }
  if (diffHours < 24) {
    return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
  }
  if (diffDays === 1) {
    return `ontem às ${formatTime(dateString)}`;
  }
  if (diffDays < 7) {
    return `há ${diffDays} dias`;
  }

  return formatDate(dateString);
}

/**
 * Get color class for glucose level (Tailwind CSS)
 *
 * @param level - Glucose level classification
 * @returns Tailwind color class name
 */
export function getGlucoseLevelColor(level: GlucoseLevel): string {
  switch (level) {
    case 'low':
      return 'text-red-600';
    case 'target':
      return 'text-green-600';
    case 'high':
      return 'text-orange-600';
    case 'borderline':
      return 'text-yellow-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Get background color class for glucose level (Tailwind CSS)
 *
 * @param level - Glucose level classification
 * @returns Tailwind background color class name
 */
export function getGlucoseLevelBgColor(level: GlucoseLevel): string {
  switch (level) {
    case 'low':
      return 'bg-red-100';
    case 'target':
      return 'bg-green-100';
    case 'high':
      return 'bg-orange-100';
    case 'borderline':
      return 'bg-yellow-100';
    default:
      return 'bg-gray-100';
  }
}

/**
 * Get human-readable label for glucose level (Portuguese)
 *
 * @param level - Glucose level classification
 * @returns Portuguese label
 */
export function getGlucoseLevelLabel(level: GlucoseLevel): string {
  switch (level) {
    case 'low':
      return 'Baixa (Hipoglicemia)';
    case 'target':
      return 'No Alvo';
    case 'high':
      return 'Alta (Hiperglicemia)';
    case 'borderline':
      return 'Limítrofe';
    default:
      return 'Desconhecido';
  }
}
