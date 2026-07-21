/**
 * API Route Tests: /api/thresholds
 * Tests for glucose thresholds CRUD operations
 *
 * NOTE: This file requires Jest + Next.js test utilities to run.
 */

import { GlucoseContext, DiabetesType } from '@/types/database';
import type {
  CreateThresholdRequest,
  UpdateThresholdRequest,
  ApiResponse,
} from '@/types/api';
import type { GlucoseThreshold, Profile } from '@/types/database';

// Mock modules
jest.mock('@/lib/auth0/session');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/supabase/queries');
jest.mock('@/lib/auth/access-control');

// Import after mocking
import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import {
  getThresholdsByProfileId,
  getThresholdById,
} from '@/lib/supabase/queries';
import { checkProfileAccess } from '@/lib/auth/access-control';

// Mock types
const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetUserIdFromSession = getUserIdFromSession as jest.MockedFunction<
  typeof getUserIdFromSession
>;
const mockCreateServerClient = createServerClient as jest.MockedFunction<
  typeof createServerClient
>;
const mockGetThresholdsByProfileId = getThresholdsByProfileId as jest.MockedFunction<
  typeof getThresholdsByProfileId
>;
const mockGetThresholdById = getThresholdById as jest.MockedFunction<
  typeof getThresholdById
>;
const mockCheckProfileAccess = checkProfileAccess as jest.MockedFunction<
  typeof checkProfileAccess
>;

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
const mockThresholdId = '770e8400-e29b-41d4-a716-446655440000';

const mockProfile: Profile = {
  id: mockProfileId,
  user_id: mockUserId,
  diabetes_type: DiabetesType.TYPE_2,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockThreshold: GlucoseThreshold = {
  id: mockThresholdId,
  profile_id: mockProfileId,
  context: GlucoseContext.FASTING,
  low: 70,
  target_min: 80,
  target_max: 100,
  high: 126,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockSession = {
  user: {
    sub: mockUserId,
    email: 'test@example.com',
    name: 'Test User',
  },
};

describe('GET /api/thresholds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const { GET } = await import('@/app/api/thresholds/route');
    const request = new Request('http://localhost:3000/api/thresholds?profile_id=' + mockProfileId);
    const response = await GET(request as any);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 if profile_id is missing', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);

    const { GET } = await import('@/app/api/thresholds/route');
    const request = new Request('http://localhost:3000/api/thresholds');
    const response = await GET(request as any);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe('VALIDATION_ERROR');
    expect(json.error?.message).toContain('profile_id');
  });

  it('should return 403 if user does not have access to profile', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: false,
    });

    const { GET } = await import('@/app/api/thresholds/route');
    const request = new Request('http://localhost:3000/api/thresholds?profile_id=' + mockProfileId);
    const response = await GET(request as any);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe('FORBIDDEN');
  });

  it('should return list of thresholds for profile', async () => {
    const thresholds = [mockThreshold];
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: true,
      accessLevel: 'owner',
      profile: mockProfile,
    });
    mockGetThresholdsByProfileId.mockResolvedValue(thresholds);

    const { GET } = await import('@/app/api/thresholds/route');
    const request = new Request('http://localhost:3000/api/thresholds?profile_id=' + mockProfileId);
    const response = await GET(request as any);

    expect(response.status).toBe(200);
    const json: ApiResponse<GlucoseThreshold[]> = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(thresholds);
    expect(mockGetThresholdsByProfileId).toHaveBeenCalledWith(
      mockSupabaseClient,
      mockProfileId
    );
  });

  it('should return empty array if no thresholds configured', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: true,
      accessLevel: 'owner',
      profile: mockProfile,
    });
    mockGetThresholdsByProfileId.mockResolvedValue([]);

    const { GET } = await import('@/app/api/thresholds/route');
    const request = new Request('http://localhost:3000/api/thresholds?profile_id=' + mockProfileId);
    const response = await GET(request as any);

    expect(response.status).toBe(200);
    const json: ApiResponse<GlucoseThreshold[]> = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
  });
});

