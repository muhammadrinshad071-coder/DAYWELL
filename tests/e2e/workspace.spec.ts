import { createBackup } from '../../src/core/backup'
import { emptyWorkspace, preferencesSchema } from '../../src/core/models'
import { populatedWorkspace } from '../fixtures'
import { test, expect, goto, restoreViaUI, readWorkspace, addTask, cancelDialog, confirmDelete, saveDialog } from './helpers'

test('keyboard search opens records across all modules, including budgets and savings goals', async ({ page }) => {
  await restoreViaUI(page, populatedWorkspace())
  const search = async (query: string) => {
    await page.keyboard.press('Control+k')
    const input = page.getByRole('searchbox', { name: 'Search tasks, money, reminders, and more…', exact: true })
    await expect(input).toBeFocused()
    await input.fill(query)
  }
  await search('Atlas')
  await expect(page.locator('.search-result')).toHaveCount(6)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  for (const record of [
    { query: 'Atlas plan', field: 'Title', value: 'Atlas plan', path: '/planner' },
    { query: 'Atlas groceries', field: 'Title', value: 'Atlas groceries', path: '/money' },
    { query: 'Atlas renewal', field: 'Title', value: 'Atlas renewal', path: '/reminders' },
    { query: 'Atlas insurance', field: 'Name', value: 'Atlas insurance', path: '/documents' },
    { query: 'Atlas reading', field: 'Name', value: 'Atlas reading', path: '/wellness' },
    { query: '500.00', field: 'Amount', value: '500.00', path: '/money' },
    { query: 'quiet holiday', field: 'Name', value: 'A quiet holiday', path: '/money' },
  ]) {
    await search(record.query)
    await expect(page.locator('.search-result')).toHaveCount(1)
    await page.keyboard.press('ArrowDown')
    await expect(page.locator('.search-result')).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog').getByLabel(record.field, { exact: true })).toHaveValue(record.value)
    await expect(page).toHaveURL(new RegExp(`${record.path}$`))
    await cancelDialog(page)
  }
  await search('Red apples')
  await page.locator('.search-result').click()
  await expect(page.locator('.shopping-detail h2')).toHaveText('Atlas weekly shop')
  await expect(page.getByTestId('shopping-item')).toContainText('Red apples')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await search('nothing matches this phrase')
  await expect(page.getByText('Nothing found in your local workspace', { exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
})

test('dashboard widgets retain their order and quick actions create real records', async ({ page }) => {
  test.setTimeout(60000)
  await restoreViaUI(page, populatedWorkspace())
  await goto(page)
  await expect(page.locator('.stat-value').first()).toHaveText('1')
  await expect(page.locator('.stat-value').nth(2)).toHaveText('0/1')
  await expect(page.locator('.dashboard-slot')).toHaveCount(6)
  await expect(page.getByTestId('money-chart')).toBeVisible()
  await page.getByRole('button', { name: 'Customise overview', exact: true }).click()
  await page.getByRole('dialog').getByRole('checkbox', { name: 'Health & habits', exact: true }).uncheck()
  await page.getByRole('button', { name: 'Move widget up: Documents', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  await expect(page.locator('.dashboard-slot-habits')).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('daywell.preferences')!).widgets)).toEqual(['tasks', 'spending', 'reminders', 'documents', 'shopping'])
  await page.getByRole('button', { name: 'Customise overview', exact: true }).click()
  for (const name of ['Daily planner', 'Money & budgets', 'Reminders', 'Health & habits', 'Shopping lists', 'Documents']) {
    await page.getByRole('dialog').getByRole('checkbox', { name, exact: true }).uncheck()
  }
  await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByText('Make this space your own', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Customise overview', exact: true }).first().click()
  await page.getByRole('dialog').getByRole('checkbox', { name: 'Daily planner', exact: true }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Done', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.locator('.quick-actions').getByRole('button', { name: 'Add a task', exact: true }).click()
  await page.getByRole('dialog').getByLabel('Title', { exact: true }).fill('From the overview')
  await saveDialog(page, 'Add to my planner')
  expect((await readWorkspace(page)).tasks).toHaveLength(2)
  for (const action of [
    { label: 'Log spending', title: 'Add transaction' },
    { label: 'Set a reminder', title: 'New reminder' },
    { label: 'Make a list', title: 'New list' },
  ]) {
    await goto(page)
    await page.locator('.quick-actions').getByRole('button', { name: action.label, exact: true }).click()
    await expect(page.getByRole('dialog').getByRole('heading', { name: action.title, exact: true })).toBeVisible()
    await cancelDialog(page)
  }
})

test('two tabs receive committed records and concurrent additions do not overwrite one another', async ({ page, context }) => {
  await goto(page, '/planner')
  await addTask(page, 'First tab task')
  const second = await context.newPage()
  const secondaryErrors: string[] = []
  second.on('pageerror', error => secondaryErrors.push(error.message))
  await goto(second, '/planner')
  await expect(second.getByTestId('task-row')).toHaveCount(1)
  await addTask(second, 'Second tab task')
  await expect(page.getByTestId('task-row')).toHaveCount(2)
  await Promise.all([addTask(page, 'Concurrent first'), addTask(second, 'Concurrent second')])
  await expect(page.getByTestId('task-row')).toHaveCount(4)
  await expect(second.getByTestId('task-row')).toHaveCount(4)
  expect((await readWorkspace(page)).tasks.map(record => record.title).sort()).toEqual(['Concurrent first', 'Concurrent second', 'First tab task', 'Second tab task'])
  await goto(second, '/settings')
  await second.getByLabel('What should we call you?', { exact: true }).fill('Tab friend')
  await second.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.avatar')).toHaveText('TA')
  expect(secondaryErrors).toEqual([])
  await second.close()
})

declare global {
  interface Window {
    __daywellBlockStorage: boolean
    __daywellFailWrites: boolean
    __daywellFailPreferences: boolean
  }
}

test('blocked IndexedDB loads offer recovery instead of reporting successful saves', async ({ page }) => {
  await page.addInitScript(() => {
    window.__daywellBlockStorage = true
    const open = indexedDB.open.bind(indexedDB)
    indexedDB.open = (...args: Parameters<IDBFactory['open']>) => {
      if (window.__daywellBlockStorage) throw new DOMException('Site storage is blocked', 'SecurityError')
      return open(...args)
    }
  })
  await page.goto('/planner')
  await expect(page.getByRole('heading', { name: 'Let’s reconnect to your workspace', exact: true })).toBeVisible()
  await expect(page.locator('.workspace-footer').getByRole('status')).toHaveText('Workspace unavailable')
  await page.evaluate(() => { window.__daywellBlockStorage = false })
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.locator('main h1')).toHaveText('A little structure. More space.')
  await addTask(page, 'Recovered workspace')
  expect((await readWorkspace(page)).tasks).toHaveLength(1)
})

test('failed native write transactions retain records and failed restores do not replace preferences', async ({ page }) => {
  test.setTimeout(60000)
  await page.addInitScript(() => {
    window.__daywellFailWrites = false
    const put = IDBObjectStore.prototype.put
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args: Parameters<IDBObjectStore['put']>) {
      const request = put.apply(this, args)
      if (window.__daywellFailWrites) this.transaction.abort()
      return request
    }
  })
  const original = populatedWorkspace()
  await restoreViaUI(page, original)
  await goto(page, '/planner')
  await page.evaluate(() => { window.__daywellFailWrites = true })
  await page.locator('.page-heading-action button').click()
  await page.getByRole('dialog').getByLabel('Title', { exact: true }).fill('Recover this draft')
  await page.getByRole('dialog').getByRole('button', { name: 'Add to my planner', exact: true }).click()
  await expect(page.locator('.error-banner')).toContainText('Your change could not be saved. Your previous records are safe.')
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(page.locator('.workspace-footer').getByRole('status')).toHaveText('The last change was not saved')
  expect(await readWorkspace(page)).toEqual(original)
  await page.evaluate(() => { window.__daywellFailWrites = false })
  await saveDialog(page, 'Add to my planner')
  await expect(page.locator('.error-banner')).toHaveCount(0)
  const recovered = await readWorkspace(page)
  expect(recovered.tasks).toHaveLength(2)
  await goto(page, '/settings')
  await page.evaluate(() => { window.__daywellFailWrites = true })
  const replacement = Buffer.from(createBackup(emptyWorkspace(), preferencesSchema.parse({ name: 'Replacement' })))
  const upload = () => page.locator('input[type="file"]').setInputFiles({ name: 'replacement.json', mimeType: 'application/json', buffer: replacement })
  await upload()
  await confirmDelete(page, 'Replace & restore')
  await expect(page.locator('.error-banner')).toBeVisible()
  expect(await readWorkspace(page)).toEqual(recovered)
  await expect(page.getByLabel('What should we call you?', { exact: true })).toHaveValue('Asha')
  await page.evaluate(() => { window.__daywellFailWrites = false })
  await upload()
  await confirmDelete(page, 'Replace & restore')
  await expect(page.getByLabel('What should we call you?', { exact: true })).toHaveValue('Replacement')
  expect(await readWorkspace(page)).toEqual(emptyWorkspace())
})

test('failed preference writes are disclosed and the saved profile survives refresh', async ({ page }) => {
  await page.addInitScript(() => {
    window.__daywellFailPreferences = false
    const set = Storage.prototype.setItem
    Storage.prototype.setItem = function (this: Storage, key: string, value: string) {
      if (key === 'daywell.preferences' && window.__daywellFailPreferences) throw new DOMException('Preferences are blocked', 'SecurityError')
      return set.call(this, key, value)
    }
  })
  const original = populatedWorkspace()
  await restoreViaUI(page, original)
  await page.evaluate(() => { window.__daywellFailPreferences = true })
  await page.getByLabel('What should we call you?', { exact: true }).fill('Temporary name')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.error-banner')).toContainText('Browser preferences could not be saved.')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('daywell.preferences')!).name)).toBe('Asha')
  expect(await readWorkspace(page)).toEqual(original)
  await page.reload()
  await expect(page.getByLabel('What should we call you?', { exact: true })).toHaveValue('Asha')
  await page.getByLabel('What should we call you?', { exact: true }).fill('Saved name')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(page.locator('.error-banner')).toHaveCount(0)
})
