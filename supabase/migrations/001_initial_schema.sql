-- ============================================================================
-- Glucose Tracking Application - Initial Database Schema
-- ============================================================================
-- Creates all tables, enums, constraints, indices, and triggers for the MVP
--
-- Tables:
--   1. users - User accounts from Auth0
--   2. profiles - Patient medical profiles (multiple per user)
--   3. caregiver_access - Shared access between patients and caregivers
--   4. glucose_readings - Glucose measurements
--   5. glucose_thresholds - Context-specific threshold configurations
--   6. reminders - Scheduled reminders for measurements/medication
--   7. push_subscriptions - Web push notification endpoints
--   8. audit_logs - Audit trail for all data changes
--   9. user_consents - LGPD consent tracking
--
-- Critical Design:
--   - profile_id as foreign key (NOT user_id) in readings/thresholds
--   - context field in glucose_thresholds for context-specific thresholds
--   - Multiple profiles per user supported
--   - Timestamps in UTC
--   - Glucose values constrained to 20-600 mg/dL
--   - Region: São Paulo (AWS sa-east-1) for LGPD compliance
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Enums
-- ============================================================================

-- User role in the system
CREATE TYPE user_role AS ENUM ('patient', 'caregiver', 'admin');

-- Diabetes type classification
CREATE TYPE diabetes_type AS ENUM (
  'type_1',
  'type_2',
  'gestational',
  'prediabetes',
  'other'
);

-- Context when glucose reading was taken
CREATE TYPE glucose_context AS ENUM (
  'fasting',      -- Jejum
  'pre_meal',     -- Pré-refeição
  'post_meal',    -- Pós-refeição
  'bedtime',      -- Antes de dormir
  'night',        -- Durante a noite
  'exercise',     -- Durante/após exercício
  'sick',         -- Doente
  'stress',       -- Estresse
  'other'
);

-- Source of glucose reading
CREATE TYPE reading_source AS ENUM (
  'manual',       -- Entrada manual
  'glucometer',   -- Glicosímetro
  'cgm',          -- Continuous Glucose Monitor
  'import'        -- Importação de arquivo
);

-- Audit action types
CREATE TYPE audit_action AS ENUM (
  'create',
  'update',
  'delete',
  'login',
  'logout',
  'grant_access',
  'revoke_access',
  'export_data',
  'consent_given',
  'consent_revoked'
);

-- ============================================================================
-- Table: users
-- ============================================================================
-- User accounts synchronized from Auth0
-- Primary user entity for authentication and authorization

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  name TEXT,
  picture TEXT,
  role user_role NOT NULL DEFAULT 'patient',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for frequent queries
CREATE INDEX idx_users_auth0_id ON users(auth0_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

COMMENT ON TABLE users IS 'User accounts synchronized from Auth0';
COMMENT ON COLUMN users.auth0_id IS 'Auth0 user ID (sub claim from JWT)';
COMMENT ON COLUMN users.email IS 'User email address';
COMMENT ON COLUMN users.role IS 'User role: patient, caregiver, or admin';

-- ============================================================================
-- Table: profiles
-- ============================================================================
-- Patient medical profiles with diabetes information
-- Supports multiple profiles per user (e.g., parent managing multiple children)

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diabetes_type diabetes_type NOT NULL,
  diagnosis_date DATE,
  date_of_birth DATE,
  weight DECIMAL(5,2) CHECK (weight > 0 AND weight <= 500),
  height DECIMAL(5,2) CHECK (height > 0 AND height <= 300),
  medication TEXT,
  physician TEXT,
  physician_contact TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for frequent queries
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_diabetes_type ON profiles(diabetes_type);

COMMENT ON TABLE profiles IS 'Patient medical profiles - supports multiple profiles per user';
COMMENT ON COLUMN profiles.user_id IS 'Owner of this profile';
COMMENT ON COLUMN profiles.weight IS 'Weight in kilograms';
COMMENT ON COLUMN profiles.height IS 'Height in centimeters';

-- ============================================================================
-- Table: caregiver_access
-- ============================================================================
-- Manages caregiver access to patient profiles
-- Patients grant access; caregivers can view/edit based on access_level

CREATE TABLE caregiver_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  caregiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  granted_by UUID NOT NULL REFERENCES users(id),
  access_level TEXT NOT NULL CHECK (access_level IN ('read', 'write')),
  revoked BOOLEAN NOT NULL DEFAULT false,
  revoked_at TIMESTAMPTZ,

  -- Prevent duplicate active access grants
  CONSTRAINT unique_active_caregiver_access
    UNIQUE (patient_id, caregiver_id, revoked),

  -- Prevent self-access
  CONSTRAINT no_self_caregiver_access
    CHECK (patient_id != caregiver_id)
);

