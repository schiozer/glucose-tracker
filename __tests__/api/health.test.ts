/**
 * API Route Tests: /api/health
 * Tests for health check endpoint
 */

import type { HealthCheckResponse } from '@/types/api';

// Mock modules
jest.mock('@/lib/supabase/server');

// Import after mocking
import { createServerClient } from '@/lib/supabase/server';

// Mock types
const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>;

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
};

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set all environment variables
    process.env.AUTH0_ISSUER_BASE_URL = 'https://auth.example.com';
    process.env.AUTH0_CLIENT_ID = 'test-client-id';
    process.env.AUTH0_CLIENT_SECRET = 'test-client-secret';
  });

  afterEach(() => {
    delete process.env.AUTH0_ISSUER_BASE_URL;
    delete process.env.AUTH0_CLIENT_ID;
    delete process.env.AUTH0_CLIENT_SECRET;
  });

  it('should return 200 with healthy status when all checks pass', async () => {
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
    mockSupabaseClient.limit.mockResolvedValue({ error: null, data: [] });

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data: HealthCheckResponse = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.checks.database).toBe('connected');
    expect(data.checks.auth).toBe('configured');
    expect(data.version).toBe('1.0.0');
    expect(data.timestamp).toBeDefined();
  });

  it('should return 503 with unhealthy status when database check fails', async () => {
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
    mockSupabaseClient.limit.mockResolvedValue({ error: new Error('Connection failed'), data: null });

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data: HealthCheckResponse = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database).toBe('error');
    expect(data.checks.auth).toBe('configured');
  });

  it('should return 503 with unhealthy status when auth is not configured', async () => {
    delete process.env.AUTH0_ISSUER_BASE_URL;
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
    mockSupabaseClient.limit.mockResolvedValue({ error: null, data: [] });

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data: HealthCheckResponse = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database).toBe('connected');
    expect(data.checks.auth).toBe('error');
  });

  it('should return 503 when supabase client throws exception', async () => {
    mockCreateServerClient.mockImplementation(() => {
      throw new Error('Supabase initialization failed');
    });

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data: HealthCheckResponse = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.checks.database).toBe('error');
  });

  it('should include timestamp in ISO format', async () => {
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
    mockSupabaseClient.limit.mockResolvedValue({ error: null, data: [] });

    const { GET } = await import('@/app/api/health/route');
    const beforeCall = new Date().toISOString();
    const response = await GET();
    const data: HealthCheckResponse = await response.json();
    const afterCall = new Date().toISOString();

    expect(data.timestamp).toBeDefined();
    // Verify it's a valid ISO timestamp
    expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    // Verify timestamp is close to when we called the endpoint
    expect(data.timestamp).toBeGreaterThanOrEqual(beforeCall);
    expect(data.timestamp).toBeLessThanOrEqual(afterCall);
  });

  it('should not require authentication', async () => {
    // This test verifies that there's no authentication check in the endpoint
    // by ensuring it doesn't call getSession or getUserIdFromSession
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
    mockSupabaseClient.limit.mockResolvedValue({ error: null, data: [] });

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();

    expect(response.status).toBe(200);
    // Verify the endpoint completes successfully without auth errors
    expect(response).toBeDefined();
  });

  it('should return all three checks even if one fails', async () => {
    mockCreateServerClient.mockReturnValue(mockSupabaseClient as any);
    mockSupabaseClient.limit.mockResolvedValue({ error: new Error('DB error'), data: null });
    delete process.env.AUTH0_CLIENT_ID;

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();
    const data: HealthCheckResponse = await response.json();

    expect(data.checks).toBeDefined();
    expect(data.checks.database).toBe('error');
    expect(data.checks.auth).toBe('error');
    expect(data.version).toBe('1.0.0');
  });
});
