import { test, expect } from '@playwright/test';

/**
 * Navigation and Auth Guard E2E Tests
 *
 * Tests that unauthenticated users are properly handled by Auth0 middleware.
 * Auth0 middleware redirects page routes to login.
 */
test.describe('Navigation and Auth Guards', () => {
  test('unauthenticated users trying to access /dashboard are redirected', async ({ page }) => {
    // Attempt to visit dashboard without authentication
    await page.goto('/dashboard');

    // Auth0 middleware should redirect to Auth0 login or show auth required page
    // Verify we're not on the actual dashboard by checking URL
    const url = page.url();

    // Should be redirected away from dashboard (to Auth0 login page or /api/auth/login)
    const isRedirected = url.includes('auth0.com') || url.includes('/api/auth/login') || !url.includes('/dashboard');
    expect(isRedirected).toBe(true);
  });

  test('unauthenticated users trying to access /readings are redirected', async ({ page }) => {
    await page.goto('/readings');

    const url = page.url();
    const isRedirected = url.includes('auth0.com') || url.includes('/api/auth/login') || !url.includes('/readings');
    expect(isRedirected).toBe(true);
  });

  test('unauthenticated users trying to access /charts are redirected', async ({ page }) => {
    await page.goto('/charts');

    const url = page.url();
    const isRedirected = url.includes('auth0.com') || url.includes('/api/auth/login') || !url.includes('/charts');
    expect(isRedirected).toBe(true);
  });

  test('unauthenticated users trying to access /reports are redirected', async ({ page }) => {
    await page.goto('/reports');

    const url = page.url();
    const isRedirected = url.includes('auth0.com') || url.includes('/api/auth/login') || !url.includes('/reports');
    expect(isRedirected).toBe(true);
  });

  test('unauthenticated users trying to access /settings are redirected', async ({ page }) => {
    await page.goto('/settings');

    const url = page.url();
    const isRedirected = url.includes('auth0.com') || url.includes('/api/auth/login') || !url.includes('/settings');
    expect(isRedirected).toBe(true);
  });

  test('/api/auth/login endpoint exists and redirects to Auth0', async ({ request }) => {
    const response = await request.get('/api/auth/login', {
      maxRedirects: 0,
    });

    // Should return 302/307 redirect to Auth0
    expect([302, 307]).toContain(response.status());

    // Verify Location header exists
    const location = response.headers()['location'];
    expect(location).toBeTruthy();

    // Should redirect to Auth0 domain
    expect(location).toContain('auth0.com');
  });

  test('/login page is publicly accessible', async ({ page }) => {
    const response = await page.goto('/login');

    // Should load successfully
    expect(response?.status()).toBe(200);

    // Verify we're on login page
    expect(page.url()).toContain('/login');

    // Verify page content is visible
    await expect(page.getByRole('heading', { name: 'Glucose Tracker' })).toBeVisible();
  });

  test('root path loads successfully', async ({ page }) => {
    const response = await page.goto('/');

    // Should load (may be a public page or redirect to login)
    expect(response?.status()).toBe(200);
  });

  test('protected API routes return 401 for unauthenticated access', async ({ request }) => {
    // Test that Auth0 middleware blocks API access
    const response = await request.get('/api/profiles');

    // Should return 401
    expect(response.status()).toBe(401);
  });
});
