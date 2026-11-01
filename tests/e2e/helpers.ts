import { test as base, expect, type Page } from '@playwright/test'
import { createBackup } from '../../src/core/backup'
import { preferencesSchema, type Preferences, type Workspace } from '../../src/core/models'
import { FIXED_NOW, TODAY } from '../fixtures'

export { expect }
export const test = base.extend({
  page: async ({ page, context }, use) => {
    const errors: string[] = []
    // Pin calendar dates without replacing the native animation/timer clocks.
    await context.addInitScript(now => {
      const NativeDate = Date
      const fixed = new NativeDate(now).valueOf()
      window.Date = new Proxy(NativeDate, {
        construct(target, argumentsList) { return Reflect.construct(target, argumentsList.length ? argumentsList : [fixed]) },
        apply() { return new NativeDate(fixed).toString() },
        get(target, property, receiver) { return property === 'now' ? () => fixed : Reflect.get(target, property, receiver) },
      })
    }, FIXED_NOW)
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error' && message.text().includes('Daywell render error')) errors.push(message.text()) })
    await use(page)
    expect(errors, 'Unexpected browser rendering errors').toEqual([])
  },
})

export async function goto(page: Page, path = '/') {
  await page.goto(path)
  await expect(page.locator('main h1')).toBeVisible()
}

export async function readWorkspace(page: Page): Promise<Workspace> {
  return page.evaluate(() => new Promise<Workspace>((resolve, reject) => {
    const request = indexedDB.open('daywell-local-v1', 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const read = db.transaction('workspace', 'readonly').objectStore('workspace').get('current')
      read.onerror = () => { db.close(); reject(read.error) }
      read.onsuccess = () => { db.close(); resolve(read.result) }
    }
  }))
}

export async function saveDialog(page: Page, label: string) {
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: label, exact: true }).click()
  await expect(dialog).toHaveCount(0)
}

export async function confirmDelete(page: Page, label = 'Delete') {
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: label, exact: true }).click()
  await expect(dialog).toHaveCount(0)
}

export async function cancelDialog(page: Page) {
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

export async function dismissToasts(page: Page) {
  // Toasts can expire, and dismissing one shifts the remaining locator indices.
  // Resolve the first live control on each retry instead of capturing nth locators.
  await expect(async () => {
    const dismiss = page.locator('.toast-stack').getByRole('button', { name: 'Dismiss message', exact: true })
    if (await dismiss.count()) await dismiss.first().click({ timeout: 1000 })
    await expect(page.locator('.toast-stack .toast')).toHaveCount(0, { timeout: 1000 })
  }).toPass({ timeout: 10000 })
}

export async function addTask(page: Page, title: string) {
  await page.locator('.page-heading-action button').click()
  await page.getByRole('dialog').getByLabel('Title', { exact: true }).fill(title)
  await saveDialog(page, 'Add to my planner')
}

export async function restoreViaUI(page: Page, data: Workspace, preferences: Preferences = preferencesSchema.parse({ name: 'Asha' })) {
  await goto(page, '/settings')
  await page.locator('input[type="file"]').setInputFiles({ name: 'daywell-backup.json', mimeType: 'application/json', buffer: Buffer.from(createBackup(data, preferences)) })
  await confirmDelete(page, 'Replace & restore')
  await expect(page.getByText('Backup restored on this device', { exact: true })).toBeVisible()
}

export async function addTransaction(page: Page, { title, amount, type = 'expense', date = TODAY, currency = 'INR', category, notes = '' }: { title: string; amount: string; type?: 'income' | 'expense'; date?: string; currency?: string; category?: string; notes?: string }) {
  await page.locator('.page-heading-action button').click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Title', { exact: true }).fill(title)
  await dialog.getByLabel('Transaction type', { exact: true }).selectOption(type)
  await dialog.getByLabel('Currency', { exact: true }).selectOption(currency)
  await dialog.getByLabel('Amount', { exact: true }).fill(amount)
  await dialog.getByLabel('Date', { exact: true }).fill(date)
  if (category) await dialog.getByLabel('Category', { exact: true }).selectOption(category)
  if (notes) await dialog.getByLabel('Notes', { exact: true }).fill(notes)
  await saveDialog(page, 'Save transaction')
}
