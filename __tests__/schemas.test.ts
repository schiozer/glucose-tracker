/**
 * Schema validation tests
 * Verifies that Zod schemas validate correctly
 */

import {
  createReadingSchema,
  createProfileSchema,
  updateThresholdSchema,
  createReminderSchema,
  listReadingsQuerySchema,
} from '@/lib/validations/schemas';
import { DiabetesType, GlucoseContext, ReadingSource } from '@/types/database';

describe('Glucose Reading Schemas', () => {
  test('createReadingSchema - valid reading', () => {
    const validReading = {
      value: 120,
      reading_date: new Date().toISOString(),
      context: GlucoseContext.FASTING,
      source: ReadingSource.MANUAL,
      notes: 'Teste de leitura'
    };

    const result = createReadingSchema.safeParse(validReading);
    expect(result.success).toBe(true);
  });

  test('createReadingSchema - value below minimum', () => {
    const invalidReading = {
      value: 15,
      reading_date: new Date().toISOString(),
      context: GlucoseContext.FASTING,
      source: ReadingSource.MANUAL
    };

    const result = createReadingSchema.safeParse(invalidReading);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('mínimo 20');
    }
  });

  test('createReadingSchema - value above maximum', () => {
    const invalidReading = {
      value: 650,
      reading_date: new Date().toISOString(),
      context: GlucoseContext.FASTING,
      source: ReadingSource.MANUAL
    };

    const result = createReadingSchema.safeParse(invalidReading);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('máximo 600');
    }
  });

  test('createReadingSchema - future date rejected', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    const invalidReading = {
      value: 120,
      reading_date: futureDate.toISOString(),
      context: GlucoseContext.FASTING,
      source: ReadingSource.MANUAL
    };

    const result = createReadingSchema.safeParse(invalidReading);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('30 dias atrás');
    }
  });

  test('createReadingSchema - notes too long', () => {
    const invalidReading = {
      value: 120,
      reading_date: new Date().toISOString(),
      context: GlucoseContext.FASTING,
      source: ReadingSource.MANUAL,
      notes: 'a'.repeat(501)
    };

    const result = createReadingSchema.safeParse(invalidReading);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('500 caracteres');
    }
  });
});

describe('Profile Schemas', () => {
  test('createProfileSchema - valid profile', () => {
    const validProfile = {
      diabetes_type: DiabetesType.TYPE_2,
      diagnosis_date: '2020-01-15',
      weight: 75,
      height: 170,
      medication: 'Metformina 500mg',
      notes: 'Paciente controlado'
    };

    const result = createProfileSchema.safeParse(validProfile);
    expect(result.success).toBe(true);
  });

  test('createProfileSchema - invalid weight', () => {
    const invalidProfile = {
      diabetes_type: DiabetesType.TYPE_1,
      weight: -10
    };

    const result = createProfileSchema.safeParse(invalidProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('positivo');
    }
  });

  test('createProfileSchema - height out of range', () => {
    const invalidProfile = {
      diabetes_type: DiabetesType.TYPE_1,
      height: 350
    };

    const result = createProfileSchema.safeParse(invalidProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('máximo 300');
    }
  });
});

describe('Threshold Schemas', () => {
  test('updateThresholdSchema - valid thresholds', () => {
    const validThresholds = {
      low: 70,
      target_min: 80,
      target_max: 140,
      high: 180
    };

    const result = updateThresholdSchema.safeParse(validThresholds);
    expect(result.success).toBe(true);
  });

  test('updateThresholdSchema - invalid order (low >= target_min)', () => {
    const invalidThresholds = {
      low: 90,
      target_min: 80,
      target_max: 140,
      high: 180
    };

    const result = updateThresholdSchema.safeParse(invalidThresholds);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('hipoglicemia');
    }
  });

  test('updateThresholdSchema - invalid order (target_max >= high)', () => {
    const invalidThresholds = {
      low: 70,
      target_min: 80,
      target_max: 180,
      high: 180
    };

    const result = updateThresholdSchema.safeParse(invalidThresholds);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('hiperglicemia');
    }
  });
});

describe('Reminder Schemas', () => {
  test('createReminderSchema - valid reminder', () => {
    const validReminder = {
      title: 'Medição matinal',
      description: 'Medir glicemia em jejum',
      time: '08:00',
      days_of_week: [1, 2, 3, 4, 5],
      enabled: true
    };

    const result = createReminderSchema.safeParse(validReminder);
    expect(result.success).toBe(true);
  });

  test('createReminderSchema - invalid time format', () => {
    const invalidReminder = {
      title: 'Medição matinal',
      time: '25:00',
      days_of_week: [1, 2, 3],
      enabled: true
    };

    const result = createReminderSchema.safeParse(invalidReminder);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('HH:MM');
    }
  });

  test('createReminderSchema - no days selected', () => {
    const invalidReminder = {
      title: 'Medição matinal',
      time: '08:00',
      days_of_week: [],
      enabled: true
    };

    const result = createReminderSchema.safeParse(invalidReminder);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('pelo menos um dia');
    }
  });
});

describe('Query Parameter Schemas', () => {
  test('listReadingsQuerySchema - valid query', () => {
    const validQuery = {
      page: '1',
      page_size: '20',
      start_date: '2024-01-01',
      end_date: '2024-01-31',
      sort_by: 'reading_date',
      sort_order: 'desc'
    };

    const result = listReadingsQuerySchema.safeParse(validQuery);
    expect(result.success).toBe(true);
  });

  test('listReadingsQuerySchema - invalid date range', () => {
    const invalidQuery = {
      start_date: '2024-01-31',
      end_date: '2024-01-01'
    };

    const result = listReadingsQuerySchema.safeParse(invalidQuery);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('anterior ou igual');
    }
  });

  test('listReadingsQuerySchema - page_size over limit', () => {
    const invalidQuery = {
      page_size: '150'
    };

    const result = listReadingsQuerySchema.safeParse(invalidQuery);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('máximo da página é 100');
    }
  });
});
