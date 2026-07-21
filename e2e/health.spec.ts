import { test, expect } from '@playwright/test';

/**
 * Health Check API E2E Tests
 *
 * Tests the public health check endpoint which monitors service status
 * without requiring authentication.
 */
test.describe('Health Check API', () => {
  test('GET /api/health returns 200 with expected shape', async ({ request }) => {
    const response = await request.get('/api/health');

    // Should return 200 or 503 (both are valid health check responses)
    expect([200, 503]).toContain(response.status());

    const body = await response.json();

    // Verify response structure
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('checks');
    expect(body).toHaveProperty('version');

    // Verify status is valid
    expect(['healthy', 'unhealthy']).toContain(body.status);

    // Verify checks object structure
    expect(body.checks).toHaveProperty('database');
    expect(body.checks).toHaveProperty('auth');

    // Verify check states are valid
    expect(['connected', 'error', 'configured']).toContain(body.checks.database);
    expect(['configured', 'error']).toContain(body.checks.auth);

    // Verify timestamp is a valid ISO string
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);

    // Verify version exists
    expect(body.version).toBeTruthy();
  });

  test('Health endpoint reports service status correctly', async ({ request }) => {
    const response = await request.get('/api/health');
    const body = await response.json();

    // If healthy, both checks should be in good state
    if (body.status === 'healthy') {
      expect(response.status()).toBe(200);
      expect(body.checks.database).toBe('connected');
      expect(body.checks.auth).toBe('configured');
    }

    // If unhealthy, at least one check should be in error state
    if (body.status === 'unhealthy') {
      expect(response.status()).toBe(503);
      const hasError =
        body.checks.database === 'error' || body.checks.auth === 'error';
      expect(hasError).toBe(true);
    }
  });
});
