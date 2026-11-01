import AxeBuilder from '@axe-core/playwright'
import type { Page, TestInfo } from '@playwright/test'
import { preferencesSchema } from '../../src/core/models'
import { FIXED_NOW, makeTask, populatedWorkspace } from '../fixtures'
import { sampleContact, sampleDocument } from '../file-fixtures'
import { test, expect, goto, restoreViaUI, cancelDialog, dismissToasts } from './helpers'

const routes = ['/', '/planner', '/money', '/money?tab=transactions', '/money?tab=budgets', '/money?tab=goals', '/reminders', '/shopping', '/documents', '/local', '/wellness', '/settings']
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
type Audit = { view: string; overflow: number; violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'] }

async function audit(page: Page, view: string, dialog = false): Promise<Audit> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await expect(page.locator('.skeleton-chart')).toHaveCount(0)
  const panel = dialog ? page.getByRole('dialog') : page.locator('main > div').first()
  await expect(panel).toHaveCSS('opacity', '1')
  const moneyChart = page.getByTestId('money-chart')
  if (!dialog && await moneyChart.count()) {
    await expect.poll(() => moneyChart.evaluate(container => {
      const bounds = container.getBoundingClientRect()
      const bars = Array.from(container.querySelectorAll('.recharts-bar-rectangle path'))
        .map(bar => bar.getBoundingClientRect()).filter(bar => bar.width > 0 && bar.height > 0)
      return {
        rendered: bars.length,
        clipped: bars.filter(bar => bar.left < bounds.left - 1 || bar.right > bounds.right + 1 || bar.top < bounds.top - 1 || bar.bottom > bounds.bottom + 1).length,
      }
    }), { message: 'Both recorded income and expenses must be visible inside the chart' }).toEqual({ rendered: 2, clipped: 0 })
  }
  const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - innerWidth))
  const builder = new AxeBuilder({ page }).withTags(tags)
  if (dialog) builder.include('[role="dialog"]')
  return { view, overflow, violations: (await builder.analyze()).violations }
}

async function assertAudits(testInfo: TestInfo, audits: Audit[]) {
  const failures = audits.filter(result => result.overflow > 1 || result.violations.length)
  if (failures.length) await testInfo.attach('accessibility-findings', { body: Buffer.from(JSON.stringify(failures, null, 2)), contentType: 'application/json' })
  expect(failures.map(result => ({
    view: result.view,
    overflow: result.overflow,
    violations: result.violations.map(violation => ({ id: violation.id, count: violation.nodes.length, target: violation.nodes[0]?.target, detail: violation.nodes[0]?.failureSummary })),
  })), 'WCAG A/AA findings and page-level horizontal overflow').toEqual([])
}

