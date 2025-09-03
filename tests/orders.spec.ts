import { test, expect } from '@playwright/test';

test.describe('Orders System', () => {
  test('complete order workflow: create order (user) → approve (admin)', async ({ browser }) => {
    // Create two browser contexts for different users
    const userContext = await browser.newContext();
    const adminContext = await browser.newContext();
    
    const userPage = await userContext.newPage();
    const adminPage = await adminContext.newPage();

    // Test data
    const testEmail = `user-${Date.now()}@test.com`;
    const adminEmail = `admin-${Date.now()}@test.com`;
    const password = 'test123456';

    try {
      // Step 1: User creates an order
      await userPage.goto('/auth/login');
      
      // Login as regular user (assume user exists or create one)
      await userPage.fill('[data-testid="email"]', testEmail);
      await userPage.fill('[data-testid="password"]', password);
      await userPage.click('[data-testid="login-button"]');

      // Navigate to Toko page
      await userPage.goto('/toko');
      await userPage.waitForLoadState('networkidle');

      // Find a product with stock and request order
      const requestOrderButton = userPage.locator('a:has-text("Request Order")').first();
      await expect(requestOrderButton).toBeVisible();
      await requestOrderButton.click();

      // Fill order form
      await userPage.waitForURL('**/orders/new**');
      await userPage.fill('[data-testid="qty"]', '2');
      await userPage.fill('[data-testid="notes"]', 'Test order from Playwright');
      await userPage.click('button:has-text("Create Order")');

      // Should redirect to order detail page
      await userPage.waitForURL('**/orders/**');
      const orderUrl = userPage.url();
      const orderId = orderUrl.split('/').pop();

      // Verify order was created with pending status
      await expect(userPage.locator('text=pending')).toBeVisible();
      await expect(userPage.locator('text=Test order from Playwright')).toBeVisible();

      // Step 2: Admin approves the order
      await adminPage.goto('/auth/login');
      
      // Login as admin
      await adminPage.fill('[data-testid="email"]', adminEmail);
      await adminPage.fill('[data-testid="password"]', password);
      await adminPage.click('[data-testid="login-button"]');

      // Navigate to orders list
      await adminPage.goto('/orders');
      await adminPage.waitForLoadState('networkidle');

      // Find the created order
      await adminPage.click(`a[href="/orders/${orderId}"]`);
      await adminPage.waitForLoadState('networkidle');

      // Approve the order
      await adminPage.click('button:has-text("Approve Order")');
      
      // Fill approval form (optional PO number)
      await adminPage.fill('[data-testid="po_number"]', 'PO-TEST-001');
      await adminPage.click('button:has-text("Approve Order")');

      // Verify order is approved
      await expect(adminPage.locator('text=approved')).toBeVisible();
      await expect(adminPage.locator('text=PO-TEST-001')).toBeVisible();

      // Step 3: Verify user can see approved order
      await userPage.reload();
      await expect(userPage.locator('text=approved')).toBeVisible();
      await expect(userPage.locator('text=PO-TEST-001')).toBeVisible();

      console.log('✅ Orders workflow test completed successfully');

    } catch (error) {
      console.error('❌ Orders workflow test failed:', error);
      throw error;
    } finally {
      await userContext.close();
      await adminContext.close();
    }
  });

  test('user permissions: regular user cannot approve orders', async ({ page }) => {
    const testEmail = `user-${Date.now()}@test.com`;
    const password = 'test123456';

    // Login as regular user
    await page.goto('/auth/login');
    await page.fill('[data-testid="email"]', testEmail);
    await page.fill('[data-testid="password"]', password);
    await page.click('[data-testid="login-button"]');

    // Try to access decision API directly (should fail)
    const response = await page.request.post('/api/orders/test-id/decision', {
      data: { action: 'approve' }
    });
    
    expect(response.status()).toBe(403);

    // Create an order and verify no admin actions are visible
    await page.goto('/orders/new');
    // ... create order ...
    
    // On order detail page, should not see admin action buttons
    await expect(page.locator('button:has-text("Approve Order")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Reject Order")')).not.toBeVisible();
  });

  test('order filtering and search', async ({ page }) => {
    // Login as admin to see all orders
    await page.goto('/auth/login');
    // ... login ...

    await page.goto('/orders');
    
    // Test status filter
    await page.selectOption('select', 'pending');
    await page.waitForLoadState('networkidle');
    
    // Verify only pending orders are shown
    const statusChips = await page.locator('[data-testid="status-chip"]').all();
    for (const chip of statusChips) {
      await expect(chip).toHaveText('pending');
    }

    // Test search functionality
    await page.fill('[data-testid="search"]', 'Test Product');
    await page.waitForLoadState('networkidle');
    
    // Verify search results
    await expect(page.locator('text=Test Product')).toBeVisible();
  });
});
