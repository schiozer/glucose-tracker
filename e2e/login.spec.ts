import { test, expect } from '@playwright/test';

/**
 * Login Page E2E Tests
 *
 * Tests the public login page UI and content.
 * Does NOT test actual Auth0 authentication (would require credentials).
 */
test.describe('Login Page', () => {
  test('loads correctly', async ({ page }) => {
    await page.goto('/login');

    // Verify page title is visible
    await expect(page.getByRole('heading', { name: 'Glucose Tracker' })).toBeVisible();

    // Verify page description
    await expect(
      page.getByText('Sistema inteligente de monitoramento de glicemia')
    ).toBeVisible();
  });

  test('shows login button with correct text', async ({ page }) => {
    await page.goto('/login');

    // Find the login button
    const loginButton = page.getByRole('link', { name: 'Entrar' });

    // Verify button is visible
    await expect(loginButton).toBeVisible();

    // Verify button links to Auth0 login endpoint
    await expect(loginButton).toHaveAttribute('href', '/api/auth/login');
  });

  test('displays Portuguese text and feature list', async ({ page }) => {
    await page.goto('/login');

    // Verify Portuguese feature descriptions
    await expect(
      page.getByText('Registre e acompanhe suas medições de glicose')
    ).toBeVisible();

    await expect(
      page.getByText('Visualize tendências e padrões com gráficos')
    ).toBeVisible();

    await expect(
      page.getByText('Compartilhe dados com cuidadores e médicos')
    ).toBeVisible();
  });

  test('shows terms and privacy links', async ({ page }) => {
    await page.goto('/login');

    // Verify footer text with links
    await expect(page.getByText('Ao entrar, você concorda com nossos')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Termos de Uso' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Política de Privacidade' })).toBeVisible();
  });

  test('has proper page styling', async ({ page }) => {
    await page.goto('/login');

    // Verify the main container exists with proper classes
    const container = page.locator('.bg-white.rounded-lg.shadow-xl');
    await expect(container).toBeVisible();

    // Verify the page has gradient background
    const background = page.locator('.bg-gradient-to-br');
    await expect(background).toBeVisible();
  });
});
