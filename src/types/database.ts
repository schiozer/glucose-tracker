/**
 * Database entity types for Glucose Tracking Application
 *
 * Represents the core data model for users, profiles, glucose readings,
 * thresholds, reminders, caregiver access, and audit logs.
 */

// ============================================================================
// Enums
// ============================================================================

/**
 * User roles in the system
 */
export enum UserRole {
  PATIENT = 'patient',
  CAREGIVER = 'caregiver',
  ADMIN = 'admin'
}

/**
 * Diabetes type classification
 */
export enum DiabetesType {
  TYPE_1 = 'type_1',
  TYPE_2 = 'type_2',
  GESTATIONAL = 'gestational',
  PREDIABETES = 'prediabetes',
  OTHER = 'other'
}

/**
 * Context when glucose reading was taken
 */
export enum GlucoseContext {
  FASTING = 'fasting',              // Jejum
  PRE_MEAL = 'pre_meal',            // Pré-refeição
  POST_MEAL = 'post_meal',          // Pós-refeição
  BEDTIME = 'bedtime',              // Antes de dormir
  NIGHT = 'night',                  // Durante a noite
  EXERCISE = 'exercise',            // Durante/após exercício
  SICK = 'sick',                    // Doente
  STRESS = 'stress',                // Estresse
  OTHER = 'other'
}

/**
 * Source of glucose reading
 */
export enum ReadingSource {
  MANUAL = 'manual',                // Entrada manual
  GLUCOMETER = 'glucometer',        // Glicosímetro
  CGM = 'cgm',                      // Continuous Glucose Monitor
  IMPORT = 'import'                 // Importação de arquivo
}

// ============================================================================
// Core Entities
// ============================================================================

/**
 * User entity from Auth0 and Supabase
 */
export interface User {
  id: string;                       // UUID from Auth0
  auth0_id: string;                 // Auth0 user ID (sub)
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  role: UserRole;
  created_at: string;               // ISO 8601 timestamp (UTC)
  updated_at: string;               // ISO 8601 timestamp (UTC)
  last_login?: string;              // ISO 8601 timestamp (UTC)
}

/**
 * Patient profile with medical information
 */
export interface Profile {
  id: string;                       // UUID
  user_id: string;                  // Foreign key to users.id
  diabetes_type: DiabetesType;
  diagnosis_date?: string;          // ISO 8601 date (YYYY-MM-DD)
  date_of_birth?: string;           // ISO 8601 date (YYYY-MM-DD)
  weight?: number;                  // kg
  height?: number;                  // cm
  medication?: string;              // Medicações atuais
  physician?: string;               // Médico responsável
  physician_contact?: string;       // Contato do médico
  notes?: string;                   // Observações gerais
  created_at: string;               // ISO 8601 timestamp (UTC)
  updated_at: string;               // ISO 8601 timestamp (UTC)
}

/**
 * Glucose reading entry
 */
export interface GlucoseReading {
  id: string;                       // UUID
  user_id: string;                  // Foreign key to users.id
  value: number;                    // mg/dL (20-600 range)
  reading_date: string;             // ISO 8601 timestamp (UTC)
  context: GlucoseContext;
  source: ReadingSource;
  notes?: string;                   // Observações da leitura (max 500 chars)
  created_at: string;               // ISO 8601 timestamp (UTC)
  updated_at: string;               // ISO 8601 timestamp (UTC)
}

/**
 * Personalized glucose thresholds for a user
 */
export interface GlucoseThreshold {
  id: string;                       // UUID
  user_id: string;                  // Foreign key to users.id
  low: number;                      // Hipoglicemia (mg/dL)
  target_min: number;               // Alvo mínimo (mg/dL)
  target_max: number;               // Alvo máximo (mg/dL)
  high: number;                     // Hiperglicemia (mg/dL)
  created_at: string;               // ISO 8601 timestamp (UTC)
  updated_at: string;               // ISO 8601 timestamp (UTC)
}

/**
 * Reminder for glucose measurements or medication
 */
export interface Reminder {
  id: string;                       // UUID
  user_id: string;                  // Foreign key to users.id
  title: string;                    // Título do lembrete
  description?: string;             // Descrição
  time: string;                     // Hora do lembrete (HH:MM format)
  days_of_week: number[];           // 0=Sunday, 1=Monday, ..., 6=Saturday
  enabled: boolean;                 // Lembrete ativo/inativo
  created_at: string;               // ISO 8601 timestamp (UTC)
  updated_at: string;               // ISO 8601 timestamp (UTC)
}

/**
 * Caregiver access to patient data
 */
export interface CaregiverAccess {
  id: string;                       // UUID
  patient_id: string;               // Foreign key to users.id (patient)
  caregiver_id: string;             // Foreign key to users.id (caregiver)
  granted_at: string;               // ISO 8601 timestamp (UTC)
  granted_by: string;               // Foreign key to users.id (who granted)
  access_level: 'read' | 'write';   // Nível de acesso
  revoked: boolean;
  revoked_at?: string;              // ISO 8601 timestamp (UTC)
}

/**
 * Audit log for data changes
 */
export interface AuditLog {
  id: string;                       // UUID
  user_id: string;                  // Foreign key to users.id
  action: string;                   // create, update, delete, etc.
  entity_type: string;              // readings, profile, thresholds, etc.
  entity_id: string;                // UUID of affected entity
  changes?: Record<string, unknown>; // JSON with before/after values
  ip_address?: string;
  user_agent?: string;
  created_at: string;               // ISO 8601 timestamp (UTC)
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Database table names for type safety
 */
export type TableName =
  | 'users'
  | 'profiles'
  | 'glucose_readings'
  | 'glucose_thresholds'
  | 'reminders'
  | 'caregiver_access'
  | 'audit_logs';

/**
 * Common fields for all database entities
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Type guard to check if object has BaseEntity fields
 */
export function isBaseEntity(obj: unknown): obj is BaseEntity {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'created_at' in obj &&
    'updated_at' in obj
  );
}