-- Indices for frequent queries
CREATE INDEX idx_caregiver_access_patient ON caregiver_access(patient_id) WHERE NOT revoked;
CREATE INDEX idx_caregiver_access_caregiver ON caregiver_access(caregiver_id) WHERE NOT revoked;

COMMENT ON TABLE caregiver_access IS 'Caregiver access to patient data';
COMMENT ON COLUMN caregiver_access.granted_by IS 'User who granted access (typically patient)';
COMMENT ON COLUMN caregiver_access.revoked IS 'Whether access has been revoked';

-- ============================================================================
-- Table: glucose_readings
-- ============================================================================
-- Glucose measurement entries
-- CRITICAL: Uses profile_id (NOT user_id) to support multiple profiles per user

CREATE TABLE glucose_readings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  value DECIMAL(5,1) NOT NULL CHECK (value >= 20 AND value <= 600),
  reading_date TIMESTAMPTZ NOT NULL CHECK (reading_date <= NOW()),
  context glucose_context NOT NULL,
  source reading_source NOT NULL DEFAULT 'manual',
  notes TEXT CHECK (LENGTH(notes) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for frequent queries
CREATE INDEX idx_glucose_readings_profile ON glucose_readings(profile_id);
CREATE INDEX idx_glucose_readings_date ON glucose_readings(reading_date DESC);
CREATE INDEX idx_glucose_readings_profile_date ON glucose_readings(profile_id, reading_date DESC);
CREATE INDEX idx_glucose_readings_context ON glucose_readings(context);

COMMENT ON TABLE glucose_readings IS 'Glucose measurement entries';
COMMENT ON COLUMN glucose_readings.profile_id IS 'Profile this reading belongs to';
COMMENT ON COLUMN glucose_readings.value IS 'Glucose value in mg/dL (20-600 range)';
COMMENT ON COLUMN glucose_readings.reading_date IS 'When measurement was taken (UTC)';
COMMENT ON COLUMN glucose_readings.notes IS 'Optional notes about the reading (max 500 chars)';

-- ============================================================================
-- Table: glucose_thresholds
-- ============================================================================
-- Context-specific glucose threshold configurations
-- CRITICAL: Includes context field for different thresholds per context
-- One row per (profile_id, context) combination

CREATE TABLE glucose_thresholds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  context glucose_context NOT NULL,
  low DECIMAL(5,1) NOT NULL CHECK (low >= 20 AND low <= 600),
  target_min DECIMAL(5,1) NOT NULL CHECK (target_min >= 20 AND target_min <= 600),
  target_max DECIMAL(5,1) NOT NULL CHECK (target_max >= 20 AND target_max <= 600),
  high DECIMAL(5,1) NOT NULL CHECK (high >= 20 AND high <= 600),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure only one threshold configuration per profile+context
  CONSTRAINT unique_profile_context_threshold UNIQUE (profile_id, context),

  -- Ensure thresholds are in ascending order
  CONSTRAINT threshold_ordering
    CHECK (low < target_min AND target_min <= target_max AND target_max < high)
);

-- Indices for frequent queries
CREATE INDEX idx_glucose_thresholds_profile ON glucose_thresholds(profile_id);
CREATE INDEX idx_glucose_thresholds_profile_context ON glucose_thresholds(profile_id, context);

