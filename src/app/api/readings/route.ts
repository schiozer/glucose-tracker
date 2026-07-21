/**
 * API Route: /api/readings
 * Handles listing glucose readings (GET) and creating new readings (POST)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import { getReadingsByProfileId } from '@/lib/supabase/queries';
import { createReadingSchema, listReadingsQuerySchema } from '@/lib/validations/schemas';
import { checkProfileAccess } from '@/lib/auth/access-control';
import type { ApiResponse, CreateReadingRequest, PaginatedResponse } from '@/types/api';
import type { GlucoseReading } from '@/types/database';
import { ApiErrorCode } from '@/types/api';

/**
 * GET /api/readings
 * List glucose readings with filters and pagination
 * Query params: profile_id (required), start_date, end_date, context, page, page_size
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<PaginatedResponse<GlucoseReading> | ApiResponse<never>>> {
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

    // Validate query parameters
    const queryParams = {
      start_date: searchParams.get('start_date') || undefined,
      end_date: searchParams.get('end_date') || undefined,
      context: searchParams.get('context') || undefined,
      page: searchParams.get('page') || undefined,
      page_size: searchParams.get('page_size') || undefined,
    };

    const validation = listReadingsQuerySchema.safeParse(queryParams);

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
            message: 'Parâmetros de consulta inválidos',
          },
        },
        { status: 400 }
      );
    }

    // Fetch readings with filters
    const { page, page_size, start_date, end_date, context } = validation.data;
    const { readings, total } = await getReadingsByProfileId(supabase, profileId, {
      startDate: start_date,
      endDate: end_date,
      context,
      page,
      perPage: page_size,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / page_size);

    return NextResponse.json(
      {
        success: true,
        data: readings,
        pagination: {
          page,
          page_size,
          total_items: total,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching readings:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao buscar leituras',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/readings
 * Create a new glucose reading
 * Body: { profile_id: string, value: number, reading_date: string, context: string, source: string, notes?: string }
 */
export async function POST(
  request: NextRequest
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

    // Parse and validate request body
    const body = await request.json();
    const profileId = body.profile_id;

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

    // Check access to profile (requires write access)
    const supabase = createServerClient();
    const { hasAccess, accessLevel } = await checkProfileAccess(
      supabase,
      userId,
      profileId
    );

    if (!hasAccess || (accessLevel !== 'owner' && accessLevel !== 'write')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.FORBIDDEN,
            message: 'Acesso negado para criar leituras neste perfil',
          },
        },
        { status: 403 }
      );
    }

    // Validate reading data
    const readingData: CreateReadingRequest = {
      value: body.value,
      reading_date: body.reading_date,
      context: body.context,
      source: body.source,
      notes: body.notes,
    };

    const validation = createReadingSchema.safeParse(readingData);

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

    // Insert reading into database
    const { data: reading, error: insertError } = await supabase
      .from('glucose_readings')
      .insert({
        profile_id: profileId,
        ...validation.data,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting reading:', insertError);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ApiErrorCode.INTERNAL_ERROR,
            message: 'Erro ao criar leitura',
          },
        },
        { status: 500 }
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
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating reading:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ApiErrorCode.INTERNAL_ERROR,
          message: 'Erro ao criar leitura',
        },
      },
      { status: 500 }
    );
  }
}
