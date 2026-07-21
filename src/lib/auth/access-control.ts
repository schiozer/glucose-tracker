/**
 * Access Control Utilities
 * Shared functions for checking user access to profiles
 */

import { createServerClient } from '@/lib/supabase/server';
import { getProfileById } from '@/lib/supabase/queries';
import type { Profile } from '@/types/database';

export type AccessLevel = 'owner' | 'read' | 'write';

export interface ProfileAccessResult {
  hasAccess: boolean;
  accessLevel?: AccessLevel;
  profile?: Profile;
}

/**
 * Check if user has access to a profile
 *
 * User has access if they are:
 * - The profile owner (user_id matches)
 * - A caregiver with active access
 *
 * @param supabase - Supabase server client
 * @param userId - Current authenticated user ID
 * @param profileId - Target profile ID to check access for
 * @returns Access information including hasAccess flag, access level, and profile data (if requested)
 *
 * @example
 * ```ts
 * const supabase = createServerClient();
 * const { hasAccess, accessLevel, profile } = await checkProfileAccess(
 *   supabase,
 *   'user-123',
 *   'profile-456'
 * );
 *
 * if (!hasAccess) {
 *   return NextResponse.json({ error: 'Access denied' }, { status: 403 });
 * }
 * ```
 */
export async function checkProfileAccess(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  profileId: string
): Promise<ProfileAccessResult> {
  // Check if user is the profile owner
  const profile = await getProfileById(supabase, profileId);

  if (!profile) {
    return { hasAccess: false };
  }

  if (profile.user_id === userId) {
    return { hasAccess: true, accessLevel: 'owner', profile };
  }

  // Check caregiver access
  const { data: caregiverAccess, error } = await supabase
    .from('caregiver_access')
    .select('access_level')
    .eq('patient_id', profile.user_id)
    .eq('caregiver_id', userId)
    .eq('revoked', false)
    .single();

  if (error || !caregiverAccess) {
    return { hasAccess: false };
  }

  return {
    hasAccess: true,
    accessLevel: caregiverAccess.access_level as AccessLevel,
    profile,
  };
}