describe('POST /api/thresholds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const { POST } = await import('@/app/api/thresholds/route');
    const body: CreateThresholdRequest = {
      profile_id: mockProfileId,
      context: GlucoseContext.FASTING,
      low: 70,
      target_min: 80,
      target_max: 100,
      high: 126,
    };
    const request = new Request('http://localhost:3000/api/thresholds', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(401);
  });

  it('should return 400 if validation fails', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);

    const { POST } = await import('@/app/api/thresholds/route');
    const body = {
      profile_id: mockProfileId,
      context: GlucoseContext.FASTING,
      low: 100, // Invalid: low >= target_min
      target_min: 80,
      target_max: 100,
      high: 126,
    };
    const request = new Request('http://localhost:3000/api/thresholds', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.success).toBe(false);
    expect(json.error?.code).toBe('VALIDATION_ERROR');
  });

  it('should return 403 if user does not have write access', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: true,
      accessLevel: 'read', // Read-only access
      profile: mockProfile,
    });

    const { POST } = await import('@/app/api/thresholds/route');
    const body: CreateThresholdRequest = {
      profile_id: mockProfileId,
      context: GlucoseContext.FASTING,
      low: 70,
      target_min: 80,
      target_max: 100,
      high: 126,
    };
    const request = new Request('http://localhost:3000/api/thresholds', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error?.code).toBe('FORBIDDEN');
  });

  it('should return 409 if threshold already exists for profile + context', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: true,
      accessLevel: 'owner',
      profile: mockProfile,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key' }, // Unique constraint violation
    });

    const { POST } = await import('@/app/api/thresholds/route');
    const body: CreateThresholdRequest = {
      profile_id: mockProfileId,
      context: GlucoseContext.FASTING,
      low: 70,
      target_min: 80,
      target_max: 100,
      high: 126,
    };
    const request = new Request('http://localhost:3000/api/thresholds', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(409);
    const json = await response.json();
    expect(json.error?.code).toBe('CONFLICT');
  });

  it('should create threshold successfully', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: true,
      accessLevel: 'owner',
      profile: mockProfile,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: mockThreshold,
      error: null,
    });

    const { POST } = await import('@/app/api/thresholds/route');
    const body: CreateThresholdRequest = {
      profile_id: mockProfileId,
      context: GlucoseContext.FASTING,
      low: 70,
      target_min: 80,
      target_max: 100,
      high: 126,
    };
    const request = new Request('http://localhost:3000/api/thresholds', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    const response = await POST(request as any);

    expect(response.status).toBe(201);
    const json: ApiResponse<GlucoseThreshold> = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockThreshold);
  });
});

describe('GET /api/thresholds/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const { GET } = await import('@/app/api/thresholds/[id]/route');
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId);
    const response = await GET(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(401);
  });

  it('should return 404 if threshold not found', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetThresholdById.mockResolvedValue(null);

    const { GET } = await import('@/app/api/thresholds/[id]/route');
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId);
    const response = await GET(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error?.code).toBe('NOT_FOUND');
  });

  it('should return 403 if user does not have access to threshold', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetThresholdById.mockResolvedValue(mockThreshold);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: false,
    });

    const { GET } = await import('@/app/api/thresholds/[id]/route');
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId);
    const response = await GET(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error?.code).toBe('FORBIDDEN');
  });

  it('should return threshold successfully', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetThresholdById.mockResolvedValue(mockThreshold);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: true,
      accessLevel: 'owner',
      profile: mockProfile,
    });

    const { GET } = await import('@/app/api/thresholds/[id]/route');
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId);
    const response = await GET(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(200);
    const json: ApiResponse<GlucoseThreshold> = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(mockThreshold);
  });
});