COMMENT ON TABLE glucose_thresholds IS 'Context-specific glucose threshold configurations';
COMMENT ON COLUMN glucose_thresholds.profile_id IS 'Profile these thresholds belong to';
COMMENT ON COLUMN glucose_thresholds.context IS 'Context these thresholds apply to';
COMMENT ON COLUMN glucose_thresholds.low IS 'Hypoglycemia threshold (mg/dL)';
COMMENT ON COLUMN glucose_thresholds.target_min IS 'Target range minimum (mg/dL)';
COMMENT ON COLUMN glucose_thresholds.target_max IS 'Target range maximum (mg/dL)';
COMMENT ON COLUMN glucose_thresholds.high IS 'Hyperglycemia threshold (mg/dL)';

-- ============================================================================
-- Table: reminders
-- ============================================================================
-- Scheduled reminders for glucose measurements or medication
-- Stored per user (not per profile) as reminders are personal

CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (LENGTH(title) <= 100),
  description TEXT CHECK (LENGTH(description) <= 500),
  time TIME NOT NULL,
  days_of_week INTEGER[] NOT NULL CHECK (
    ARRAY_LENGTH(days_of_week, 1) > 0 AND
    days_of_week <@ ARRAY[0,1,2,3,4,5,6]
  ),
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for frequent queries
CREATE INDEX idx_reminders_user ON reminders(user_id);
CREATE INDEX idx_reminders_enabled ON reminders(user_id, enabled) WHERE enabled = true;

COMMENT ON TABLE reminders IS 'Scheduled reminders for measurements or medication';
COMMENT ON COLUMN reminders.user_id IS 'User who owns this reminder';
COMMENT ON COLUMN reminders.time IS 'Time of day for reminder (HH:MM)';
COMMENT ON COLUMN reminders.days_of_week IS 'Days when reminder is active (0=Sunday, 6=Saturday)';

-- ============================================================================
-- Table: push_subscriptions
-- ============================================================================
-- Web Push API subscription endpoints for notifications
-- Stores subscription objects for Push API

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate subscriptions
  CONSTRAINT unique_push_endpoint UNIQUE (user_id, endpoint)
);

-- Indices for frequent queries
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

COMMENT ON TABLE push_subscriptions IS 'Web Push API subscription endpoints';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'User public key for encryption';
COMMENT ON COLUMN push_subscriptions.auth IS 'Authentication secret';

-- ============================================================================
-- Table: audit_logs
-- ============================================================================
-- Audit trail for all data changes
-- Immutable log for compliance and debugging

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action audit_action NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for frequent queries
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

COMMENT ON TABLE audit_logs IS 'Audit trail for all data changes (immutable)';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (table name)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of affected entity';
COMMENT ON COLUMN audit_logs.changes IS 'JSON with before/after values';

-- ============================================================================
-- Table: user_consents
-- ============================================================================
-- LGPD consent tracking
-- Records user consent for data processing and sharing

CREATE TABLE user_consents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN (
    'data_processing',
    'data_sharing',
    'marketing',
    'analytics'
  )),
  given BOOLEAN NOT NULL,
  given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  version TEXT NOT NULL DEFAULT '1.0',
  ip_address INET,
  user_agent TEXT,

  -- Track consent history
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for frequent queries
CREATE INDEX idx_user_consents_user ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(user_id, consent_type);
CREATE INDEX idx_user_consents_given ON user_consents(given) WHERE given = true;

COMMENT ON TABLE user_consents IS 'LGPD consent tracking';
COMMENT ON COLUMN user_consents.consent_type IS 'Type of consent given';
COMMENT ON COLUMN user_consents.given IS 'Whether consent is currently active';
COMMENT ON COLUMN user_consents.version IS 'Version of consent terms';

-- ============================================================================
-- Triggers
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables with updated_at column
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_glucose_readings_updated_at
  BEFORE UPDATE ON glucose_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_glucose_thresholds_updated_at
  BEFORE UPDATE ON glucose_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Initial Data
-- ============================================================================

-- No initial data required for MVP
-- Users and profiles will be created through the application

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON SCHEMA public IS 'Glucose Tracking Application - Initial Schema v1.0';
