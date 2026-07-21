/**
 * API Route: /api/thresholds/[id]
 * Handles operations on a single glucose threshold (GET, PATCH, DELETE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import { getThresholdById } from '@/lib/supabase/queries';
import { updateThresholdSchema } from '@/lib/validations/schemas';
import { checkProfileAccess } from '@/lib/auth/access-control';
import type { ApiResponse, UpdateThresholdRequest } from '@/types/api';
import type { GlucoseThreshold } from '@/types/database';
import { ApiErrorCode } from '@/types/api';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET /api/thresholds/[id]
 * Get a single glucose threshold by ID
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
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

    const thresholdId = params.id;

    // Fetch threshold
    const supabase = createServerClient();
    const threshold = await getThresholdById(supabase, thresholdId);

    if (!threshold) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.NOT_FOUND,
            message: 'Limite de glicemia não encontrado',
          },
        },
        { status: 404 }
      );
    }

    // Check access to threshold's profile
    const { hasAccess } = await checkProfileAccess(
      supabase,
      userId,
      threshold.profile_id
    );

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.FORBIDDEN,
            message: 'Acesso negado a este limite de glicemia',
          },
        },
        { status: 403 }
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
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching threshold:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao buscar limite de glicemia',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/thresholds/[id]
 * Update a glucose threshold's values
 * Body: { low, target_min, target_max, high }
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
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

    const thresholdId = params.id;

    // Fetch existing threshold
    const supabase = createServerClient();
    const existingThreshold = await getThresholdById(supabase, thresholdId);

    if (!existingThreshold) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.NOT_FOUND,
            message: 'Limite de glicemia não encontrado',
          },
        },
        { status: 404 }
      );
    }

    // Check access to threshold's profile (requires write access)
    const { hasAccess, accessLevel } = await checkProfileAccess(
      supabase,
      userId,
      existingThreshold.profile_id
    );

    if (!hasAccess || (accessLevel !== 'owner' && accessLevel !== 'write')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.FORBIDDEN,
            message: 'Acesso negado para atualizar este limite de glicemia',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body: UpdateThresholdRequest = await request.json();
    const validation = updateThresholdSchema.safeParse(body);

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

    // Update threshold in database
    const { data: updatedThreshold, error: updateError } = await supabase
      .from('glucose_thresholds')
      .update(validation.data)
      .eq('id', thresholdId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating threshold:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Erro ao atualizar limite de glicemia',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedThreshold,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating threshold:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao atualizar limite de glicemia',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/thresholds/[id]
 * Delete a glucose threshold
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<void>> {
  try {
    // Check authentication
    const session = await getSession();
    const userId = getUserIdFromSession(session);

    if (!userId) {
      return new NextResponse(null, { status: 401 });
    }

    const thresholdId = params.id;

    // Fetch existing threshold
    const supabase = createServerClient();
    const existingThreshold = await getThresholdById(supabase, thresholdId);

    if (!existingThreshold) {
      return new NextResponse(null, { status: 404 });
    }

    // Check access to threshold's profile (requires write access)
    const { hasAccess, accessLevel } = await checkProfileAccess(
      supabase,
      userId,
      existingThreshold.profile_id
    );

    if (!hasAccess || (accessLevel !== 'owner' && accessLevel !== 'write')) {
      return new NextResponse(null, { status: 403 });
    }

    // Delete threshold from database
    const { error: deleteError } = await supabase
      .from('glucose_thresholds')
      .delete()
      .eq('id', thresholdId);

    if (deleteError) {
      console.error('Error deleting threshold:', deleteError);
      return new NextResponse(null, { status: 500 });
    }

    // Return 204 No Content for successful deletion
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting threshold:', error);
    return new NextResponse(null, { status: 500 });
  }
}
