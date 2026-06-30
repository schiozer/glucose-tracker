/**
 * Supabase query helper functions for Glucose Tracking Application
 *
 * Provides typed query functions for profiles, readings, and thresholds.
 * All functions accept a Supabase client instance to allow usage from
 * both client and server contexts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Profile,
  GlucoseReading,
  GlucoseThreshold,
  GlucoseContext,
} from '@/types/database';

// ============================================================================
// Profile Queries
// ============================================================================

/**
 * Get all profiles accessible by a user
 * Includes:
 * - Profiles owned by the user (user_id matches)
 * - Profiles shared via caregiver access (where user is caregiver)
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch profiles for
 * @returns Array of profiles sorted by creation date (newest first)
 */
export async function getProfilesByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile[]> {
  // First get user's own profiles
  const { data: ownProfiles, error: ownError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (ownError) throw ownError;

  // Then get profiles shared via caregiver access
  const { data: caregiverAccess, error: accessError } = await supabase
    .from('caregiver_access')
    .select('patient_id')
    .eq('caregiver_id', userId)
    .eq('revoked', false);

  if (accessError) throw accessError;

  if (!caregiverAccess || caregiverAccess.length === 0) {
    return ownProfiles || [];
  }

  const patientIds = caregiverAccess.map((access) => access.patient_id);
  const { data: sharedProfiles, error: sharedError } = await supabase
    .from('profiles')
    .select('*')
    .in('user_id', patientIds)
    .order('created_at', { ascending: false });

  if (sharedError) throw sharedError;

  // Combine and deduplicate
  const allProfiles = [...(ownProfiles || []), ...(sharedProfiles || [])];
  const uniqueProfiles = allProfiles.filter(
    (profile, index, self) =>
      index === self.findIndex((p) => p.id === profile.id)
  );

  return uniqueProfiles;
}

/**
 * Get a single profile by ID
 *
 * @param supabase - Supabase client instance
 * @param profileId - Profile ID to fetch
 * @returns Profile or null if not found
 */
export async function getProfileById(
  supabase: SupabaseClient,
  profileId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

// ============================================================================
// Glucose Reading Queries
// ============================================================================

export interface GetReadingsOptions {
  startDate?: string;
  endDate?: string;
  context?: GlucoseContext;
  page?: number;
  perPage?: number;
}

export interface GetReadingsResult {
  readings: GlucoseReading[];
  total: number;
}

/**
 * Get glucose readings for a user with optional filters and pagination
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch readings for
 * @param options - Optional filters and pagination parameters
 * @returns Object with readings array and total count
 */
export async function getReadingsByUserId(
  supabase: SupabaseClient,
  userId: string,
  options?: GetReadingsOptions
): Promise<GetReadingsResult> {
  const page = options?.page || 1;
  const perPage = options?.perPage || 50;
  const offset = (page - 1) * perPage;

  let query = supabase
    .from('glucose_readings')
    .select('*', { count: 'exact' })
    .eq('user_id', userId);

  if (options?.startDate) {
    query = query.gte('reading_date', options.startDate);
  }
  if (options?.endDate) {
    query = query.lte('reading_date', options.endDate);
  }
  if (options?.context) {
    query = query.eq('context', options.context);
  }

  query = query
    .order('reading_date', { ascending: false })
    .range(offset, offset + perPage - 1);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    readings: data || [],
    total: count || 0,
  };
}

/**
 * Get a single glucose reading by ID
 *
 * @param supabase - Supabase client instance
 * @param readingId - Reading ID to fetch
 * @returns Glucose reading or null if not found
 */
export async function getReadingById(
  supabase: SupabaseClient,
  readingId: string
): Promise<GlucoseReading | null> {
  const { data, error } = await supabase
    .from('glucose_readings')
    .select('*')
    .eq('id', readingId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

// ============================================================================
// Glucose Threshold Queries
// ============================================================================

/**
 * Get glucose threshold for a user
 * Note: Each user has one set of thresholds
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch thresholds for
 * @returns Glucose threshold or null if not configured
 */
export async function getThresholdByUserId(
  supabase: SupabaseClient,
  userId: string
): Promise<GlucoseThreshold | null> {
  const { data, error } = await supabase
    .from('glucose_thresholds')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

// ============================================================================
// Default Thresholds
// ============================================================================

/**
 * Default glucose thresholds by context when user hasn't configured custom values
 *
 * Based on ADA (American Diabetes Association) and SBD (Sociedade Brasileira de Diabetes) guidelines:
 * - Fasting: 70-100 mg/dL target, <70 low, >126 high
 * - Pre-meal: Similar to fasting but slightly higher tolerance
 * - Post-meal: 90-180 mg/dL target (up to 2h after eating)
 * - Bedtime: 100-140 mg/dL target (higher to prevent nocturnal hypoglycemia)
 * - Night: Similar to bedtime
 * - Exercise: Standard range but monitor for delayed hypoglycemia
 * - Sick/Stress: Slightly higher targets expected
 */
export const DEFAULT_THRESHOLDS: Record<
  GlucoseContext,
  Pick<GlucoseThreshold, 'low' | 'target_min' | 'target_max' | 'high'>
> = {
  fasting: {
    low: 70,
    target_min: 80,
    target_max: 100,
    high: 126,
  },
  pre_meal: {
    low: 70,
    target_min: 80,
    target_max: 130,
    high: 180,
  },
  post_meal: {
    low: 70,
    target_min: 90,
    target_max: 180,
    high: 250,
  },
  bedtime: {
    low: 70,
    target_min: 100,
    target_max: 140,
    high: 180,
  },
  night: {
    low: 70,
    target_min: 100,
    target_max: 140,
    high: 180,
  },
  exercise: {
    low: 70,
    target_min: 80,
    target_max: 150,
    high: 200,
  },
  sick: {
    low: 70,
    target_min: 90,
    target_max: 160,
    high: 250,
  },
  stress: {
    low: 70,
    target_min: 90,
    target_max: 160,
    high: 220,
  },
  other: {
    low: 70,
    target_min: 80,
    target_max: 140,
    high: 200,
  },
};

/**
 * Get effective thresholds for a user and context
 * Returns custom threshold if configured, otherwise returns defaults
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param context - Glucose context
 * @returns Effective threshold values
 */
export async function getEffectiveThreshold(
  supabase: SupabaseClient,
  userId: string,
  context: GlucoseContext
): Promise<Pick<GlucoseThreshold, 'low' | 'target_min' | 'target_max' | 'high'>> {
  const customThreshold = await getThresholdByUserId(supabase, userId);

  if (customThreshold) {
    return {
      low: customThreshold.low,
      target_min: customThreshold.target_min,
      target_max: customThreshold.target_max,
      high: customThreshold.high,
    };
  }

  return DEFAULT_THRESHOLDS[context];
}
