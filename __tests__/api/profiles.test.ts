/**
 * API Route Tests: /api/profiles
 * Tests for profile CRUD operations
 *
 * NOTE: This file requires Jest + Next.js test utilities to run.
 * Install: npm install --save-dev jest @testing-library/react @testing-library/jest-dom jest-environment-jsdom
 * Also: npm install --save-dev @types/jest
 */

import { DiabetesType } from '@/types/database';
import type { CreateProfileRequest, UpdateProfileRequest, ApiResponse } from '@/types/api';
import type { Profile } from '@/types/database';

// Mock modules
jest.mock('@/lib/auth0/session');
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/supabase/queries');

// Import after mocking
import { getSession, getUserIdFromSession } from '@/lib/auth0/session';
import { createServerClient } from '@/lib/supabase/server';
import { getProfilesByUserId, getProfileById } from '@/lib/supabase/queries';

// Mock types
const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockGetUserIdFromSession = getUserIdFromSession as jest.MockedFunction<typeof getUserIdFromSession>;
const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;
const mockGetProfilesByUserId = getProfilesByUserId as jest.MockedFunction<typeof getProfilesByUserId>;
const mockGetProfileById = getProfileById as jest.MockedFunction<typeof getProfileById>;

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

const mockProfile: Profile = {
  id: mockProfileId,
  user_id: mockUserId,
  diabetes_type: DiabetesType.TYPE_2,
  diagnosis_date: '2020-01-15',
  date_of_birth: '1980-05-20',
  weight: 75,
  height: 170,
  medication: 'Metformina 850mg',
  physician: 'Dr. Silva',
  physician_contact: '11-98765-4321',
  notes: 'Acompanhamento regular',
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

describe('GET /api/profiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    // Import route handler dynamically to avoid module scope issues
    const { GET } = await import('@/app/api/profiles/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('UNAUTHORIZED');
    expect(data.error?.message).toContain('não autenticado');
  });

  it('should return user profiles on successful request', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfilesByUserId.mockResolvedValue([mockProfile]);

    const { GET } = await import('@/app/api/profiles/route');
    const response = await GET();
    const data: ApiResponse<Profile[]> = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data?.[0].id).toBe(mockProfileId);
    expect(mockGetProfilesByUserId).toHaveBeenCalledWith(mockSupabaseClient, mockUserId);
  });

  it('should return empty array if user has no profiles', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfilesByUserId.mockResolvedValue([]);

    const { GET } = await import('@/app/api/profiles/route');
    const response = await GET();
    const data: ApiResponse<Profile[]> = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(0);
  });

  it('should return 500 on database error', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfilesByUserId.mockRejectedValue(new Error('Database error'));

    const { GET } = await import('@/app/api/profiles/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('INTERNAL_ERROR');
  });
});

describe('POST /api/profiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  const validProfileRequest: CreateProfileRequest = {
    diabetes_type: DiabetesType.TYPE_2,
    diagnosis_date: '2020-01-15',
    date_of_birth: '1980-05-20',
    weight: 75,
    height: 170,
    medication: 'Metformina 850mg',
  };

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const request = new Request('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify(validProfileRequest),
    });

    const { POST } = await import('@/app/api/profiles/route');
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should create profile with valid data', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockSupabaseClient.single.mockResolvedValue({ data: mockProfile, error: null });

    const request = new Request('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify(validProfileRequest),
    });

    const { POST } = await import('@/app/api/profiles/route');
    const response = await POST(request as any);
    const data: ApiResponse<Profile> = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data?.id).toBe(mockProfileId);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabaseClient.insert).toHaveBeenCalled();
  });

  it('should return 400 for invalid diabetes type', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);

    const invalidRequest = {
      diabetes_type: 'invalid_type',
      diagnosis_date: '2020-01-15',
    };

    const request = new Request('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify(invalidRequest),
    });

    const { POST } = await import('@/app/api/profiles/route');
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
    expect(data.error?.details?.errors).toBeDefined();
  });

  it('should return 400 for invalid weight (negative)', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);

    const invalidRequest: CreateProfileRequest = {
      ...validProfileRequest,
      weight: -10,
    };

    const request = new Request('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify(invalidRequest),
    });

    const { POST } = await import('@/app/api/profiles/route');
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
  });

  it('should return 500 on database insert error', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    });

    const request = new Request('http://localhost/api/profiles', {
      method: 'POST',
      body: JSON.stringify(validProfileRequest),
    });

    const { POST } = await import('@/app/api/profiles/route');
    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});

