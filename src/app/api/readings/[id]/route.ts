/**
 * API Route: /api/readings/[id]
 * Handles single reading operations: GET, PATCH, DELETE
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import { getReadingById, getProfileById } from '@/lib/supabase/queries';
import { updateReadingSchema } from '@/lib/validations/schemas';
import type { ApiResponse, UpdateReadingRequest } from '@/types/api';
import type { GlucoseReading, Profile } from '@/types/database';
import { ApiErrorCode } from '@/types/api';

/**
 * Check if user has access to a reading
 * User has access if they have access to the reading's profile
 * Returns reading and profile to avoid redundant queries
 */
async function checkReadingAccess(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  readingId: string
): Promise<{
  hasAccess: boolean;
  accessLevel?: 'owner' | 'read' | 'write';
  reading?: GlucoseReading;
  profile?: Profile;
}> {
  // Fetch reading
  const reading = await getReadingById(supabase, readingId);

  if (!reading) {
    return { hasAccess: false };
  }

  // Fetch profile to check ownership
  const profile = await getProfileById(supabase, reading.profile_id);

  if (!profile) {
    return { hasAccess: false };
  }

  if (profile.user_id === userId) {
    return { hasAccess: true, accessLevel: 'owner', reading, profile };
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
    accessLevel: caregiverAccess.access_level as 'read' | 'write',
    reading,
    profile,
  };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/readings/[id]
 * Get a single glucose reading by ID
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<GlucoseReading>>> {
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

    // Get reading ID from URL params
    const { id: readingId } = await context.params;

    // Check access and fetch reading
    const supabase = createServerClient();
    const { hasAccess, reading } = await checkReadingAccess(
      supabase,
      userId,
      readingId
    );

    if (!reading) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.NOT_FOUND,
            message: 'Leitura não encontrada',
          },
        },
        { status: 404 }
      );
    }

    if (!hasAccess) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.FORBIDDEN,
            message: 'Acesso negado a esta leitura',
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: reading,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching reading:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao buscar leitura',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/readings/[id]
 * Update a reading (requires write access)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<GlucoseReading>>> {
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

    // Get reading ID from URL params
    const { id: readingId } = await context.params;

    // Check access and fetch reading
    const supabase = createServerClient();
    const { hasAccess, accessLevel, reading } = await checkReadingAccess(
      supabase,
      userId,
      readingId
    );

    if (!reading) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.NOT_FOUND,
            message: 'Leitura não encontrada',
          },
        },
        { status: 404 }
      );
    }

    if (!hasAccess || (accessLevel !== 'owner' && accessLevel !== 'write')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.FORBIDDEN,
            message: 'Acesso negado para editar esta leitura',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body: UpdateReadingRequest = await request.json();
    const validation = updateReadingSchema.safeParse(body);

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

    // Update reading in database
    const { data: updatedReading, error: updateError } = await supabase
      .from('glucose_readings')
      .update(validation.data)
      .eq('id', readingId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating reading:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Erro ao atualizar leitura',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedReading,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating reading:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao atualizar leitura',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/readings/[id]
 * Delete a reading (requires write access)
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<void>> {
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

    // Get reading ID from URL params
    const { id: readingId } = await context.params;

    // Check access
    const supabase = createServerClient();
    const { hasAccess, accessLevel, reading } = await checkReadingAccess(
      supabase,
      userId,
      readingId
    );

    if (!reading) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.NOT_FOUND,
            message: 'Leitura não encontrada',
          },
        },
        { status: 404 }
      );
    }

    if (!hasAccess || (accessLevel !== 'owner' && accessLevel !== 'write')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.FORBIDDEN,
            message: 'Acesso negado para excluir esta leitura',
          },
        },
        { status: 403 }
      );
    }

    // Delete reading from database
    const { error: deleteError } = await supabase
      .from('glucose_readings')
      .delete()
      .eq('id', readingId);

    if (deleteError) {
      console.error('Error deleting reading:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Erro ao excluir leitura',
          },
        },
        { status: 500 }
      );
    }

    // Return 204 No Content with no body per RFC 7231
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting reading:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao excluir leitura',
        },
      },
      { status: 500 }
    );
  }
}
