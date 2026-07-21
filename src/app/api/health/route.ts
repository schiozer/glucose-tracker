/**
 * API Route: /api/health
 * Health check endpoint for monitoring
 * No authentication required - public endpoint for monitoring systems
 */

import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: 'connected' | 'error';
    auth: 'configured' | 'error';
  };
  version: string;
}

/**
 * GET /api/health
 * Health check endpoint for monitoring
 * Verifies Supabase connection and Auth0 configuration
 * Returns 200 if healthy, 503 if any check fails
 */
export async function GET(): Promise<NextResponse<HealthCheckResponse>> {
  const timestamp = new Date().toISOString();
  const checks = {
    database: 'error' as const,
    auth: 'error' as const,
  };

  try {
    // Check Auth0 configuration
    const auth0Url = process.env.AUTH0_ISSUER_BASE_URL;
    const auth0ClientId = process.env.AUTH0_CLIENT_ID;
    const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET;

    if (auth0Url && auth0ClientId && auth0ClientSecret) {
      checks.auth = 'configured';
    }

    // Check Supabase connection
    const supabase = createServerClient();

    // Simple database connectivity check
    const { error: dbError } = await supabase.from('profiles').select('1').limit(1);

    if (!dbError) {
      checks.database = 'connected';
    }

    // Determine overall status
    const isHealthy = checks.database === 'connected' && checks.auth === 'configured';
    const status: HealthCheckResponse['status'] = isHealthy ? 'healthy' : 'unhealthy';
    const statusCode = isHealthy ? 200 : 503;

    return NextResponse.json(
      {
        status,
        timestamp,
        checks,
        version: '1.0.0',
      },
      { status: statusCode }
    );
  } catch (error) {
    console.error('Health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp,
        checks,
        version: '1.0.0',
      },
      { status: 503 }
    );
  }
}
