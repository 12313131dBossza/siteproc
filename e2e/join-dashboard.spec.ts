import { test, expect } from '@playwright/test'

// NOTE: This test assumes an authenticated state or a helper to sign in is available.
// It is a skeleton and may require environment-specific auth setup.

test.skip('join company then stay on /dashboard after reload', async ({ page }) => {
  const companyId = process.env.TEST_COMPANY_ID
  if (!companyId) test.fail(true, 'TEST_COMPANY_ID env not set')

  await page.goto('/onboarding')
  await page.fill('input[placeholder="Company UUID"]', companyId!)
  await page.click('button:has-text("Join")')
  await page.waitForURL('**/dashboard')
  await page.reload()
  await expect(page).toHaveURL(/.*\/dashboard$/)
})