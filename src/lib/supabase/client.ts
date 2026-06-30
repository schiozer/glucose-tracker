/**
 * Supabase client for client-side usage (Browser)
 *
 * Uses NEXT_PUBLIC environment variables for client-side access.
 * This client has Row Level Security (RLS) enabled and operates
 * with the authenticated user's permissions.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}

/**
 * Creates a Supabase client for browser usage
 *
 * @returns Supabase client instance
 */
export function createClient() {
  return createSupabaseClient(supabaseUrl!, supabaseAnonKey!);
}
