-- ============================================================================
-- Glucose Tracking Application - Row Level Security (RLS) Policies
-- ============================================================================
-- Implements fine-grained access control for all tables
--
-- Security Model:
--   - Users can only access their own data
--   - Profiles: own profiles + profiles shared via caregiver_access
--   - Readings/Thresholds: accessible through profile ownership/caregiver access
--   - Reminders: own reminders only
--   - Caregiver access: granted/revoked by profile owner
--   - Audit logs: read own logs, service role can insert
--   - User consents: own consents only
--
-- Critical:
--   - RLS enabled on ALL tables
--   - Policies use auth.uid() for authenticated user context
--   - Service role bypasses RLS for system operations
--   - Caregiver access respects revoked flag
-- ============================================================================

-- ============================================================================
-- Enable RLS on All Tables
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE caregiver_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE glucose_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper Functions for RLS
-- ============================================================================

-- Check if current user has access to a profile (as owner or caregiver)
CREATE OR REPLACE FUNCTION has_profile_access(profile_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- User owns the profile
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = profile_id AND u.auth0_id = auth.uid()
  ) OR EXISTS (
    -- User has active caregiver access to the profile owner
    SELECT 1 FROM profiles p
    JOIN caregiver_access ca ON ca.patient_id = p.user_id
    JOIN users u ON ca.caregiver_id = u.id
    WHERE p.id = profile_id
      AND u.auth0_id = auth.uid()
      AND ca.revoked = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get current user's UUID from auth.uid()
CREATE OR REPLACE FUNCTION get_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth0_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- Table: users
-- ============================================================================
-- Users can read and update their own record

-- Select: users can view their own record
CREATE POLICY users_select_own ON users
  FOR SELECT
  USING (auth0_id = auth.uid());

-- Update: users can update their own record
CREATE POLICY users_update_own ON users
  FOR UPDATE
  USING (auth0_id = auth.uid())
  WITH CHECK (auth0_id = auth.uid());

-- Insert: users are created via service role during Auth0 sync
-- (no public insert policy)

-- Delete: users can delete their own account (cascades to all data)
CREATE POLICY users_delete_own ON users
  FOR DELETE
  USING (auth0_id = auth.uid());

COMMENT ON POLICY users_select_own ON users IS 'Users can view their own record';
COMMENT ON POLICY users_update_own ON users IS 'Users can update their own record';
COMMENT ON POLICY users_delete_own ON users IS 'Users can delete their own account';

-- ============================================================================
-- Table: profiles
-- ============================================================================
-- Users can manage their own profiles and view profiles shared with them

-- Select: own profiles + profiles shared via caregiver access
CREATE POLICY profiles_select_accessible ON profiles
  FOR SELECT
  USING (
    user_id = get_user_id()
    OR
    user_id IN (
      SELECT patient_id FROM caregiver_access
      WHERE caregiver_id = get_user_id() AND revoked = false
    )
  );

-- Insert: users can create their own profiles
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT
  WITH CHECK (user_id = get_user_id());

-- Update: users can update their own profiles
-- Caregivers with 'write' access can also update
CREATE POLICY profiles_update_accessible ON profiles
  FOR UPDATE
  USING (
    user_id = get_user_id()
    OR
    user_id IN (
      SELECT patient_id FROM caregiver_access
      WHERE caregiver_id = get_user_id()
        AND revoked = false
        AND access_level = 'write'
    )
  )
  WITH CHECK (
    user_id = get_user_id()
    OR
    user_id IN (
      SELECT patient_id FROM caregiver_access
      WHERE caregiver_id = get_user_id()
        AND revoked = false
        AND access_level = 'write'
    )
  );

-- Delete: users can delete their own profiles
CREATE POLICY profiles_delete_own ON profiles
  FOR DELETE
  USING (user_id = get_user_id());

COMMENT ON POLICY profiles_select_accessible ON profiles IS 'Users can view own profiles and those shared with them';
COMMENT ON POLICY profiles_insert_own ON profiles IS 'Users can create their own profiles';
COMMENT ON POLICY profiles_update_accessible ON profiles IS 'Users can update own profiles; caregivers with write access can update shared profiles';
COMMENT ON POLICY profiles_delete_own ON profiles IS 'Users can delete their own profiles';

-- ============================================================================
-- Table: caregiver_access
-- ============================================================================
-- Patients grant/revoke access; caregivers view their access grants

-- Select: patient can see who has access, caregiver can see what they have access to
CREATE POLICY caregiver_access_select ON caregiver_access
  FOR SELECT
  USING (
    patient_id = get_user_id()
    OR
    caregiver_id = get_user_id()
  );

-- Insert: only patient (or person acting on behalf) can grant access
CREATE POLICY caregiver_access_insert_by_patient ON caregiver_access
  FOR INSERT
  WITH CHECK (patient_id = get_user_id() OR granted_by = get_user_id());

-- Update: only patient can revoke access (set revoked = true)
CREATE POLICY caregiver_access_update_by_patient ON caregiver_access
  FOR UPDATE
  USING (patient_id = get_user_id())
  WITH CHECK (patient_id = get_user_id());

-- Delete: patient can delete access grants
CREATE POLICY caregiver_access_delete_by_patient ON caregiver_access
  FOR DELETE
  USING (patient_id = get_user_id());

COMMENT ON POLICY caregiver_access_select ON caregiver_access IS 'Patients and caregivers can view access grants';
COMMENT ON POLICY caregiver_access_insert_by_patient ON caregiver_access IS 'Patients can grant caregiver access';
COMMENT ON POLICY caregiver_access_update_by_patient ON caregiver_access IS 'Patients can revoke caregiver access';
COMMENT ON POLICY caregiver_access_delete_by_patient ON caregiver_access IS 'Patients can delete access grants';

-- ============================================================================
-- Table: glucose_readings
-- ============================================================================
-- Users can manage readings for profiles they have access to

-- Select: readings for accessible profiles
CREATE POLICY glucose_readings_select_accessible ON glucose_readings
  FOR SELECT
  USING (has_profile_access(profile_id));

-- Insert: readings for accessible profiles (with write access)
CREATE POLICY glucose_readings_insert_accessible ON glucose_readings
  FOR INSERT
  WITH CHECK (
    has_profile_access(profile_id)
    AND (
      -- User owns the profile
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = profile_id AND p.user_id = get_user_id()
      )
      OR
      -- User has write access via caregiver
      EXISTS (
        SELECT 1 FROM profiles p
        JOIN caregiver_access ca ON ca.patient_id = p.user_id
        WHERE p.id = profile_id
          AND ca.caregiver_id = get_user_id()
          AND ca.revoked = false
          AND ca.access_level = 'write'
      )
    )
  );

