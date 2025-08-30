import { test, expect } from '@playwright/test';

test.describe('Authentication Smoke Test', () => {
  test('complete auth flow - login, dashboard, logout', async ({ page }) => {
    // Step 1: Visit login page
    await page.goto('/login');
    await expect(page).toHaveURL(/.*\/login/);
    
    // Step 2: In dev mode, use auto-login; in prod, would need real magic link
    const isDevMode = process.env.NODE_ENV === 'development';
    
    if (isDevMode) {
      // Look for the dev auto-login button
      const autoLoginButton = page.locator('a:has-text("Auto-login")');
      
      if (await autoLoginButton.isVisible()) {
        console.log('Using dev auto-login');
        await autoLoginButton.click();
        
        // Should redirect to dashboard
        await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
      } else {
        // Fallback: try to use the dev API directly
        console.log('Dev auto-login button not found, trying API');
        await page.goto('/api/dev/autologin');
        await page.waitForURL(/.*\/dashboard/, { timeout: 10000 });
      }
    } else {
      // For production, we'd need to implement a test user flow
      // For now, skip this test in production
      test.skip(!isDevMode, 'Skipping in production - would need test user setup');
      return;
    }
    
    // Step 3: Verify dashboard loaded and shows greeting
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Check for user greeting (should contain "Welcome")
    const greeting = page.locator('text=/Welcome,/');
    await expect(greeting).toBeVisible();
    
    // Step 4: Reload page to test session persistence
    await page.reload();
    await expect(page).toHaveURL(/.*\/dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Step 5: Test logout functionality
    const logoutButton = page.locator('button:has-text("Logout")');
    await expect(logoutButton).toBeVisible();
    
    await logoutButton.click();
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*\/login/, { timeout: 10000 });
    
    // Step 6: Verify session is cleared by trying to access dashboard
    await page.goto('/dashboard');
    
    // Should redirect back to login with redirectTo parameter
    await expect(page).toHaveURL(/.*\/login.*redirectTo/, { timeout: 5000 });
  });

  test('redirectTo preservation', async ({ page }) => {
    // Step 1: Try to access a protected route while logged out
    await page.goto('/dashboard');
    
    // Should redirect to login with redirectTo parameter
    await expect(page).toHaveURL(/.*\/login.*redirectTo=%2Fdashboard/);
    
    // In dev mode, test the full flow
    const isDevMode = process.env.NODE_ENV === 'development';
    
    if (isDevMode) {
      const autoLoginButton = page.locator('a:has-text("Auto-login")');
      
      if (await autoLoginButton.isVisible()) {
        await autoLoginButton.click();
        
        // Should redirect back to the original dashboard URL
        await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
        
        // Clean up - logout
        const logoutButton = page.locator('button:has-text("Logout")');
        if (await logoutButton.isVisible()) {
          await logoutButton.click();
        }
      }
    }
  });

  test('protected routes require authentication', async ({ page }) => {
    const protectedRoutes = ['/dashboard', '/settings'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });
    }
  });
});
