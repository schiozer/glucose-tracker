/**
 * API Route: /api/readings/stats
 * Handles glucose reading statistics calculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import {
  getReadingsByProfileId,
  getProfileById,
  getEffectiveThreshold,
  DEFAULT_THRESHOLDS,
} from '@/lib/supabase/queries';
import { calculateStats } from '@/lib/utils/calculations';
import type { ApiResponse } from '@/types/api';
import type { GlucoseContext } from '@/types/database';
import { ApiErrorCode } from '@/types/api';

/**
 * Check if user has access to a profile
 */
async function checkProfileAccess(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  profileId: string
): Promise<{ hasAccess: boolean }> {
  const profile = await getProfileById(supabase, profileId);

  if (!profile) {
    return { hasAccess: false };
  }

  if (profile.user_id === userId) {
    return { hasAccess: true };
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

  return { hasAccess: true };
}

export interface ReadingStats {
  period: {
    start_date?: string;
    end_date?: string;
    context?: GlucoseContext;
  };
  statistics: {
    average: number;
    min: number;
    max: number;
    stdDev: number;
    count: number;
  };
  timeInRange: {
    inTargetPct: number;
    belowTargetPct: number;
    aboveTargetPct: number;
    unknownPct: number;
  };
}

/**
 * GET /api/readings/stats
 * Calculate statistics for glucose readings
 * Query params: profile_id (required), start_date, end_date, context
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<ReadingStats>>> {
  try {
    // Check authentication
    const session = await getSession();
    const userId = getUserIdFromSession(session);

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.UNAUTHORIZED,
            message: 'Usuário não autenticado',
          },
        },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const profileId = searchParams.get('profile_id');

    if (!profileId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'profile_id é obrigatório',
          },
        },
        { status: 400 }
      );
    }

    // Check access to profile
    const supabase = createServerClient();
    const { hasAccess } = await checkProfileAccess(supabase, userId, profileId);

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.FORBIDDEN,
            message: 'Acesso negado a este perfil',
          },
        },
        { status: 403 }
      );
    }

    // Extract filter parameters
    const startDate = searchParams.get('start_date') || undefined;
    const endDate = searchParams.get('end_date') || undefined;
    const context = searchParams.get('context') as GlucoseContext | undefined;

    // Validate date range
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Data inicial deve ser anterior ou igual à data final',
          },
        },
        { status: 400 }
      );
    }

    // Fetch readings with filters (no pagination for stats)
    const { readings } = await getReadingsByProfileId(supabase, profileId, {
      startDate,
      endDate,
      context,
      perPage: 10000, // Large number to get all readings
    });

    if (readings.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            period: {
              start_date: startDate,
              end_date: endDate,
              context,
            },
            statistics: {
              average: 0,
              min: 0,
              max: 0,
              stdDev: 0,
              count: 0,
            },
            timeInRange: {
              inTargetPct: 0,
              belowTargetPct: 0,
              aboveTargetPct: 0,
              unknownPct: 0,
            },
          },
          meta: {
            timestamp: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    }

    // Calculate statistics
    const stats = calculateStats(readings, (readingContext: GlucoseContext) => {
      // Use default thresholds for each reading's context
      return DEFAULT_THRESHOLDS[readingContext];
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          period: {
            start_date: startDate,
            end_date: endDate,
            context,
          },
          statistics: {
            average: stats.average,
            min: stats.min,
            max: stats.max,
            stdDev: stats.stdDev,
            count: stats.count,
          },
          timeInRange: {
            inTargetPct: stats.timeInTargetPct,
            belowTargetPct: stats.timeBelowTargetPct,
            aboveTargetPct: stats.timeAboveTargetPct,
            unknownPct: stats.timeUnknownPct,
          },
        },
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error calculating stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao calcular estatísticas',
        },
      },
      { status: 500 }
    );
  }
}