for (const mobile of [false, true]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${mobile ? 'mobile' : 'desktop'} ${theme} modules have accessible populated states and contained layouts`, async ({ page }, testInfo) => {
      test.setTimeout(180000)
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 })
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
      const data = populatedWorkspace()
      data.contacts.push(sampleContact())
      data.documents.push(sampleDocument())
      data.tasks.push(makeTask({ title: 'Finished checklist', completedAt: FIXED_NOW }))
      data.shoppingLists[0].items[0].checked = true
      await restoreViaUI(page, data, preferencesSchema.parse({ name: 'Asha', theme, location: 'Kochi' }))
      await dismissToasts(page)
      const audits: Audit[] = []
      for (const route of routes) {
        await goto(page, route)
        audits.push(await audit(page, route))
        if (['/', '/money', '/documents', '/local'].includes(route)) await page.screenshot({ path: testInfo.outputPath(`${route === '/' ? 'overview' : route.slice(1)}-${theme}.png`), fullPage: true })
        if (route === '/planner') {
          await page.getByRole('tab', { name: 'Month', exact: true }).click()
          audits.push(await audit(page, '/planner · month calendar'))
          if (mobile) await page.screenshot({ path: testInfo.outputPath('planner-month-mobile.png'), fullPage: true })
          await page.getByRole('tab', { name: 'List', exact: true }).click()
          await page.getByLabel('Status', { exact: true }).selectOption('completed')
          audits.push(await audit(page, '/planner · completed records'))
        }
      }
      await assertAudits(testInfo, audits)
    })
  }
}

test('empty pages and long record names reflow at narrow phone and tablet widths', async ({ page }) => {
  test.setTimeout(150000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of routes) {
      await goto(page, route)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} at ${width}px`).toBeLessThanOrEqual(width + 1)
    }
  }
  const data = populatedWorkspace()
  const name = 'A meaningful record with a longer name that still fits your everyday workspace'
  data.tasks[0].title = name
  data.transactions[0].title = name
  data.shoppingLists[0].name = name
  data.documents[0].name = name
  data.habits[0].name = name
  data.savingsGoals[0].name = name
  data.contacts.push(sampleContact({ name, category: 'A'.repeat(60), address: 'A'.repeat(500), notes: 'A'.repeat(3000) }))
  data.documents[0].attachment = { ...sampleDocument().attachment!, name: `${'A'.repeat(190)}.pdf` }
  await restoreViaUI(page, data)
  for (const width of [320, 768]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/planner', '/money', '/money?tab=goals', '/reminders', '/shopping', '/documents', '/local', '/wellness']) {
      await goto(page, route)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${route} with long names at ${width}px`).toBeLessThanOrEqual(width + 1)
    }
  }
})

for (const theme of ['light', 'dark'] as const) {
  test(`${theme} record forms, search, confirmations and navigation dialogs are accessible`, async ({ page }, testInfo) => {
    test.setTimeout(180000)
    await page.setViewportSize(theme === 'dark' ? { width: 390, height: 844 } : { width: 1440, height: 1000 })
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    const data = populatedWorkspace()
    data.documents.push(sampleDocument())
    await restoreViaUI(page, data, preferencesSchema.parse({ name: 'Asha', theme }))
    await dismissToasts(page)
    const audits: Audit[] = []
    for (const route of ['/planner?new=1', '/money?new=1', `/money?focus=${data.budgets[0].id}`, `/money?focus=${data.savingsGoals[0].id}`, '/reminders?new=1', '/shopping?new=1', '/documents?new=1', `/documents?focus=${data.documents.at(-1)!.id}`, '/local?new=1', '/wellness?new=1']) {
      await goto(page, route)
      await expect(page.getByRole('dialog')).toBeVisible()
      audits.push(await audit(page, route, true))
      await cancelDialog(page)
    }
    await goto(page, '/shopping')
    await page.getByRole('button', { name: 'Add item', exact: true }).click()
    audits.push(await audit(page, 'Shopping item form', true))
    await cancelDialog(page)
    await goto(page, '/wellness')
    await page.getByRole('button', { name: 'Water & sleep goals', exact: true }).click()
    audits.push(await audit(page, 'Water and sleep goals', true))
    await cancelDialog(page)
    await page.getByRole('button', { name: 'Log progress for Atlas reading', exact: true }).click()
    audits.push(await audit(page, 'Habit log form', true))
    await cancelDialog(page)
    await goto(page, '/planner')
    await page.getByRole('button', { name: 'Delete: Atlas plan', exact: true }).click()
    audits.push(await audit(page, 'Delete confirmation', true))
    await cancelDialog(page)
    await goto(page)
    await page.locator('.notification-button').click()
    audits.push(await audit(page, 'Activity centre', true))
    await page.getByRole('dialog').getByRole('tab', { name: 'Recent changes', exact: true }).click()
    audits.push(await audit(page, 'Activity centre recent records', true))
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Customise overview', exact: true }).click()
    audits.push(await audit(page, 'Dashboard customisation', true))
    await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.keyboard.press('Control+k')
    await page.getByRole('searchbox').fill('Atlas')
    await expect(page.locator('.search-result')).toHaveCount(6)
    audits.push(await audit(page, 'Global search results', true))
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByRole('button', { name: 'Open navigation', exact: true }).click()
    audits.push(await audit(page, 'Mobile navigation', true))
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await assertAudits(testInfo, audits)
  })
}

test('keyboard skip links, tab controls and modal focus work without a pointer', async ({ page }) => {
  await goto(page, '/planner')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Skip to content', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('main')).toBeFocused()
  const tabs = page.getByRole('tablist', { name: 'Planner calendar', exact: true })
  await tabs.getByRole('tab', { name: 'List', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(tabs.getByRole('tab', { name: 'Day', exact: true })).toBeFocused()
  await expect(tabs.getByRole('tab', { name: 'Day', exact: true })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('End')
  await expect(tabs.getByRole('tab', { name: 'Month', exact: true })).toBeFocused()
  await page.keyboard.press('Home')
  await expect(tabs.getByRole('tab', { name: 'List', exact: true })).toBeFocused()
  const trigger = page.locator('.page-heading-action').getByRole('button', { name: 'New task', exact: true })
  await trigger.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByLabel('Title', { exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Add to my planner', exact: true }).focus()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(dialog.getByRole('button', { name: 'Add to my planner', exact: true })).toBeFocused()
  await page.keyboard.press('Control+k')
  await expect(dialog).toHaveCount(1)
  await expect(dialog.getByRole('searchbox')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})
