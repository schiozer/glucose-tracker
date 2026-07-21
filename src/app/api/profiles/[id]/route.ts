/**
 * API Route: /api/profiles/[id]
 * Handles single profile operations: GET, PATCH, DELETE
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import { getProfileById } from '@/lib/supabase/queries';
import { updateProfileSchema } from '@/lib/validations/schemas';
import type { ApiResponse, UpdateProfileRequest } from '@/types/api';
import type { Profile } from '@/types/database';
import { ApiErrorCode } from '@/types/api';

/**
 * Check if user has access to a profile
 * User has access if they are:
 * - The profile owner (user_id matches)
 * - A caregiver with active access
 *
 * Returns the profile if found to avoid redundant queries
 */
async function checkProfileAccess(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
  profileId: string
): Promise<{ hasAccess: boolean; accessLevel?: 'owner' | 'read' | 'write'; profile?: Profile }> {
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
    accessLevel: caregiverAccess.access_level as 'read' | 'write',
    profile,
  };
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/profiles/[id]
 * Get a single profile by ID
 */
export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Profile>>> {
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

    // Get profile ID from URL params
    const { id: profileId } = await context.params;

    // Check access and fetch profile
    const supabase = createServerClient();
    const { hasAccess, profile } = await checkProfileAccess(supabase, userId, profileId);

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.NOT_FOUND,
            message: 'Perfil não encontrado',
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
            message: 'Acesso negado a este perfil',
          },
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: profile,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao buscar perfil',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/profiles/[id]
 * Update a profile (requires write access)
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<Profile>>> {
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

    // Get profile ID from URL params
    const { id: profileId } = await context.params;

    // Check access and fetch profile
    const supabase = createServerClient();
    const { hasAccess, accessLevel, profile } = await checkProfileAccess(
      supabase,
      userId,
      profileId
    );

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.NOT_FOUND,
            message: 'Perfil não encontrado',
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
            message: 'Acesso negado para editar este perfil',
          },
        },
        { status: 403 }
      );
    }

    // Parse and validate request body
    const body: UpdateProfileRequest = await request.json();
    const validation = updateProfileSchema.safeParse(body);

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

    // Update profile in database
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update(validation.data)
      .eq('id', profileId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Erro ao atualizar perfil',
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedProfile,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao atualizar perfil',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/profiles/[id]
 * Delete a profile (requires owner access)
 * Cascade delete is handled by database
 */
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse<ApiResponse<void>>> {
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

    // Get profile ID from URL params
    const { id: profileId } = await context.params;

    // Check access - only owner can delete
    const supabase = createServerClient();
    const { hasAccess, accessLevel, profile } = await checkProfileAccess(
      supabase,
      userId,
      profileId
    );

    if (!profile) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.NOT_FOUND,
            message: 'Perfil não encontrado',
          },
        },
        { status: 404 }
      );
    }

    if (!hasAccess || accessLevel !== 'owner') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.FORBIDDEN,
            message: 'Apenas o proprietário pode excluir o perfil',
          },
        },
        { status: 403 }
      );
    }

    // Delete profile from database
    const { error: deleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', profileId);

    if (deleteError) {
      console.error('Error deleting profile:', deleteError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Erro ao excluir perfil',
          },
        },
        { status: 500 }
      );
    }

    // Return 204 No Content with no body per RFC 7231
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao excluir perfil',
        },
      },
      { status: 500 }
    );
  }
}
