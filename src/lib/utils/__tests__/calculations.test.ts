/**
 * Unit tests for glucose calculations and formatting utilities
 */

import { describe, it, expect } from 'vitest';
import {
  determineGlucoseLevel,
  calculateStats,
  formatGlucoseValue,
  formatDate,
  formatDateTime,
  formatTime,
  type GlucoseLevel,
} from '../calculations';
import type { GlucoseReading, GlucoseThreshold, GlucoseContext } from '@/types/database';

describe('determineGlucoseLevel', () => {
  const threshold = {
    low: 70,
    target_min: 80,
    target_max: 140,
    high: 180,
  };

  it('deve retornar "low" para valores abaixo do limite de hipoglicemia', () => {
    expect(determineGlucoseLevel(50, threshold)).toBe('low');
    expect(determineGlucoseLevel(69, threshold)).toBe('low');
  });

  it('deve retornar "target" para valores dentro da faixa alvo', () => {
    expect(determineGlucoseLevel(80, threshold)).toBe('target');
    expect(determineGlucoseLevel(100, threshold)).toBe('target');
    expect(determineGlucoseLevel(140, threshold)).toBe('target');
  });

  it('deve retornar "high" para valores acima do limite de hiperglicemia', () => {
    expect(determineGlucoseLevel(181, threshold)).toBe('high');
    expect(determineGlucoseLevel(250, threshold)).toBe('high');
  });

  it('deve retornar "unknown" para valores entre low e target_min', () => {
    expect(determineGlucoseLevel(70, threshold)).toBe('unknown');
    expect(determineGlucoseLevel(75, threshold)).toBe('unknown');
    expect(determineGlucoseLevel(79, threshold)).toBe('unknown');
  });

  it('deve retornar "unknown" para valores entre target_max e high', () => {
    expect(determineGlucoseLevel(141, threshold)).toBe('unknown');
    expect(determineGlucoseLevel(160, threshold)).toBe('unknown');
    expect(determineGlucoseLevel(180, threshold)).toBe('unknown');
  });

  it('deve lidar com valores nos limites exatos', () => {
    expect(determineGlucoseLevel(70, threshold)).toBe('unknown'); // exactly low
    expect(determineGlucoseLevel(80, threshold)).toBe('target'); // exactly target_min
    expect(determineGlucoseLevel(140, threshold)).toBe('target'); // exactly target_max
    expect(determineGlucoseLevel(180, threshold)).toBe('unknown'); // exactly high
  });
});

