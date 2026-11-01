import { populatedWorkspace } from '../fixtures'
import { test, expect, goto, restoreViaUI, addTask, readWorkspace } from './helpers'

test('the install manifest and icons are valid same-origin production assets', async ({ page }) => {
  await goto(page)
  const response = await page.request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest).toMatchObject({ id: '/', start_url: '/', scope: '/', display: 'standalone', short_name: 'Daywell' })
  expect(manifest.icons).toContainEqual(expect.objectContaining({ src: '/icon-maskable-512.png', purpose: 'maskable' }))
  for (const { src, sizes } of manifest.icons as { src: string; sizes: string }[]) {
    const dimensions = await page.evaluate(async path => {
      const response = await fetch(path)
      const image = await createImageBitmap(await response.blob())
      const size = `${image.width}x${image.height}`
      image.close()
      return size
    }, src)
    expect(dimensions).toBe(sizes)
  }
  // `ready` can resolve while the active worker is still finishing activation.
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state), {
    message: 'The production service worker must finish activation',
  }).toBe('activated')
})

test('cached routes and saved records work offline, including a new write and a hard reload', async ({ page, context }) => {
  test.setTimeout(90000)
  const original = populatedWorkspace()
  await restoreViaUI(page, original)
  await goto(page, '/local')
  await page.getByLabel('Your area', { exact: true }).fill('Kochi')
  await page.getByRole('button', { name: 'Save area', exact: true }).click()
  await page.evaluate(() => navigator.serviceWorker.ready.then(registration => registration.active?.state))
  await page.reload()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await expect(page.locator('.offline-banner')).toContainText('Offline · your local workspace is available')
  for (const path of ['/', '/planner', '/money', '/reminders', '/shopping', '/documents', '/local', '/wellness', '/settings']) {
    await goto(page, path)
    await expect(page.locator('.offline-banner')).toBeVisible()
  }
  await goto(page, '/planner')
  await addTask(page, 'Written while offline')
  await page.reload()
  await expect(page.getByTestId('task-row')).toHaveCount(2)
  await expect(page.getByTestId('task-row').filter({ hasText: 'Written while offline' })).toBeVisible()
  const saved = await readWorkspace(page)
  expect(saved.transactions).toEqual(original.transactions)
  expect(saved.documents).toEqual(original.documents)
  expect(saved.shoppingLists).toEqual(original.shoppingLists)
  await goto(page, '/local')
  await expect(page.getByLabel('Your area', { exact: true })).toHaveValue('Kochi')
  await expect(page.getByRole('link', { name: /^Search on Maps:/ })).toHaveCount(0)
  await context.setOffline(false)
  await expect(page.locator('.offline-banner')).toHaveCount(0)
  await page.reload()
  expect((await readWorkspace(page)).tasks).toHaveLength(2)
})
