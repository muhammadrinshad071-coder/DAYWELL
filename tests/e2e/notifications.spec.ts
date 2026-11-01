import { populatedWorkspace, TODAY } from '../fixtures'
import { test, expect, restoreViaUI, readWorkspace, saveDialog } from './helpers'

// Headless Chromium reports Notification.permission as denied even after a grant.
// Exercise the native permission getter and real constructors in a browser window.
test.use({ headless: false })

declare global {
  interface Window {
    __daywellNotifications: { title: string; notification: Notification }[]
    __daywellNotificationError: string | null
  }
}

test('native notification permission, delivery calls and persisted deduplication respect the off switch', async ({ page, context }) => {
  test.setTimeout(60000)
  await context.grantPermissions(['notifications'])
  await page.addInitScript(() => {
    const scope = window
    scope.__daywellNotifications = []
    scope.__daywellNotificationError = null
    window.Notification = new Proxy(Notification, {
      get(target, property) {
        return property === 'requestPermission' ? target.requestPermission.bind(target) : Reflect.get(target, property, target)
      },
      construct(target, argumentsList) {
        try {
          const notification = Reflect.construct(target, argumentsList) as Notification
          scope.__daywellNotifications.push({ title: String(argumentsList[0]), notification })
          return notification
        } catch (error) { scope.__daywellNotificationError = String(error); throw error }
      },
    })
  })
  const data = populatedWorkspace()
  data.reminders[0].date = TODAY
  data.reminders[0].time = '09:00'
  await restoreViaUI(page, data)
  expect(await page.evaluate(() => window.__daywellNotifications.length)).toBe(0)
  expect(await page.evaluate(() => Notification.permission)).toBe('granted')
  await page.getByRole('button', { name: 'Enable notifications', exact: true }).click()
  await expect.poll(() => page.evaluate(() => ({ permission: Notification.permission, hidden: document.hidden, captured: window.__daywellNotifications.length, error: window.__daywellNotificationError }))).toEqual({ permission: 'granted', hidden: false, captured: 2, error: null })
  await expect.poll(async () => (await readWorkspace(page)).notified.length).toBe(2)
  expect(await page.evaluate(() => window.__daywellNotifications.map(item => item.notification.body))).toEqual(['Atlas renewal', 'Renewal check-in: Atlas insurance'])
  await page.getByRole('button', { name: 'Send a test notification', exact: true }).click()
  expect(await page.evaluate(() => window.__daywellNotifications.map(item => item.notification.tag))).toContain('daywell-test')
  await page.getByRole('button', { name: 'Turn off notifications', exact: true }).click()
  await page.locator('.sidebar').getByRole('link', { name: 'Reminders', exact: true }).click()
  await page.locator('.page-heading-action button').click()
  await page.getByRole('dialog').getByLabel('Title', { exact: true }).fill('Added while disabled')
  await saveDialog(page, 'Set reminder')
  expect(await page.evaluate(() => window.__daywellNotifications.length)).toBe(3)
  await page.locator('.sidebar').getByRole('link', { name: 'Settings', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Enable notifications', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Enable notifications', exact: true }).click()
  await expect.poll(async () => (await readWorkspace(page)).notified.length).toBe(3)
  expect(await page.evaluate(() => window.__daywellNotifications.map(item => item.notification.body))).toEqual(['Added while disabled'])
  await page.evaluate(() => {
    const notification = window.__daywellNotifications[0].notification
    notification.onclick?.call(notification, new Event('click'))
  })
  await expect(page.getByRole('dialog').getByLabel('Title', { exact: true })).toHaveValue('Added while disabled')
})