-- Update: readings for accessible profiles (with write access)
CREATE POLICY glucose_readings_update_accessible ON glucose_readings
  FOR UPDATE
  USING (
    has_profile_access(profile_id)
    AND (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = profile_id AND p.user_id = get_user_id()
      )
      OR
      EXISTS (
        SELECT 1 FROM profiles p
        JOIN caregiver_access ca ON ca.patient_id = p.user_id
        WHERE p.id = profile_id
          AND ca.caregiver_id = get_user_id()
          AND ca.revoked = false
          AND ca.access_level = 'write'
      )
    )
  )
  WITH CHECK (has_profile_access(profile_id));

-- Delete: readings for own profiles only
CREATE POLICY glucose_readings_delete_own ON glucose_readings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = profile_id AND p.user_id = get_user_id()
    )
  );

COMMENT ON POLICY glucose_readings_select_accessible ON glucose_readings IS 'Users can view readings for accessible profiles';
COMMENT ON POLICY glucose_readings_insert_accessible ON glucose_readings IS 'Users can add readings to accessible profiles with write access';
COMMENT ON POLICY glucose_readings_update_accessible ON glucose_readings IS 'Users can update readings for accessible profiles with write access';
COMMENT ON POLICY glucose_readings_delete_own ON glucose_readings IS 'Users can delete readings from their own profiles';

