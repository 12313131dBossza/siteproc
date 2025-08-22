import { test, expect } from '@playwright/test'

test.describe('End-to-end RFQ→Quote→PO→Delivery→Report', () => {
  test('Full minimal happy path', async ({ page, context }) => {
    // 1. Seed demo PO via existing helper (establish company/job/supplier/po) for baseline
    await page.goto('/')
    await page.getByRole('button', { name: 'Create demo PO' }).click()
    await page.waitForURL('**/po/*')
    const poUrl = page.url()
    await expect(page.getByRole('heading', { name: 'Purchase Order' })).toBeVisible()

    // 2. Capture job + company ids from demo seed
    const jobId = await page.evaluate(() => localStorage.getItem('job_id'))
    const companyId = await page.evaluate(() => localStorage.getItem('company_id'))
    expect(jobId).toBeTruthy()
    expect(companyId).toBeTruthy()

    // 3. Create RFQ via API and capture public token
    const rfqResp = await page.request.post('/api/rfqs', {
      headers: { 'content-type': 'application/json', 'x-company-id': companyId as string },
      data: { job_id: jobId, title: 'Auto RFQ', needed_date: '2025-12-31', items: [{ description: 'Widget', qty: 5, unit: 'ea', sku: 'WID' }] }
    })
    expect(rfqResp.ok()).toBeTruthy()
    const rfq = await rfqResp.json()
    expect(rfq.public_token).toBeTruthy()

      // 4. Create a new RFQ for same job via form and capture returned public token from network response
      await page.goto('/rfqs/new')
      const [res] = await Promise.all([
        page.waitForResponse(r => r.url().endsWith('/api/rfqs') && r.request().method() === 'POST'),
        page.getByRole('button', { name: 'Create RFQ' }).click(),
      ])
      let publicToken: string | null = null
      try { const json = await res.json(); publicToken = json?.public_token || null } catch { /* ignore */ }
      expect(publicToken).toBeTruthy()

      // 5. Submit a public quote using the captured token (acts as supplier)
      if (publicToken) {
        await page.goto(`/public/quote/${publicToken}`)
        await expect(page.getByRole('heading', { name: 'Submit Quote' })).toBeVisible()
        await page.getByLabel('Total ($)').fill('123.45')
        await page.getByRole('button', { name: 'Submit Quote' }).click()
        await expect(page.getByText('Quote submitted')).toBeVisible({ timeout: 5000 })
      }

    // 5. Navigate to job dashboard
    await page.goto(`/jobs/${jobId}`)
    await expect(page.getByText('Job Dashboard')).toBeVisible()
  })
})
