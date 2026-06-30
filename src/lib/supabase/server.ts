/**
 * Supabase client for server-side usage (API Routes, Server Components)
 *
 * Uses service role key for elevated privileges and bypasses RLS.
 * Should only be used in trusted server-side contexts.
 * Session persistence is disabled for security.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.'
  );
}

/**
 * Creates a Supabase client for server-side usage with service role privileges
 *
 * WARNING: This client bypasses Row Level Security (RLS).
 * Use with caution and only in trusted server contexts.
 *
 * @returns Supabase client instance with service role access
 */
export function createServerClient() {
  return createSupabaseClient(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
