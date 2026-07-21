/**
 * Zod validation schemas for Glucose Tracking Application
 *
 * All validation error messages are in Portuguese (BR).
 * Ensures data integrity before database operations and API responses.
 */

import { z } from 'zod';
import {
  DiabetesType,
  GlucoseContext,
  ReadingSource,
  UserRole
} from '@/types/database';

// ============================================================================
// Enum Schemas
// ============================================================================

export const userRoleSchema = z.enum(
  [UserRole.PATIENT, UserRole.CAREGIVER, UserRole.ADMIN] as const,
  { message: 'Tipo de usuário inválido' }
);

export const diabetesTypeSchema = z.enum(
  [
    DiabetesType.TYPE_1,
    DiabetesType.TYPE_2,
    DiabetesType.GESTATIONAL,
    DiabetesType.PREDIABETES,
    DiabetesType.OTHER
  ] as const,
  { message: 'Tipo de diabetes inválido' }
);

export const glucoseContextSchema = z.enum(
  [
    GlucoseContext.FASTING,
    GlucoseContext.PRE_MEAL,
    GlucoseContext.POST_MEAL,
    GlucoseContext.BEDTIME,
    GlucoseContext.NIGHT,
    GlucoseContext.EXERCISE,
    GlucoseContext.SICK,
    GlucoseContext.STRESS,
    GlucoseContext.OTHER
  ] as const,
  { message: 'Contexto da medição inválido' }
);

export const readingSourceSchema = z.enum(
  [
    ReadingSource.MANUAL,
    ReadingSource.GLUCOMETER,
    ReadingSource.CGM,
    ReadingSource.IMPORT
  ] as const,
  { message: 'Fonte da medição inválida' }
);

// ============================================================================
// Common Field Schemas
// ============================================================================

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid({
  message: 'ID inválido'
});

/**
 * Email validation
 */
export const emailSchema = z.string().email({
  message: 'Email inválido'
});

/**
 * Date string validation (YYYY-MM-DD)
 */
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
  message: 'Data inválida. Use o formato YYYY-MM-DD'
});

/**
 * ISO 8601 timestamp validation
 */
export const timestampSchema = z.string().datetime({
  message: 'Data e hora inválidas. Use o formato ISO 8601'
});

/**
 * Time string validation (HH:MM)
 */
export const timeStringSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
  message: 'Hora inválida. Use o formato HH:MM (ex: 08:30)'
});

/**
 * Glucose value validation (20-600 mg/dL)
 */
export const glucoseValueSchema = z.number()
  .min(20, { message: 'Valor de glicemia deve ser no mínimo 20 mg/dL' })
  .max(600, { message: 'Valor de glicemia deve ser no máximo 600 mg/dL' });

// ============================================================================
// Profile Schemas
// ============================================================================

/**
 * Create profile request schema
 */
export const createProfileSchema = z.object({
  diabetes_type: diabetesTypeSchema,
  diagnosis_date: dateStringSchema.optional(),
  date_of_birth: dateStringSchema.optional(),
  weight: z.number()
    .positive({ message: 'Peso deve ser um número positivo' })
    .max(500, { message: 'Peso deve ser no máximo 500 kg' })
    .optional(),
  height: z.number()
    .positive({ message: 'Altura deve ser um número positivo' })
    .min(50, { message: 'Altura deve ser no mínimo 50 cm' })
    .max(300, { message: 'Altura deve ser no máximo 300 cm' })
    .optional(),
  medication: z.string()
    .max(1000, { message: 'Medicações não podem exceder 1000 caracteres' })
    .optional(),
  physician: z.string()
    .max(255, { message: 'Nome do médico não pode exceder 255 caracteres' })
    .optional(),
  physician_contact: z.string()
    .max(255, { message: 'Contato do médico não pode exceder 255 caracteres' })
    .optional(),
  notes: z.string()
    .max(2000, { message: 'Observações não podem exceder 2000 caracteres' })
    .optional()
});

/**
 * Update profile request schema
 */
export const updateProfileSchema = createProfileSchema.partial();

// ============================================================================
// Glucose Reading Schemas
// ============================================================================

/**
 * Validate that reading date is not in the future and not older than 30 days
 */
const validateReadingDate = (date: string) => {
  const readingDate = new Date(date);
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  if (readingDate > now) {
    return false;
  }
  if (readingDate < thirtyDaysAgo) {
    return false;
  }
  return true;
};

/**
 * Create glucose reading request schema
 */
export const createReadingSchema = z.object({
  value: glucoseValueSchema,
  reading_date: timestampSchema.refine(validateReadingDate, {
    message: 'Data da medição deve estar entre hoje e 30 dias atrás'
  }),
  context: glucoseContextSchema,
  source: readingSourceSchema,
  notes: z.string()
    .max(500, { message: 'Observações não podem exceder 500 caracteres' })
    .optional()
});

/**
 * Update glucose reading request schema
 */