-- ============================================================================
-- Table: glucose_thresholds
-- ============================================================================
-- Users can manage thresholds for profiles they have access to

-- Select: thresholds for accessible profiles
CREATE POLICY glucose_thresholds_select_accessible ON glucose_thresholds
  FOR SELECT
  USING (has_profile_access(profile_id));

-- Insert: thresholds for own profiles or shared profiles with write access
CREATE POLICY glucose_thresholds_insert_accessible ON glucose_thresholds
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = profile_id AND p.user_id = get_user_id()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN caregiver_access ca ON ca.patient_id = p.user_id
      WHERE p.id = profile_id
        AND ca.caregiver_id = get_user_id()
        AND ca.revoked = false
        AND ca.access_level = 'write'
    )
  );

-- Update: thresholds for own profiles or shared profiles with write access
CREATE POLICY glucose_thresholds_update_accessible ON glucose_thresholds
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = profile_id AND p.user_id = get_user_id()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN caregiver_access ca ON ca.patient_id = p.user_id
      WHERE p.id = profile_id
        AND ca.caregiver_id = get_user_id()
        AND ca.revoked = false
        AND ca.access_level = 'write'
    )
  )
  WITH CHECK (has_profile_access(profile_id));

-- Delete: thresholds for own profiles only
CREATE POLICY glucose_thresholds_delete_own ON glucose_thresholds
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = profile_id AND p.user_id = get_user_id()
    )
  );

COMMENT ON POLICY glucose_thresholds_select_accessible ON glucose_thresholds IS 'Users can view thresholds for accessible profiles';
COMMENT ON POLICY glucose_thresholds_insert_accessible ON glucose_thresholds IS 'Users can create thresholds for accessible profiles with write access';
COMMENT ON POLICY glucose_thresholds_update_accessible ON glucose_thresholds IS 'Users can update thresholds for accessible profiles with write access';
COMMENT ON POLICY glucose_thresholds_delete_own ON glucose_thresholds IS 'Users can delete thresholds from their own profiles';

-- ============================================================================
-- Table: reminders
-- ============================================================================
-- Users can only manage their own reminders

-- Select: own reminders only
CREATE POLICY reminders_select_own ON reminders
  FOR SELECT
  USING (user_id = get_user_id());

-- Insert: own reminders only
CREATE POLICY reminders_insert_own ON reminders
  FOR INSERT
  WITH CHECK (user_id = get_user_id());

-- Update: own reminders only
CREATE POLICY reminders_update_own ON reminders
  FOR UPDATE
  USING (user_id = get_user_id())
  WITH CHECK (user_id = get_user_id());

-- Delete: own reminders only
CREATE POLICY reminders_delete_own ON reminders
  FOR DELETE
  USING (user_id = get_user_id());

COMMENT ON POLICY reminders_select_own ON reminders IS 'Users can view their own reminders';
COMMENT ON POLICY reminders_insert_own ON reminders IS 'Users can create their own reminders';
COMMENT ON POLICY reminders_update_own ON reminders IS 'Users can update their own reminders';
COMMENT ON POLICY reminders_delete_own ON reminders IS 'Users can delete their own reminders';

-- ============================================================================
-- Table: push_subscriptions
-- ============================================================================
-- Users can only manage their own push subscriptions

-- Select: own subscriptions only
CREATE POLICY push_subscriptions_select_own ON push_subscriptions
  FOR SELECT
  USING (user_id = get_user_id());

-- Insert: own subscriptions only
CREATE POLICY push_subscriptions_insert_own ON push_subscriptions
  FOR INSERT
  WITH CHECK (user_id = get_user_id());