describe('GET /api/profiles/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`);
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { GET } = await import('@/app/api/profiles/[id]/route');
    const response = await GET(request as any, context as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should return profile if user is owner', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(mockProfile);

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`);
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { GET } = await import('@/app/api/profiles/[id]/route');
    const response = await GET(request as any, context as any);
    const data: ApiResponse<Profile> = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data?.id).toBe(mockProfileId);
  });

  it('should return 403 if user does not have access', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue('different-user-id');
    mockGetProfileById.mockResolvedValue(mockProfile);
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`);
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { GET } = await import('@/app/api/profiles/[id]/route');
    const response = await GET(request as any, context as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('FORBIDDEN');
  });

  it('should return 404 if profile does not exist', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(null);

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`);
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { GET } = await import('@/app/api/profiles/[id]/route');
    const response = await GET(request as any, context as any);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /api/profiles/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  const validUpdateRequest: UpdateProfileRequest = {
    weight: 73,
    medication: 'Metformina 850mg + Insulina',
  };

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`, {
      method: 'PATCH',
      body: JSON.stringify(validUpdateRequest),
    });
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { PATCH } = await import('@/app/api/profiles/[id]/route');
    const response = await PATCH(request as any, context as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should update profile if user is owner', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(mockProfile);

    const updatedProfile = { ...mockProfile, weight: 73 };
    mockSupabaseClient.single.mockResolvedValue({ data: updatedProfile, error: null });

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`, {
      method: 'PATCH',
      body: JSON.stringify(validUpdateRequest),
    });
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { PATCH } = await import('@/app/api/profiles/[id]/route');
    const response = await PATCH(request as any, context as any);
    const data: ApiResponse<Profile> = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data?.weight).toBe(73);
  });

  it('should return 403 if user does not have write access', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue('different-user-id');
    mockGetProfileById.mockResolvedValue(mockProfile);

    // Mock caregiver access with read-only
    mockSupabaseClient.single.mockResolvedValue({
      data: { access_level: 'read' },
      error: null,
    });

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`, {
      method: 'PATCH',
      body: JSON.stringify(validUpdateRequest),
    });
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { PATCH } = await import('@/app/api/profiles/[id]/route');
    const response = await PATCH(request as any, context as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
  });

  it('should return 400 for invalid update data', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(mockProfile);

    const invalidRequest = {
      weight: -50, // Invalid negative weight
    };

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`, {
      method: 'PATCH',
      body: JSON.stringify(invalidRequest),
    });
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { PATCH } = await import('@/app/api/profiles/[id]/route');
    const response = await PATCH(request as any, context as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /api/profiles/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
  });

  it('should return 401 if user is not authenticated', async () => {
    mockGetSession.mockResolvedValue(null);
    mockGetUserIdFromSession.mockReturnValue(null);

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`, {
      method: 'DELETE',
    });
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { DELETE } = await import('@/app/api/profiles/[id]/route');
    const response = await DELETE(request as any, context as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
  });

  it('should delete profile if user is owner', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(mockProfile);
    mockSupabaseClient.delete.mockResolvedValue({ error: null });

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`, {
      method: 'DELETE',
    });
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { DELETE } = await import('@/app/api/profiles/[id]/route');
    const response = await DELETE(request as any, context as any);
    const data = await response.json();

    expect(response.status).toBe(204);
    expect(data.success).toBe(true);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
    expect(mockSupabaseClient.delete).toHaveBeenCalled();
  });

  it('should return 403 if user is not owner (even with write access)', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue('caregiver-user-id');
    mockGetProfileById.mockResolvedValue(mockProfile);

    // Mock caregiver with write access
    mockSupabaseClient.single.mockResolvedValue({
      data: { access_level: 'write' },
      error: null,
    });

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`, {
      method: 'DELETE',
    });
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { DELETE } = await import('@/app/api/profiles/[id]/route');
    const response = await DELETE(request as any, context as any);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.success).toBe(false);
    expect(data.error?.message).toContain('proprietário');
  });

  it('should return 500 on database delete error', async () => {
    mockGetSession.mockResolvedValue(mockSession as any);
    mockGetUserIdFromSession.mockReturnValue(mockUserId);
    mockGetProfileById.mockResolvedValue(mockProfile);
    mockSupabaseClient.delete.mockResolvedValue({
      error: { message: 'Delete failed' },
    });

    const request = new Request(`http://localhost/api/profiles/${mockProfileId}`, {
      method: 'DELETE',
    });
    const context = { params: Promise.resolve({ id: mockProfileId }) };

    const { DELETE } = await import('@/app/api/profiles/[id]/route');
    const response = await DELETE(request as any, context as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
  });
});
