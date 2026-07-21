/**
 * Unit tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  createProfileSchema,
  createReadingSchema,
  createThresholdSchema,
  updateThresholdSchema,
  listReadingsQuerySchema,
  reportRequestSchema,
  glucoseValueSchema,
  emailSchema,
  dateStringSchema,
  timestampSchema,
  timeStringSchema,
} from '../schemas';
import { DiabetesType, GlucoseContext, ReadingSource } from '@/types/database';

// ============================================================================
// Common Field Schemas
// ============================================================================

describe('glucoseValueSchema', () => {
  it('deve aceitar valores válidos entre 20 e 600', () => {
    expect(glucoseValueSchema.parse(20)).toBe(20);
    expect(glucoseValueSchema.parse(100)).toBe(100);
    expect(glucoseValueSchema.parse(600)).toBe(600);
  });

  it('deve rejeitar valores abaixo de 20', () => {
    expect(() => glucoseValueSchema.parse(19)).toThrow();
    expect(() => glucoseValueSchema.parse(0)).toThrow();
  });

  it('deve rejeitar valores acima de 600', () => {
    expect(() => glucoseValueSchema.parse(601)).toThrow();
    expect(() => glucoseValueSchema.parse(1000)).toThrow();
  });
});

describe('emailSchema', () => {
  it('deve aceitar emails válidos', () => {
    expect(emailSchema.parse('user@example.com')).toBe('user@example.com');
    expect(emailSchema.parse('test.user@domain.co.uk')).toBe('test.user@domain.co.uk');
  });

  it('deve rejeitar emails inválidos', () => {
    expect(() => emailSchema.parse('invalid')).toThrow();
    expect(() => emailSchema.parse('user@')).toThrow();
    expect(() => emailSchema.parse('@domain.com')).toThrow();
  });
});

describe('dateStringSchema', () => {
  it('deve aceitar datas no formato YYYY-MM-DD', () => {
    expect(dateStringSchema.parse('2024-01-15')).toBe('2024-01-15');
    expect(dateStringSchema.parse('2024-12-31')).toBe('2024-12-31');
  });

  it('deve rejeitar formatos de data inválidos', () => {
    expect(() => dateStringSchema.parse('15/01/2024')).toThrow();
    expect(() => dateStringSchema.parse('2024-1-15')).toThrow();
    expect(() => dateStringSchema.parse('invalid')).toThrow();
  });
});

describe('timestampSchema', () => {
  it('deve aceitar timestamps ISO 8601 válidos', () => {
    expect(timestampSchema.parse('2024-01-15T10:30:00Z')).toBe('2024-01-15T10:30:00Z');
    expect(timestampSchema.parse('2024-01-15T10:30:00.000Z')).toBe('2024-01-15T10:30:00.000Z');
  });

  it('deve rejeitar timestamps inválidos', () => {
    expect(() => timestampSchema.parse('2024-01-15')).toThrow();
    expect(() => timestampSchema.parse('invalid')).toThrow();
  });
});

describe('timeStringSchema', () => {
  it('deve aceitar horários no formato HH:MM', () => {
    expect(timeStringSchema.parse('08:30')).toBe('08:30');
    expect(timeStringSchema.parse('23:59')).toBe('23:59');
    expect(timeStringSchema.parse('00:00')).toBe('00:00');
  });

  it('deve rejeitar formatos de horário inválidos', () => {
    expect(() => timeStringSchema.parse('8:30')).toThrow(); // Missing leading zero
    expect(() => timeStringSchema.parse('24:00')).toThrow(); // Invalid hour
    expect(() => timeStringSchema.parse('12:60')).toThrow(); // Invalid minute
    expect(() => timeStringSchema.parse('invalid')).toThrow();
  });
});

// ============================================================================
// Profile Schemas
// ============================================================================

describe('createProfileSchema', () => {
  it('deve aceitar perfil válido com campos obrigatórios', () => {
    const validProfile = {
      diabetes_type: DiabetesType.TYPE_2,
    };

    const result = createProfileSchema.parse(validProfile);
    expect(result.diabetes_type).toBe(DiabetesType.TYPE_2);
  });

  it('deve aceitar perfil com todos os campos opcionais', () => {
    const validProfile = {
      diabetes_type: DiabetesType.TYPE_1,
      diagnosis_date: '2024-01-15',
      date_of_birth: '1990-05-20',
      weight: 70.5,
      height: 175,
      medication: 'Insulina',
      physician: 'Dr. Silva',
      physician_contact: '(11) 98765-4321',
      notes: 'Observações gerais',
    };

    const result = createProfileSchema.parse(validProfile);
    expect(result.weight).toBe(70.5);
    expect(result.height).toBe(175);
  });

  it('deve rejeitar peso inválido', () => {
    expect(() =>
      createProfileSchema.parse({
        diabetes_type: DiabetesType.TYPE_2,
        weight: -10,
      })
    ).toThrow();

    expect(() =>
      createProfileSchema.parse({
        diabetes_type: DiabetesType.TYPE_2,
        weight: 600,
      })
    ).toThrow();
  });

  it('deve rejeitar altura inválida', () => {
    expect(() =>
      createProfileSchema.parse({
        diabetes_type: DiabetesType.TYPE_2,
        height: 30,
      })
    ).toThrow();

    expect(() =>
      createProfileSchema.parse({
        diabetes_type: DiabetesType.TYPE_2,
        height: 400,
      })
    ).toThrow();
  });

  it('deve rejeitar strings muito longas', () => {
    expect(() =>
      createProfileSchema.parse({
        diabetes_type: DiabetesType.TYPE_2,
        medication: 'a'.repeat(1001),
      })
    ).toThrow();

    expect(() =>
      createProfileSchema.parse({
        diabetes_type: DiabetesType.TYPE_2,
        physician: 'a'.repeat(256),
      })
    ).toThrow();

    expect(() =>
      createProfileSchema.parse({
        diabetes_type: DiabetesType.TYPE_2,
        notes: 'a'.repeat(2001),
      })
    ).toThrow();
  });
});

// ============================================================================
// Glucose Reading Schemas
// ============================================================================

describe('createReadingSchema', () => {
  it('deve aceitar leitura válida com campos obrigatórios', () => {
    const validReading = {
      value: 100,
      reading_date: new Date().toISOString(),
      context: GlucoseContext.FASTING,
      source: ReadingSource.MANUAL,
    };

    const result = createReadingSchema.parse(validReading);
    expect(result.value).toBe(100);
    expect(result.context).toBe(GlucoseContext.FASTING);
  });

  it('deve aceitar leitura com notas', () => {
    const validReading = {
      value: 120,
      reading_date: new Date().toISOString(),
      context: GlucoseContext.POST_MEAL,
      source: ReadingSource.GLUCOMETER,
      notes: 'Após almoço',
    };

    const result = createReadingSchema.parse(validReading);
    expect(result.notes).toBe('Após almoço');
  });

  it('deve rejeitar valor de glicose fora da faixa', () => {
    expect(() =>
      createReadingSchema.parse({
        value: 10,
        reading_date: new Date().toISOString(),
        context: GlucoseContext.FASTING,
        source: ReadingSource.MANUAL,
      })
    ).toThrow();

    expect(() =>
      createReadingSchema.parse({
        value: 700,
        reading_date: new Date().toISOString(),
        context: GlucoseContext.FASTING,
        source: ReadingSource.MANUAL,
      })
    ).toThrow();
  });

  it('deve rejeitar data futura', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    expect(() =>
      createReadingSchema.parse({
        value: 100,
        reading_date: futureDate.toISOString(),
        context: GlucoseContext.FASTING,
        source: ReadingSource.MANUAL,
      })
    ).toThrow();
  });

  it('deve rejeitar data muito antiga (mais de 30 dias)', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);

    expect(() =>
      createReadingSchema.parse({
        value: 100,
        reading_date: oldDate.toISOString(),
        context: GlucoseContext.FASTING,
        source: ReadingSource.MANUAL,
      })
    ).toThrow();
  });

  it('deve aceitar data de hoje', () => {
    const today = new Date();

    const result = createReadingSchema.parse({
      value: 100,
      reading_date: today.toISOString(),
      context: GlucoseContext.FASTING,
      source: ReadingSource.MANUAL,
    });

    expect(result.value).toBe(100);
  });

  it('deve aceitar data de 30 dias atrás', () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = createReadingSchema.parse({
      value: 100,
      reading_date: thirtyDaysAgo.toISOString(),
      context: GlucoseContext.FASTING,
      source: ReadingSource.MANUAL,
    });

    expect(result.value).toBe(100);
  });

  it('deve rejeitar notas muito longas', () => {
    expect(() =>
      createReadingSchema.parse({
        value: 100,
        reading_date: new Date().toISOString(),
        context: GlucoseContext.FASTING,
        source: ReadingSource.MANUAL,
        notes: 'a'.repeat(501),
      })
    ).toThrow();
  });
});

// ============================================================================
// Glucose Threshold Schema
// ============================================================================

describe('createThresholdSchema', () => {
  it('deve aceitar thresholds válidos', () => {
    const validThreshold = {
      profile_id: '123e4567-e89b-12d3-a456-426614174000',
      context: GlucoseContext.FASTING,
      low: 70,
      target_min: 80,
      target_max: 140,
      high: 180,
    };

    const result = createThresholdSchema.parse(validThreshold);
    expect(result.low).toBe(70);
    expect(result.target_min).toBe(80);
    expect(result.target_max).toBe(140);
    expect(result.high).toBe(180);
  });

  it('deve rejeitar quando low >= target_min', () => {
    expect(() =>
      createThresholdSchema.parse({
        profile_id: '123e4567-e89b-12d3-a456-426614174000',
        context: GlucoseContext.FASTING,
        low: 80,
        target_min: 80,
        target_max: 140,
        high: 180,
      })
    ).toThrow();

    expect(() =>
      createThresholdSchema.parse({
        profile_id: '123e4567-e89b-12d3-a456-426614174000',
        context: GlucoseContext.FASTING,
        low: 90,
        target_min: 80,
        target_max: 140,
        high: 180,
      })
    ).toThrow();
  });

  it('deve rejeitar quando target_min > target_max', () => {
    expect(() =>
      createThresholdSchema.parse({
        profile_id: '123e4567-e89b-12d3-a456-426614174000',
        context: GlucoseContext.FASTING,
        low: 70,
        target_min: 150,
        target_max: 140,
        high: 180,
      })
    ).toThrow();
  });

  it('deve rejeitar quando target_max >= high', () => {
    expect(() =>
      createThresholdSchema.parse({
        profile_id: '123e4567-e89b-12d3-a456-426614174000',
        context: GlucoseContext.FASTING,
        low: 70,
        target_min: 80,
        target_max: 180,
        high: 180,
      })
    ).toThrow();

    expect(() =>
      createThresholdSchema.parse({
        profile_id: '123e4567-e89b-12d3-a456-426614174000',
        context: GlucoseContext.FASTING,
        low: 70,
        target_min: 80,
        target_max: 190,
        high: 180,
      })
    ).toThrow();
  });

  it('deve aceitar quando target_min = target_max', () => {
    const result = createThresholdSchema.parse({
      profile_id: '123e4567-e89b-12d3-a456-426614174000',
      context: GlucoseContext.FASTING,
      low: 70,
      target_min: 100,
      target_max: 100,
      high: 180,
    });

    expect(result.target_min).toBe(100);
    expect(result.target_max).toBe(100);
  });
});

describe('updateThresholdSchema', () => {
  it('deve aceitar atualização de thresholds válida', () => {
    const validUpdate = {
      low: 70,
      target_min: 80,
      target_max: 140,
      high: 180,
    };

    const result = updateThresholdSchema.parse(validUpdate);
    expect(result.low).toBe(70);
  });

  it('deve validar ordem dos valores na atualização', () => {
    expect(() =>
      updateThresholdSchema.parse({
        low: 90,
        target_min: 80,
        target_max: 140,
        high: 180,
      })
    ).toThrow();
  });
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

describe('listReadingsQuerySchema', () => {
  it('deve aplicar valores padrão para paginação', () => {
    const result = listReadingsQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.page_size).toBe(50);
    expect(result.sort_by).toBe('reading_date');
    expect(result.sort_order).toBe('desc');
  });

  it('deve aceitar parâmetros de paginação customizados', () => {
    const result = listReadingsQuerySchema.parse({
      page: '2',
      page_size: '25',
    });
    expect(result.page).toBe(2);
    expect(result.page_size).toBe(25);
  });

  it('deve rejeitar page_size maior que 100', () => {
    expect(() =>
      listReadingsQuerySchema.parse({
        page_size: '101',
      })
    ).toThrow();
  });

  it('deve aceitar filtros de data', () => {
    const result = listReadingsQuerySchema.parse({
      start_date: '2024-01-01',
      end_date: '2024-01-31',
    });
    expect(result.start_date).toBe('2024-01-01');
    expect(result.end_date).toBe('2024-01-31');
  });

  it('deve rejeitar quando start_date > end_date', () => {
    expect(() =>
      listReadingsQuerySchema.parse({
        start_date: '2024-01-31',
        end_date: '2024-01-01',
      })
    ).toThrow();
  });

  it('deve aceitar quando start_date = end_date', () => {
    const result = listReadingsQuerySchema.parse({
      start_date: '2024-01-15',
      end_date: '2024-01-15',
    });
    expect(result.start_date).toBe('2024-01-15');
    expect(result.end_date).toBe('2024-01-15');
  });

  it('deve aceitar filtros de contexto e fonte', () => {
    const result = listReadingsQuerySchema.parse({
      context: GlucoseContext.FASTING,
      source: ReadingSource.MANUAL,
    });
    expect(result.context).toBe(GlucoseContext.FASTING);
    expect(result.source).toBe(ReadingSource.MANUAL);
  });

  it('deve aceitar opções de ordenação', () => {
    const result = listReadingsQuerySchema.parse({
      sort_by: 'value',
      sort_order: 'asc',
    });
    expect(result.sort_by).toBe('value');
    expect(result.sort_order).toBe('asc');
  });
});

describe('reportRequestSchema', () => {
  it('deve aceitar requisição de relatório válida', () => {
    const validRequest = {
      start_date: '2024-01-01',
      end_date: '2024-01-31',
    };

    const result = reportRequestSchema.parse(validRequest);
    expect(result.start_date).toBe('2024-01-01');
    expect(result.end_date).toBe('2024-01-31');
    expect(result.include_charts).toBe(true); // default
    expect(result.format).toBe('json'); // default
  });

  it('deve aceitar formato personalizado', () => {
    const result = reportRequestSchema.parse({
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      format: 'pdf',
      include_charts: false,
    });
    expect(result.format).toBe('pdf');
    expect(result.include_charts).toBe(false);
  });

  it('deve rejeitar quando start_date > end_date', () => {
    expect(() =>
      reportRequestSchema.parse({
        start_date: '2024-01-31',
        end_date: '2024-01-01',
      })
    ).toThrow();
  });

  it('deve exigir ambos start_date e end_date', () => {
    expect(() =>
      reportRequestSchema.parse({
        start_date: '2024-01-01',
      })
    ).toThrow();

    expect(() =>
      reportRequestSchema.parse({
        end_date: '2024-01-31',
      })
    ).toThrow();
  });
});