-- Update: own subscriptions only
CREATE POLICY push_subscriptions_update_own ON push_subscriptions
  FOR UPDATE
  USING (user_id = get_user_id())
  WITH CHECK (user_id = get_user_id());

-- Delete: own subscriptions only
CREATE POLICY push_subscriptions_delete_own ON push_subscriptions
  FOR DELETE
  USING (user_id = get_user_id());

COMMENT ON POLICY push_subscriptions_select_own ON push_subscriptions IS 'Users can view their own push subscriptions';
COMMENT ON POLICY push_subscriptions_insert_own ON push_subscriptions IS 'Users can create their own push subscriptions';
COMMENT ON POLICY push_subscriptions_update_own ON push_subscriptions IS 'Users can update their own push subscriptions';
COMMENT ON POLICY push_subscriptions_delete_own ON push_subscriptions IS 'Users can delete their own push subscriptions';

-- ============================================================================
-- Table: audit_logs
-- ============================================================================
-- Users can read their own audit logs
-- Service role can insert (for system-generated logs)

-- Select: own audit logs only
CREATE POLICY audit_logs_select_own ON audit_logs
  FOR SELECT
  USING (user_id = get_user_id());

-- Insert: service role only (no public insert)
-- Application code will use service role to insert audit logs

-- Update: no updates allowed (immutable log)
-- Delete: no deletes allowed (immutable log)

COMMENT ON POLICY audit_logs_select_own ON audit_logs IS 'Users can view their own audit logs';

-- ============================================================================
-- Table: user_consents
-- ============================================================================
-- Users can manage their own consent records

-- Select: own consents only
CREATE POLICY user_consents_select_own ON user_consents
  FOR SELECT
  USING (user_id = get_user_id());

-- Insert: own consents only
CREATE POLICY user_consents_insert_own ON user_consents
  FOR INSERT
  WITH CHECK (user_id = get_user_id());

-- Update: own consents only (for revoking)
CREATE POLICY user_consents_update_own ON user_consents
  FOR UPDATE
  USING (user_id = get_user_id())
  WITH CHECK (user_id = get_user_id());

-- Delete: no deletes (maintain consent history)

COMMENT ON POLICY user_consents_select_own ON user_consents IS 'Users can view their own consent records';
COMMENT ON POLICY user_consents_insert_own ON user_consents IS 'Users can create their own consent records';
COMMENT ON POLICY user_consents_update_own ON user_consents IS 'Users can update their own consent records (for revoking)';

-- ============================================================================
-- Security Functions for Application Layer
-- ============================================================================

-- Check if user can write to a profile (for API-level authorization checks)
CREATE OR REPLACE FUNCTION can_write_to_profile(profile_id UUID, user_auth0_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- User owns the profile
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = profile_id AND u.auth0_id = user_auth0_id
  ) OR EXISTS (
    -- User has write access via caregiver
    SELECT 1 FROM profiles p
    JOIN caregiver_access ca ON ca.patient_id = p.user_id
    JOIN users u ON ca.caregiver_id = u.id
    WHERE p.id = profile_id
      AND u.auth0_id = user_auth0_id
      AND ca.revoked = false
      AND ca.access_level = 'write'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can read a profile (for API-level authorization checks)
CREATE OR REPLACE FUNCTION can_read_profile(profile_id UUID, user_auth0_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- User owns the profile
    SELECT 1 FROM profiles p
    JOIN users u ON p.user_id = u.id
    WHERE p.id = profile_id AND u.auth0_id = user_auth0_id
  ) OR EXISTS (
    -- User has caregiver access (read or write)
    SELECT 1 FROM profiles p
    JOIN caregiver_access ca ON ca.patient_id = p.user_id
    JOIN users u ON ca.caregiver_id = u.id
    WHERE p.id = profile_id
      AND u.auth0_id = user_auth0_id
      AND ca.revoked = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RLS Policies Complete
-- ============================================================================

COMMENT ON SCHEMA public IS 'Glucose Tracking Application - RLS Policies v1.0';