describe('PATCH /api/thresholds/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const { PATCH } = await import('@/app/api/thresholds/[id]/route');
    const body: UpdateThresholdRequest = {
      low: 60,
      target_min: 80,
      target_max: 100,
      high: 126,
    };
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    const response = await PATCH(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(401);
  });

  it('should return 404 if threshold not found', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetThresholdById.mockResolvedValue(null);

    const { PATCH } = await import('@/app/api/thresholds/[id]/route');
    const body: UpdateThresholdRequest = {
      low: 60,
      target_min: 80,
      target_max: 100,
      high: 126,
    };
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    const response = await PATCH(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(404);
  });

  it('should return 403 if user does not have write access', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetThresholdById.mockResolvedValue(mockThreshold);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: true,
      accessLevel: 'read', // Read-only access
      profile: mockProfile,
    });

    const { PATCH } = await import('@/app/api/thresholds/[id]/route');
    const body: UpdateThresholdRequest = {
      low: 60,
      target_min: 80,
      target_max: 100,
      high: 126,
    };
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    const response = await PATCH(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(403);
  });

  it('should return 400 if validation fails (invalid ordering)', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetThresholdById.mockResolvedValue(mockThreshold);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: true,
      accessLevel: 'owner',
      profile: mockProfile,
    });

    const { PATCH } = await import('@/app/api/thresholds/[id]/route');
    const body = {
      low: 70,
      target_min: 80,
      target_max: 80,
      high: 70, // Invalid: high < target_max
    };
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    const response = await PATCH(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error?.code).toBe('VALIDATION_ERROR');
  });

  it('should update threshold successfully', async () => {
    const updatedThreshold = { ...mockThreshold, low: 60 };
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetThresholdById.mockResolvedValue(mockThreshold);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: true,
      accessLevel: 'owner',
      profile: mockProfile,
    });
    mockSupabaseClient.single.mockResolvedValue({
      data: updatedThreshold,
      error: null,
    });

    const { PATCH } = await import('@/app/api/thresholds/[id]/route');
    const body: UpdateThresholdRequest = {
      low: 60,
      target_min: 80,
      target_max: 100,
      high: 126,
    };
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    const response = await PATCH(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(200);
    const json: ApiResponse<GlucoseThreshold> = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual(updatedThreshold);
  });
});

describe('DELETE /api/thresholds/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const { DELETE } = await import('@/app/api/thresholds/[id]/route');
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId, {
      method: 'DELETE',
    });
    const response = await DELETE(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(401);
  });

  it('should return 404 if threshold not found', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetThresholdById.mockResolvedValue(null);

    const { DELETE } = await import('@/app/api/thresholds/[id]/route');
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId, {
      method: 'DELETE',
    });
    const response = await DELETE(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(404);
  });

  it('should return 403 if user does not have write access', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetThresholdById.mockResolvedValue(mockThreshold);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: true,
      accessLevel: 'read', // Read-only access
      profile: mockProfile,
    });

    const { DELETE } = await import('@/app/api/thresholds/[id]/route');
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId, {
      method: 'DELETE',
    });
    const response = await DELETE(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(403);
  });

  it('should delete threshold successfully and return 204', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetThresholdById.mockResolvedValue(mockThreshold);
    mockCheckProfileAccess.mockResolvedValue({
      hasAccess: true,
      accessLevel: 'owner',
      profile: mockProfile,
    });
    mockSupabaseClient.delete = jest.fn().mockResolvedValue({
      data: null,
      error: null,
    });

    const { DELETE } = await import('@/app/api/thresholds/[id]/route');
    const request = new Request('http://localhost:3000/api/thresholds/' + mockThresholdId, {
      method: 'DELETE',
    });
    const response = await DELETE(request as any, { params: { id: mockThresholdId } });

    expect(response.status).toBe(204);
    // 204 should have no body
    const text = await response.text();
    expect(text).toBe('');
  });
});
