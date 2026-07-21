/**
 * Unit tests for CSV export utilities
 */

import { describe, it, expect } from 'vitest';
import { readingsToCsv, getContextLabel, getSourceLabel } from '../export-csv';
import type { GlucoseReading, GlucoseContext, ReadingSource } from '@/types/database';

describe('getContextLabel', () => {
  it('deve retornar rótulos em português para contextos de medição', () => {
    expect(getContextLabel('fasting' as GlucoseContext)).toBe('Jejum');
    expect(getContextLabel('pre_meal' as GlucoseContext)).toBe('Pré-refeição');
    expect(getContextLabel('post_meal' as GlucoseContext)).toBe('Pós-refeição');
    expect(getContextLabel('bedtime' as GlucoseContext)).toBe('Antes de dormir');
    expect(getContextLabel('night' as GlucoseContext)).toBe('Durante a noite');
    expect(getContextLabel('exercise' as GlucoseContext)).toBe('Exercício');
    expect(getContextLabel('sick' as GlucoseContext)).toBe('Doente');
    expect(getContextLabel('stress' as GlucoseContext)).toBe('Estresse');
    expect(getContextLabel('other' as GlucoseContext)).toBe('Outro');
  });
});

describe('getSourceLabel', () => {
  it('deve retornar rótulos em português para fontes de medição', () => {
    expect(getSourceLabel('manual' as ReadingSource)).toBe('Manual');
    expect(getSourceLabel('glucometer' as ReadingSource)).toBe('Glicosímetro');
    expect(getSourceLabel('cgm' as ReadingSource)).toBe('CGM');
    expect(getSourceLabel('import' as ReadingSource)).toBe('Importação');
  });
});

describe('readingsToCsv', () => {
  it('deve gerar CSV com cabeçalho correto em português', () => {
    const csv = readingsToCsv([]);
    expect(csv).toBe('Data,Hora,Valor (mg/dL),Contexto,Fonte,Notas');
  });

  it('deve gerar CSV com dados de leituras', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 100,
        reading_date: '2024-01-15T10:30:00Z',
        context: 'fasting' as GlucoseContext,
        source: 'manual' as ReadingSource,
        notes: 'Medição matinal',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    ];

    const csv = readingsToCsv(readings);
    const lines = csv.split('\n');

    expect(lines.length).toBe(2); // header + 1 data row
    expect(lines[0]).toBe('Data,Hora,Valor (mg/dL),Contexto,Fonte,Notas');

    // Second line should contain the data
    expect(lines[1]).toContain('100');
    expect(lines[1]).toContain('Jejum');
    expect(lines[1]).toContain('Manual');
    expect(lines[1]).toContain('Medição matinal');
  });

  it('deve gerar múltiplas linhas para múltiplas leituras', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 100,
        reading_date: '2024-01-15T10:30:00Z',
        context: 'fasting' as GlucoseContext,
        source: 'manual' as ReadingSource,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
      {
        id: '2',
        profile_id: 'profile1',
        value: 140,
        reading_date: '2024-01-15T14:30:00Z',
        context: 'post_meal' as GlucoseContext,
        source: 'glucometer' as ReadingSource,
        created_at: '2024-01-15T14:30:00Z',
        updated_at: '2024-01-15T14:30:00Z',
      },
    ];

    const csv = readingsToCsv(readings);
    const lines = csv.split('\n');

    expect(lines.length).toBe(3); // header + 2 data rows
  });

  it('deve lidar com notas ausentes', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 100,
        reading_date: '2024-01-15T10:30:00Z',
        context: 'fasting' as GlucoseContext,
        source: 'manual' as ReadingSource,
        notes: null,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    ];

    const csv = readingsToCsv(readings);
    const lines = csv.split('\n');

    // Should not have error, notes field should be empty
    expect(lines.length).toBe(2);
    expect(lines[1]).not.toContain('null');
  });

  it('deve escapar vírgulas nas notas com aspas duplas', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 100,
        reading_date: '2024-01-15T10:30:00Z',
        context: 'fasting' as GlucoseContext,
        source: 'manual' as ReadingSource,
        notes: 'Medição após jejum, antes do café',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    ];

    const csv = readingsToCsv(readings);
    const lines = csv.split('\n');

    // Notes with commas should be wrapped in quotes
    expect(lines[1]).toContain('"Medição após jejum, antes do café"');
  });

  it('deve escapar aspas duplas duplicando-as', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 100,
        reading_date: '2024-01-15T10:30:00Z',
        context: 'fasting' as GlucoseContext,
        source: 'manual' as ReadingSource,
        notes: 'Paciente disse: "me sinto bem"',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    ];

    const csv = readingsToCsv(readings);
    const lines = csv.split('\n');

    // Quotes should be escaped as double quotes
    expect(lines[1]).toContain('""me sinto bem""');
  });

  it('deve escapar notas com quebras de linha', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 100,
        reading_date: '2024-01-15T10:30:00Z',
        context: 'fasting' as GlucoseContext,
        source: 'manual' as ReadingSource,
        notes: 'Linha 1\nLinha 2',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    ];

    const csv = readingsToCsv(readings);
    const lines = csv.split('\n');

    // Multiline notes should be wrapped in quotes
    // The CSV will have more than 2 lines because the note contains newlines
    expect(csv).toContain('"Linha 1\nLinha 2"');
  });

  it('deve formatar data e hora corretamente', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 100,
        reading_date: '2024-01-15T10:30:00Z',
        context: 'fasting' as GlucoseContext,
        source: 'manual' as ReadingSource,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    ];

    const csv = readingsToCsv(readings);
    const lines = csv.split('\n');

    // Should have date in DD/MM/YYYY format and time in HH:MM format
    expect(lines[1]).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    expect(lines[1]).toMatch(/\d{2}:\d{2}/);
  });

  it('deve incluir todos os campos na ordem correta', () => {
    const readings: GlucoseReading[] = [
      {
        id: '1',
        profile_id: 'profile1',
        value: 120,
        reading_date: '2024-01-15T10:30:00Z',
        context: 'pre_meal' as GlucoseContext,
        source: 'glucometer' as ReadingSource,
        notes: 'Teste',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    ];

    const csv = readingsToCsv(readings);
    const lines = csv.split('\n');
    const dataLine = lines[1].split(',');

    // Order: Data, Hora, Valor (mg/dL), Contexto, Fonte, Notas
    expect(dataLine.length).toBeGreaterThanOrEqual(6);
    expect(dataLine[2]).toBe('120'); // Valor
    expect(dataLine[3]).toBe('Pré-refeição'); // Contexto
    expect(dataLine[4]).toBe('Glicosímetro'); // Fonte
    expect(dataLine[5]).toBe('Teste'); // Notas
  });
});
