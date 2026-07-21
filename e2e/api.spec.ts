import { test, expect } from '@playwright/test';

/**
 * API Authentication E2E Tests
 *
 * Tests that protected API routes return 401 for unauthenticated requests.
 * Auth0 middleware intercepts requests and returns its own error format.
 * Does NOT test authenticated API calls (would require Auth0 session).
 */
test.describe('API Authentication Guards', () => {
  test('GET /api/profiles returns 401 for unauthenticated requests', async ({
    request,
  }) => {
    const response = await request.get('/api/profiles');

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();

    // Auth0 middleware returns this format
    expect(body).toHaveProperty('error');
    expect(body.error).toBe('not_authenticated');
    expect(body).toHaveProperty('description');
  });

  test('GET /api/readings returns 401 without authentication', async ({
    request,
  }) => {
    const response = await request.get('/api/readings?profile_id=test-id');

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();

    // Auth0 middleware returns this format
    expect(body.error).toBe('not_authenticated');
  });

  test('GET /api/readings/stats returns 401 without authentication', async ({
    request,
  }) => {
    const response = await request.get('/api/readings/stats?profile_id=test-id');

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();

    // Auth0 middleware returns this format
    expect(body.error).toBe('not_authenticated');
  });

  test('GET /api/thresholds returns 401 without authentication', async ({
    request,
  }) => {
    const response = await request.get('/api/thresholds?profile_id=test-id');

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();

    // Auth0 middleware returns this format
    expect(body.error).toBe('not_authenticated');
  });

  test('POST /api/readings returns 401 without authentication', async ({
    request,
  }) => {
    const response = await request.post('/api/readings', {
      data: {
        profile_id: 'test-id',
        value: 120,
        reading_date: '2026-07-21T10:00:00Z',
        context: 'fasting',
        source: 'manual',
      },
    });

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();

    // Auth0 middleware returns this format
    expect(body.error).toBe('not_authenticated');
  });

  test('POST /api/readings with empty body returns 401 (auth checked first)', async ({
    request,
  }) => {
    const response = await request.post('/api/readings', {
      data: {},
    });

    // Should return 401 (authentication is checked before validation)
    expect(response.status()).toBe(401);

    const body = await response.json();

    // Auth0 middleware returns this format
    expect(body.error).toBe('not_authenticated');
  });

  test('DELETE requests without authentication return 401', async ({ request }) => {
    // Attempt to delete a reading without authentication
    const response = await request.delete('/api/readings/fake-id');

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();

    // Auth0 middleware returns this format
    expect(body.error).toBe('not_authenticated');
  });

  test('PUT requests without authentication return 401', async ({ request }) => {
    // Attempt to update a threshold without authentication
    const response = await request.put('/api/thresholds/fake-id', {
      data: {
        min_value: 70,
        max_value: 180,
      },
    });

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);

    const body = await response.json();

    // Auth0 middleware returns this format
    expect(body.error).toBe('not_authenticated');
  });

  test('Auth0 middleware error responses follow consistent format', async ({ request }) => {
    // Test multiple endpoints to verify Auth0 middleware error format
    const endpoints = [
      '/api/profiles',
      '/api/readings?profile_id=test',
      '/api/thresholds?profile_id=test',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);

      // All should return 401
      expect(response.status()).toBe(401);

      const body = await response.json();

      // Auth0 middleware returns consistent error format
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('not_authenticated');
      expect(body).toHaveProperty('description');
      expect(typeof body.description).toBe('string');
    }
  });
});