describe('calculateStats', () => {
  const threshold = {
    low: 70,
    target_min: 80,
    target_max: 140,
    high: 180,
  };

  const thresholdGetter = () => threshold;

  it('deve retornar estatísticas zeradas para array vazio', () => {
    const stats = calculateStats([], thresholdGetter);
    expect(stats).toEqual({
      average: 0,
      min: 0,
      max: 0,
      stdDev: 0,
      count: 0,
      timeInTargetPct: 0,
      timeBelowTargetPct: 0,
      timeAboveTargetPct: 0,
      timeUnknownPct: 0,
    });
  });

  it('deve calcular média, min, max corretamente', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 100,
        reading_date: '2024-01-01T10:00:00Z',
        context: 'fasting' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      },
      {
        id: '2',
        profile_id: 'profile1',
        value: 120,
        reading_date: '2024-01-01T12:00:00Z',
        context: 'pre_meal' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      },
      {
        id: '3',
        profile_id: 'profile1',
        value: 80,
        reading_date: '2024-01-01T14:00:00Z',
        context: 'post_meal' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T14:00:00Z',
        updated_at: '2024-01-01T14:00:00Z',
      },
    ];

    const stats = calculateStats(readings, thresholdGetter);
    expect(stats.average).toBe(100); // (100 + 120 + 80) / 3 = 100
    expect(stats.min).toBe(80);
    expect(stats.max).toBe(120);
    expect(stats.count).toBe(3);
  });

  it('deve calcular desvio padrão corretamente', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 90,
        reading_date: '2024-01-01T10:00:00Z',
        context: 'fasting' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      },
      {
        id: '2',
        profile_id: 'profile1',
        value: 100,
        reading_date: '2024-01-01T12:00:00Z',
        context: 'pre_meal' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      },
      {
        id: '3',
        profile_id: 'profile1',
        value: 110,
        reading_date: '2024-01-01T14:00:00Z',
        context: 'post_meal' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T14:00:00Z',
        updated_at: '2024-01-01T14:00:00Z',
      },
    ];

    const stats = calculateStats(readings, thresholdGetter);
    // mean = 100, variance = ((10^2 + 0^2 + 10^2) / 3) = 66.67, stdDev = 8.16 -> rounded to 8
    expect(stats.stdDev).toBeGreaterThan(0);
    expect(stats.stdDev).toBeLessThan(10);
  });

  it('deve calcular time in range percentages corretamente', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 60, // low
        reading_date: '2024-01-01T10:00:00Z',
        context: 'fasting' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      },
      {
        id: '2',
        profile_id: 'profile1',
        value: 100, // target
        reading_date: '2024-01-01T12:00:00Z',
        context: 'pre_meal' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      },
      {
        id: '3',
        profile_id: 'profile1',
        value: 120, // target
        reading_date: '2024-01-01T14:00:00Z',
        context: 'post_meal' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T14:00:00Z',
        updated_at: '2024-01-01T14:00:00Z',
      },
      {
        id: '4',
        profile_id: 'profile1',
        value: 200, // high
        reading_date: '2024-01-01T16:00:00Z',
        context: 'post_meal' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T16:00:00Z',
        updated_at: '2024-01-01T16:00:00Z',
      },
      {
        id: '5',
        profile_id: 'profile1',
        value: 75, // unknown (between low and target_min)
        reading_date: '2024-01-01T18:00:00Z',
        context: 'bedtime' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T18:00:00Z',
        updated_at: '2024-01-01T18:00:00Z',
      },
    ];

    const stats = calculateStats(readings, thresholdGetter);
    expect(stats.count).toBe(5);
    expect(stats.timeBelowTargetPct).toBe(20); // 1/5 = 20%
    expect(stats.timeInTargetPct).toBe(40); // 2/5 = 40%
    expect(stats.timeAboveTargetPct).toBe(20); // 1/5 = 20%
    expect(stats.timeUnknownPct).toBe(20); // 1/5 = 20%
  });

  it('deve lidar com uma única leitura', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 100,
        reading_date: '2024-01-01T10:00:00Z',
        context: 'fasting' as GlucoseContext,
        source: 'manual' as const,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      },
    ];

    const stats = calculateStats(readings, thresholdGetter);
    expect(stats.average).toBe(100);
    expect(stats.min).toBe(100);
    expect(stats.max).toBe(100);
    expect(stats.stdDev).toBe(0);
    expect(stats.count).toBe(1);
    expect(stats.timeInTargetPct).toBe(100);
  });
});

describe('formatGlucoseValue', () => {
  it('deve formatar valor de glicose com unidade mg/dL', () => {
    expect(formatGlucoseValue(100)).toBe('100 mg/dL');
    expect(formatGlucoseValue(85)).toBe('85 mg/dL');
    expect(formatGlucoseValue(200)).toBe('200 mg/dL');
  });

  it('deve lidar com valores decimais', () => {
    expect(formatGlucoseValue(99.5)).toBe('99.5 mg/dL');
  });
});

describe('formatDate', () => {
  it('deve formatar data no formato brasileiro DD/MM/YYYY', () => {
    const result = formatDate('2024-01-15T10:30:00Z');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('deve lidar com diferentes timestamps', () => {
    const result1 = formatDate('2024-12-31T12:00:00Z');
    const result2 = formatDate('2024-01-01T12:00:00Z');
    expect(result1).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(result2).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});

describe('formatDateTime', () => {
  it('deve formatar data e hora no formato brasileiro DD/MM/YYYY HH:MM', () => {
    const result = formatDateTime('2024-01-15T10:30:00Z');
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}[,\s]+\d{2}:\d{2}/);
  });

  it('deve incluir horas e minutos', () => {
    const result = formatDateTime('2024-01-15T14:45:00Z');
    expect(result).toContain(':');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});

describe('formatTime', () => {
  it('deve formatar hora no formato HH:MM', () => {
    const result = formatTime('2024-01-15T10:30:00Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('deve formatar meia-noite corretamente', () => {
    const result = formatTime('2024-01-15T00:00:00Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('deve formatar meio-dia corretamente', () => {
    const result = formatTime('2024-01-15T12:00:00Z');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });
});
