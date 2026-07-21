/**
 * API Route: /api/thresholds
 * Handles listing glucose thresholds (GET) and creating new thresholds (POST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import { getThresholdsByProfileId } from '@/lib/supabase/queries';
import { createThresholdSchema } from '@/lib/validations/schemas';
import { checkProfileAccess } from '@/lib/auth/access-control';
import type { ApiResponse, CreateThresholdRequest } from '@/types/api';
import type { GlucoseThreshold } from '@/types/database';
import { ApiErrorCode } from '@/types/api';

/**
 * GET /api/thresholds
 * List all thresholds for a specific profile (one per context)
 * Query params: profile_id (required)
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GlucoseThreshold[]>>> {
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

    // Fetch thresholds for profile
    const thresholds = await getThresholdsByProfileId(supabase, profileId);

    return NextResponse.json(
      {
        success: true,
        data: thresholds,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao buscar limites de glicemia',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/thresholds
 * Create a new glucose threshold for a profile and context
 * Body: { profile_id, context, low, target_min, target_max, high }
 */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<GlucoseThreshold>>> {
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

    // Parse and validate request body
    const body: CreateThresholdRequest = await request.json();
    const validation = createThresholdSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.VALIDATION_ERROR,
            message: 'Dados inválidos',
            details: { errors },
          },
        },
        { status: 400 }
      );
    }

    const { profile_id, context, low, target_min, target_max, high } = validation.data;

    // Check access to profile (requires write access)
    const supabase = createServerClient();
    const { hasAccess, accessLevel } = await checkProfileAccess(
      supabase,
      userId,
      profile_id
    );

    if (!hasAccess || (accessLevel !== 'owner' && accessLevel !== 'write')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.FORBIDDEN,
            message: 'Acesso negado para criar limites neste perfil',
          },
        },
        { status: 403 }
      );
    }

    // Insert threshold into database
    const { data: threshold, error: insertError } = await supabase
      .from('glucose_thresholds')
      .insert({
        profile_id,
        context,
        low,
        target_min,
        target_max,
        high,
      })
      .select()
      .single();

    if (insertError) {
      // Check for unique constraint violation (duplicate profile_id + context)
      if (insertError.code === '23505') {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: ApiErrorCode.CONFLICT,
              message: 'Já existe um limite configurado para este contexto neste perfil',
            },
          },
          { status: 409 }
        );
      }

      console.error('Error inserting threshold:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Erro ao criar limite de glicemia',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: threshold,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating threshold:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao criar limite de glicemia',
        },
      },
      { status: 500 }
    );
  }
}
