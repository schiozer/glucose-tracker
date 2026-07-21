/**
 * API Route: /api/profiles
 * Handles listing user profiles (GET) and creating new profiles (POST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import { getProfilesByUserId } from '@/lib/supabase/queries';
import { createProfileSchema } from '@/lib/validations/schemas';
import type { ApiResponse, CreateProfileRequest } from '@/types/api';
import type { Profile } from '@/types/database';
import { ApiErrorCode } from '@/types/api';

/**
 * GET /api/profiles
 * List all profiles accessible by the authenticated user
 * Includes profiles owned by user + profiles shared via caregiver access
 */
export async function GET(): Promise<NextResponse<ApiResponse<Profile[]>>> {
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

    // Fetch profiles from database
    const supabase = createServerClient();
    const profiles = await getProfilesByUserId(supabase, userId);

    return NextResponse.json(
      {
        success: true,
        data: profiles,
        meta: {
          timestamp: new Date().toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao buscar perfis',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profiles
 * Create a new profile for the authenticated user
 */
export async function POST(
  request: NextRequest
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

    // Parse and validate request body
    const body: CreateProfileRequest = await request.json();
    const validation = createProfileSchema.safeParse(body);

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

    // Insert profile into database
    const supabase = createServerClient();
    const { data: profile, error: insertError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        ...validation.data,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting profile:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Erro ao criar perfil',
          },
        },
        { status: 500 }
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
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating profile:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao criar perfil',
        },
      },
      { status: 500 }
    );
  }
}
