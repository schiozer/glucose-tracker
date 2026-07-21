/**
 * API Route Tests: /api/readings
 * Tests for glucose readings CRUD operations and statistics
 *
 * NOTE: This file requires Jest + Next.js test utilities to run.
 */

import { GlucoseContext, ReadingSource, DiabetesType } from '@/types/database';
import type {
  CreateReadingRequest,
  UpdateReadingRequest,
  ApiResponse,
  PaginatedResponse,
} from '@/types/api';
import type { GlucoseReading, Profile } from '@/types/database';

// Mock modules
jest.mock('@/lib/auth0/session');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/supabase/queries');
jest.mock('@/lib/utils/calculations');

// Import after mocking
import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import {
  getReadingsByProfileId,
  getReadingById,
  getProfileById,
} from '@/lib/supabase/queries';
import { calculateStats } from '@/lib/utils/calculations';

// Mock types
const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetUserIdFromSession = getUserIdFromSession as jest.MockedFunction<
  typeof getUserIdFromSession
>;
const mockCreateServerClient = createServerClient as jest.MockedFunction<
  typeof createServerClient
>;
const mockGetReadingsByProfileId = getReadingsByProfileId as jest.MockedFunction<
  typeof getReadingsByProfileId
>;
const mockGetReadingById = getReadingById as jest.MockedFunction<typeof getReadingById>;
const mockGetProfileById = getProfileById as jest.MockedFunction<typeof getProfileById>;
const mockCalculateStats = calculateStats as jest.MockedFunction<typeof calculateStats>;

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
};

// Test fixtures
const mockUserId = 'auth0|test-user-123';
const mockProfileId = '550e8400-e29b-41d4-a716-446655440000';
const mockReadingId = '660e8400-e29b-41d4-a716-446655440000';
const mockOtherUserId = 'auth0|other-user-456';

const mockProfile: Profile = {
  id: mockProfileId,
  user_id: mockUserId,
  diabetes_type: DiabetesType.TYPE_2,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockReading: GlucoseReading = {
  id: mockReadingId,
  profile_id: mockProfileId,
  value: 120,
  reading_date: '2024-06-30T08:00:00Z',
  context: GlucoseContext.FASTING,
  source: ReadingSource.MANUAL,
  notes: 'Leitura matinal',
  created_at: '2024-06-30T08:05:00Z',
  updated_at: '2024-06-30T08:05:00Z',
};

const mockSession = {
  user: {
    sub: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
  },
};

describe('GET /api/readings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const { GET } = await import('@/app/api/readings/route');
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({ profile_id: mockProfileId }),
      },
    } as any;

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 if profile_id is missing', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);

    const { GET } = await import('@/app/api/readings/route');
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams(),
      },
    } as any;

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
    expect(data.error?.message).toContain('profile_id');
  });

  it('should return 403 if user does not have access to profile', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue({ ...mockProfile, user_id: mockOtherUserId });
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

    const { GET } = await import('@/app/api/readings/route');
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({ profile_id: mockProfileId }),
      },
    } as any;

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('FORBIDDEN');
  });

  it('should return paginated readings successfully', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(mockProfile);
    mockGetReadingsByProfileId.mockResolvedValue({
      readings: [mockReading],
      total: 1,
    });

    const { GET } = await import('@/app/api/readings/route');
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({ profile_id: mockProfileId }),
      },
    } as any;

    const response = await GET(mockRequest);
    const data: PaginatedResponse<GlucoseReading> = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].id).toBe(mockReadingId);
    expect(data.pagination.total_items).toBe(1);
    expect(data.pagination.page).toBe(1);
  });

  it('should apply filters correctly', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(mockProfile);
    mockGetReadingsByProfileId.mockResolvedValue({
      readings: [mockReading],
      total: 1,
    });

    const { GET } = await import('@/app/api/readings/route');
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({
          profile_id: mockProfileId,
          start_date: '2024-06-01',
          end_date: '2024-06-30',
          context: GlucoseContext.FASTING,
        }),
      },
    } as any;

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetReadingsByProfileId).toHaveBeenCalledWith(
      mockSupabaseClient,
      mockProfileId,
      expect.objectContaining({
        startDate: '2024-06-01',
        endDate: '2024-06-30',
        context: GlucoseContext.FASTING,
      })
    );
  });
});

