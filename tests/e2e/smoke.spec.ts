import { test, expect, goto } from './helpers'

test('all modules open with honest empty states and no seeded records', async ({ page }) => {
  for (const path of ['/', '/planner', '/money', '/reminders', '/shopping', '/documents', '/local', '/wellness', '/settings']) {
    await goto(page, path)
    await expect(page.locator('.workspace-footer')).toContainText('Local workspace')
  }
  await goto(page)
  await expect(page.locator('[data-testid="money-chart"]')).toHaveCount(0)
  await expect(page.getByText('Your records stay in this browser on this device.', { exact: false }).first()).toBeVisible()
  await expect(page.locator('.stat-value').first()).toHaveText('0')
  await expect(page.getByRole('button', { name: 'Plan my day', exact: true })).toBeEnabled()
})

test('the overview is usable at desktop and mobile sizes', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await goto(page)
  await page.screenshot({ path: testInfo.outputPath('overview-empty-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.mobile-bottom-nav')).toBeVisible()
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(width).toBeLessThanOrEqual(390)
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Documents', exact: true })).toBeVisible()
  await page.getByRole('dialog').getByRole('link', { name: 'Documents', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('main h1')).toHaveText('Important details. Quietly organised.')
})