export const updateReadingSchema = z.object({
  value: glucoseValueSchema.optional(),
  reading_date: timestampSchema
    .refine(validateReadingDate, {
      message: 'Data da medição deve estar entre hoje e 30 dias atrás'
    })
    .optional(),
  context: glucoseContextSchema.optional(),
  source: readingSourceSchema.optional(),
  notes: z.string()
    .max(500, { message: 'Observações não podem exceder 500 caracteres' })
    .optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser fornecido para atualização' }
);

// ============================================================================
// Glucose Threshold Schema
// ============================================================================

/**
 * Base threshold values schema with order validation
 */
const thresholdValuesSchema = z.object({
  low: glucoseValueSchema,
  target_min: glucoseValueSchema,
  target_max: glucoseValueSchema,
  high: glucoseValueSchema
}).refine(
  (data) => data.low < data.target_min,
  {
    message: 'Limite de hipoglicemia deve ser menor que o alvo mínimo',
    path: ['low']
  }
).refine(
  (data) => data.target_min <= data.target_max,
  {
    message: 'Alvo mínimo deve ser menor ou igual ao alvo máximo',
    path: ['target_min']
  }
).refine(
  (data) => data.target_max < data.high,
  {
    message: 'Alvo máximo deve ser menor que o limite de hiperglicemia',
    path: ['target_max']
  }
);

/**
 * Create threshold request schema
 */
export const createThresholdSchema = thresholdValuesSchema.extend({
  profile_id: uuidSchema,
  context: glucoseContextSchema,
});

/**
 * Update threshold request schema with order validation
 */
export const updateThresholdSchema = thresholdValuesSchema;

// ============================================================================
// Reminder Schemas
// ============================================================================

/**
 * Days of week validation (0-6)
 */
const daysOfWeekSchema = z.array(
  z.number()
    .min(0, { message: 'Dia da semana deve ser entre 0 (Domingo) e 6 (Sábado)' })
    .max(6, { message: 'Dia da semana deve ser entre 0 (Domingo) e 6 (Sábado)' })
).min(1, { message: 'Selecione pelo menos um dia da semana' });

/**
 * Create reminder request schema
 */
export const createReminderSchema = z.object({
  title: z.string()
    .min(1, { message: 'Título é obrigatório' })
    .max(255, { message: 'Título não pode exceder 255 caracteres' }),
  description: z.string()
    .max(1000, { message: 'Descrição não pode exceder 1000 caracteres' })
    .optional(),
  time: timeStringSchema,
  days_of_week: daysOfWeekSchema,
  enabled: z.boolean()
});

/**
 * Update reminder request schema
 */
export const updateReminderSchema = z.object({
  title: z.string()
    .min(1, { message: 'Título é obrigatório' })
    .max(255, { message: 'Título não pode exceder 255 caracteres' })
    .optional(),
  description: z.string()
    .max(1000, { message: 'Descrição não pode exceder 1000 caracteres' })
    .optional(),
  time: timeStringSchema.optional(),
  days_of_week: daysOfWeekSchema.optional(),
  enabled: z.boolean().optional()
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'Pelo menos um campo deve ser fornecido para atualização' }
);

// ============================================================================
// Caregiver Access Schema
// ============================================================================

/**
 * Grant caregiver access request schema
 */
export const grantCaregiverAccessSchema = z.object({
  caregiver_email: emailSchema,
  access_level: z.enum(['read', 'write'] as const, {
    message: 'Nível de acesso deve ser "read" ou "write"'
  })
});

// ============================================================================
// Query Parameter Schemas
// ============================================================================

/**
 * Pagination parameters schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number()
    .int({ message: 'Página deve ser um número inteiro' })
    .positive({ message: 'Página deve ser positiva' })
    .default(1),
  page_size: z.coerce.number()
    .int({ message: 'Tamanho da página deve ser um número inteiro' })
    .positive({ message: 'Tamanho da página deve ser positivo' })
    .max(100, { message: 'Tamanho máximo da página é 100' })
    .default(50)
});

/**
 * List readings query parameters schema
 */
export const listReadingsQuerySchema = paginationSchema.extend({
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  context: glucoseContextSchema.optional(),
  source: readingSourceSchema.optional(),
  sort_by: z.enum(['reading_date', 'value', 'created_at'])
    .default('reading_date'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
}).refine(
  (data) => {
    if (data.start_date && data.end_date) {
      return new Date(data.start_date) <= new Date(data.end_date);
    }
    return true;
  },
  {
    message: 'Data inicial deve ser anterior ou igual à data final',
    path: ['start_date']
  }
);

/**
 * Report request schema
 */
export const reportRequestSchema = z.object({
  start_date: dateStringSchema,
  end_date: dateStringSchema,
  include_charts: z.boolean().default(true),
  format: z.enum(['json', 'pdf', 'csv']).default('json')
}).refine(
  (data) => new Date(data.start_date) <= new Date(data.end_date),
  {
    message: 'Data inicial deve ser anterior ou igual à data final',
    path: ['start_date']
  }
);

/**
 * Dashboard stats query schema
 */
export const dashboardStatsQuerySchema = z.object({
  start_date: dateStringSchema.optional(),
  end_date: dateStringSchema.optional(),
  days: z.coerce.number()
    .int({ message: 'Dias deve ser um número inteiro' })
    .positive({ message: 'Dias deve ser positivo' })
    .max(365, { message: 'Período máximo é 365 dias' })
    .default(30)
});

// ============================================================================
// Type Inference Exports
// ============================================================================

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateReadingInput = z.infer<typeof createReadingSchema>;
export type UpdateReadingInput = z.infer<typeof updateReadingSchema>;
export type CreateThresholdInput = z.infer<typeof createThresholdSchema>;
export type UpdateThresholdInput = z.infer<typeof updateThresholdSchema>;
export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;
export type GrantCaregiverAccessInput = z.infer<typeof grantCaregiverAccessSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type ListReadingsQueryInput = z.infer<typeof listReadingsQuerySchema>;
export type ReportRequestInput = z.infer<typeof reportRequestSchema>;
export type DashboardStatsQueryInput = z.infer<typeof dashboardStatsQuerySchema>;