describe('POST /api/readings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const { POST } = await import('@/app/api/readings/route');
    const mockRequest = {
      json: async () => ({ profile_id: mockProfileId }),
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should return 403 if user does not have write access', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue({ ...mockProfile, user_id: mockOtherUserId });
    mockSupabaseClient.single.mockResolvedValue({
      data: { access_level: 'read' },
      error: null,
    });

    const { POST } = await import('@/app/api/readings/route');
    const mockRequest = {
      json: async () => ({
        profile_id: mockProfileId,
        value: 120,
        reading_date: '2024-06-30T08:00:00Z',
        context: GlucoseContext.FASTING,
        source: ReadingSource.MANUAL,
      }),
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('should create reading successfully', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(mockProfile);
    mockSupabaseClient.single.mockResolvedValue({ data: mockReading, error: null });

    const { POST } = await import('@/app/api/readings/route');
    const requestBody: CreateReadingRequest & { profile_id: string } = {
      profile_id: mockProfileId,
      value: 120,
      reading_date: '2024-06-30T08:00:00Z',
      context: GlucoseContext.FASTING,
      source: ReadingSource.MANUAL,
      notes: 'Leitura matinal',
    };

    const mockRequest = {
      json: async () => requestBody,
    } as any;

    const response = await POST(mockRequest);
    const data: ApiResponse<GlucoseReading> = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data?.value).toBe(120);
  });

  it('should return 400 for invalid reading data', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(mockProfile);

    const { POST } = await import('@/app/api/readings/route');
    const mockRequest = {
      json: async () => ({
        profile_id: mockProfileId,
        value: 700, // Invalid: max is 600
        reading_date: '2024-06-30T08:00:00Z',
        context: GlucoseContext.FASTING,
        source: ReadingSource.MANUAL,
      }),
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/readings/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const { GET } = await import('@/app/api/readings/[id]/route');
    const response = await GET({} as any, {
      params: Promise.resolve({ id: mockReadingId }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should return 404 if reading not found', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetReadingById.mockResolvedValue(null);

    const { GET } = await import('@/app/api/readings/[id]/route');
    const response = await GET({} as any, {
      params: Promise.resolve({ id: mockReadingId }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('NOT_FOUND');
  });

  it('should return reading successfully', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetReadingById.mockResolvedValue(mockReading);
    mockGetProfileById.mockResolvedValue(mockProfile);

    const { GET } = await import('@/app/api/readings/[id]/route');
    const response = await GET({} as any, {
      params: Promise.resolve({ id: mockReadingId }),
    });
    const data: ApiResponse<GlucoseReading> = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data?.id).toBe(mockReadingId);
  });
});

describe('PATCH /api/readings/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 403 if user does not have write access', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetReadingById.mockResolvedValue(mockReading);
    mockGetProfileById.mockResolvedValue({ ...mockProfile, user_id: mockOtherUserId });
    mockSupabaseClient.single.mockResolvedValue({
      data: { access_level: 'read' },
      error: null,
    });

    const { PATCH } = await import('@/app/api/readings/[id]/route');
    const mockRequest = {
      json: async () => ({ value: 130 }),
    } as any;

    const response = await PATCH(mockRequest, {
      params: Promise.resolve({ id: mockReadingId }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('should update reading successfully', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetReadingById.mockResolvedValue(mockReading);
    mockGetProfileById.mockResolvedValue(mockProfile);
    mockSupabaseClient.single.mockResolvedValue({
      data: { ...mockReading, value: 130 },
      error: null,
    });

    const { PATCH } = await import('@/app/api/readings/[id]/route');
    const mockRequest = {
      json: async () => ({ value: 130 }),
    } as any;

    const response = await PATCH(mockRequest, {
      params: Promise.resolve({ id: mockReadingId }),
    });
    const data: ApiResponse<GlucoseReading> = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe('DELETE /api/readings/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 403 if user does not have write access', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetReadingById.mockResolvedValue(mockReading);
    mockGetProfileById.mockResolvedValue({ ...mockProfile, user_id: mockOtherUserId });
    mockSupabaseClient.single.mockResolvedValue({
      data: { access_level: 'read' },
      error: null,
    });

    const { DELETE } = await import('@/app/api/readings/[id]/route');
    const response = await DELETE({} as any, {
      params: Promise.resolve({ id: mockReadingId }),
    });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('should delete reading successfully and return 204', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetReadingById.mockResolvedValue(mockReading);
    mockGetProfileById.mockResolvedValue(mockProfile);
    mockSupabaseClient.delete = jest.fn().mockResolvedValue({ error: null });

    const { DELETE } = await import('@/app/api/readings/[id]/route');
    const response = await DELETE({} as any, {
      params: Promise.resolve({ id: mockReadingId }),
    });

    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });
});

describe('GET /api/readings/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const { GET } = await import('@/app/api/readings/stats/route');
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({ profile_id: mockProfileId }),
      },
    } as any;

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should return 400 if profile_id is missing', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);

    const { GET } = await import('@/app/api/readings/stats/route');
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams(),
      },
    } as any;

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error?.message).toContain('profile_id');
  });

  it('should calculate and return statistics successfully', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(mockProfile);
    mockGetReadingsByProfileId.mockResolvedValue({
      readings: [mockReading],
      total: 1,
    });
    mockCalculateStats.mockReturnValue({
      average: 120,
      min: 120,
      max: 120,
      stdDev: 0,
      count: 1,
      timeInTargetPct: 100,
      timeBelowTargetPct: 0,
      timeAboveTargetPct: 0,
      timeUnknownPct: 0,
    });

    const { GET } = await import('@/app/api/readings/stats/route');
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({
          profile_id: mockProfileId,
          start_date: '2024-06-01',
          end_date: '2024-06-30',
        }),
      },
    } as any;

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.statistics.average).toBe(120);
    expect(data.data.timeInRange.inTargetPct).toBe(100);
  });

  it('should return empty stats for no readings', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(mockProfile);
    mockGetReadingsByProfileId.mockResolvedValue({
      readings: [],
      total: 0,
    });

    const { GET } = await import('@/app/api/readings/stats/route');
    const mockRequest = {
      nextUrl: {
        searchParams: new URLSearchParams({ profile_id: mockProfileId }),
      },
    } as any;

    const response = await GET(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.statistics.count).toBe(0);
    expect(data.data.statistics.average).toBe(0);
  });
});
