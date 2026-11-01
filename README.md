# Daywell — Everyday Life Assistant

A responsive, local-first lifestyle app for planning, money, reminders, shopping, local document files and dates, saved contacts, nearby-service searches, and everyday habits.

Built with **React, TypeScript, Vite, Tailwind CSS, Lucide, Motion, Recharts, and IndexedDB**. The app starts with an empty workspace and includes light, dark, and device-following themes.

**Your records stay in the current browser, on the current device, at the current site address. They do not sync across devices.** The profile is a clearly labelled local display preference. Export a backup before clearing browser data or moving to another browser or site address.

## Run locally

Requirements: Node.js **22.12 or newer** and npm. Open a terminal in the project folder, `C:\Users\muham\project\everyday-life` on this machine.

```sh
npm ci
npm run dev
```

Open the address Vite prints, normally **http://127.0.0.1:5173**. Existing dependencies are already installed on this machine. No environment variables, backend accounts, or API keys are needed.

To run the production build, including its service worker:

```sh
npm run build
npm run preview -- --port 4173 --strictPort
```

Open **http://127.0.0.1:4173**. Development and preview use different origins and therefore different local workspaces; use export/import to transfer records between them.

## Check on your phone over Wi-Fi

Connect your phone and PC to the same Wi-Fi, keep the PC running, and start a network preview from the project folder:

```sh
npm.cmd run preview -- --host 0.0.0.0 --port 4174 --strictPort --configLoader native
```

Open the `Network` address printed by Vite in Chrome or Safari on your phone. The current PC address is `http://192.168.1.10:4174`; it can change when your network changes. Do not use `localhost` on the phone, because that refers to the phone itself. If Windows asks, allow Node.js on your private network.

Normal record editing works over the local HTTP preview. Installation, service-worker caching/offline launch, notifications and automatic geolocation require HTTPS on a phone. The phone has its own local workspace: export/import a backup to transfer records from the PC. For full PWA testing, use a trusted HTTPS deployment.

## Working modules

| Screen | Features |
| --- | --- |
| Overview | Personal greeting, date, quick actions, saved-record summaries, task and habit completion, budget progress, shopping and document alerts. Show, hide, and reorder six dashboard widgets. |
| Daily planner | Create, edit, complete, reopen, delete, search, and filter tasks, appointments, and routines. Categories, priorities, descriptions, notes, dates, times, recurrence, overdue states, and list/day/week/month views. |
| Money & budgets | Editable income and expenses, category filters, daily/monthly/yearly totals, recorded-currency separation, spending history, charts, monthly category budgets, and editable savings goals. |
| Reminders | One-time and recurring reminders, categories, priorities, dates, times, notes, upcoming and overdue views, completed history, and document renewal links. |
| Shopping lists | Multiple lists, editable quantities and unit prices, checked items, estimated/actual/projected totals, reusable copies, and completed shopping history. |
| Documents | Names, categories, descriptions, notes, issue/expiry dates, and renewal lead times. Attach, replace, download, and remove a local PDF or image. Expiry alerts update from saved information. |
| Local help | Saved services and emergency contacts with custom categories, phone numbers, addresses, notes, filters, calling links, and offline editing. Saved area selection, permission-based geolocation, and explicit external map searches. |
| Health & habits | Water intake and goals, sleep hours and schedules, custom daily/weekday/weekend habits, progress logging, streaks, and seven-/30-day charts. |
| Settings | Local profile, currency, language previews, date format, theme, notifications, installation guidance, storage persistence requests, backup/restore, and confirmed workspace reset. |

Global search opens saved records across these modules, including budgets, savings goals, shopping items, saved contacts, and attachment filenames. Press **Ctrl+K** on Windows/Linux or **⌘K** on macOS, or use the search button. Search and dialogs support keyboard navigation and Escape to close. The bell opens an activity centre with upcoming tasks/reminders, document renewals, and recent changes to saved records. Its indicator reflects items to review; recent changes show current saved records, not a permanent audit history.

### How values and scheduling work

- **Currency:** INR (₹) is the default; USD, EUR, GBP, AED, and JPY are also available. Amounts are stored in integer minor units. Changing the preferred currency filters the money view; it does not convert existing records.
- **Budgets:** Usage is calculated from expenses with the same currency, category, and calendar month. Duplicate budgets for that combination are rejected.
- **Savings:** Saved amounts are manually maintained goals and do not create income or expense transactions.
- **Shopping:** Prices are per unit. Actual totals include only entered actual prices; projected totals use actual prices where present and estimates otherwise. A zero actual price is valid. Reusing a list creates a new copy with fresh item IDs and cleared completion/actual prices.
- **Recurrence:** Completing an item creates its next occurrence once. Missed dates are skipped, with month-end and leap-day anchors preserved. Reopening and completing the original again does not duplicate an already-created successor.
- **Documents:** Each record can hold one PDF, PNG, JPEG, or WebP, up to 2 MiB; combined attachments are limited to 6 MiB. Files are validated and stored locally in IndexedDB, included in JSON backups, and downloaded only on request. File contents are not indexed by search. Renewal alerts appear in the app and can trigger permitted browser notifications.
- **Wellness:** These are general habit-tracking tools. They do not provide medical diagnosis or treatment.

## Install and use offline

1. Open the production app online and allow its service worker to finish caching.
2. Use **Install Daywell** when your browser offers it. Otherwise use the browser's installation menu; on iOS Safari, use **Share → Add to Home Screen**.
3. After caching, the app's routes and saved records work offline, including new writes and reloads. An offline banner explains the connection state.

Service workers and installation require **HTTPS**, or a supported loopback address such as `localhost`/`127.0.0.1`. They are disabled on the Vite development server. The production build includes a manifest, normal/maskable icons, a cached app-shell navigation fallback, and `offline.html`.

An available app update shows an explicit update banner. Local help hands searches to an external map website and requires internet access. Saved contacts work offline. An in-app local-search provider is not configured; the app does not invent businesses or contact information.

### Browser notifications

Enable them in **Settings → Browser notifications**. Permission is requested only after your action, and denied/unsupported/failed requests have visible fallbacks.

Reminder checks run approximately once a minute while the app is **open and visible**. Delivered notification keys are saved to reduce duplicates. Notification behavior depends on the browser and operating system; closed-app alarms and visible OS-popup delivery are not guaranteed. Reminder lists and document alerts remain usable without notification permission.

## Backup and restore

- **Export backup** downloads a versioned JSON file containing the workspace and preferences.
- **Import & restore** validates the entire file, previews the record count/date, and asks before replacing the workspace. Restore replaces records rather than merging them.
- Contacts and complete attachment bytes are included. Older version 1 workspaces/backups without these fields still load; use the current app when restoring a new backup.
- The import/export limit is **10 MiB**. Invalid dates, out-of-range values, duplicate IDs, broken habit references, duplicate daily logs, duplicate budgets, and unsupported backup versions are rejected.
- Record replacement is one IndexedDB transaction. A failed record commit preserves the previous workspace; a separate preference-save failure is disclosed.
- **Delete all local records** requires confirmation and retains simple profile/display preferences.

Document storage and backups contain personal information and are not encrypted. Keep them privately. Browser storage can be cleared or evicted; the optional persistence request depends on browser support and approval.

## Verification

```sh
npx playwright install chromium
npm run check
npm run test:e2e
```

`check` runs TypeScript, ESLint, unit tests, and the production/PWA build. The browser suite uses the production preview on port 4173, so build first. It contains **37 browser tests**, including **eight accessibility/responsive checks**, and the unit suite contains **52 tests**.

For parallel browser checks on a capable machine:

```sh
npm run test:e2e -- --workers=2 --fully-parallel
```

The native-notification test deliberately opens a **headed Chromium window** to exercise real permission getters and notification constructors. Linux needs a graphical display, for example:

```sh
xvfb-run -a npm run test:e2e
```

Tests cover module CRUD, contact filtering/calling/map links, exact-byte file downloads, legacy-data compatibility, attachment validation, activity-centre links, monetary calculations, recurrence, refresh persistence, cross-tab writes, storage failures/recovery, search, widgets, backups, notification permission/deduplication, light/dark layouts, narrow phone/tablet widths, keyboard access, manifest/icon validity, and offline writes/reloads. Automated browser results currently cover Chromium; other browsers and physical-device installation need manual verification.

Open the latest browser report with:

```sh
npx playwright show-report --host 127.0.0.1
```

Reports and screenshots are generated in `playwright-report/` and `test-results/`. Subsequent runs replace them. See [DEVELOPMENT_PROGRESS.md](DEVELOPMENT_PROGRESS.md) for the latest verified results and [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) for the 58-point requirement review.

## Project structure

```text
src/
  core/          Domain schemas, repository, calculations, dates, money, search, backup, i18n
  state/         Data/preferences providers, commit queue, clock, notifications, PWA lifecycle
  components/    Shared accessible UI, navigation, search, charts, error handling
  pages/         Lazy-loaded feature screens and module forms
  styles.css     Theme tokens, responsive layouts, and shared visual styles
public/          App icons and standalone offline page
tests/
  unit/          Domain and IndexedDB tests
  e2e/           Production-browser workflows and accessibility checks
docs/
  ARCHITECTURE.md
```

On Windows PowerShell, use `npm.cmd` if the execution policy blocks `npm.ps1`. In a restricted Windows sandbox where the default config bundler cannot inspect parent directories, Node 24 supports the native config loader:

```sh
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --configLoader native
npm.cmd run build -- --configLoader native
npm.cmd run preview -- --port 4173 --strictPort --configLoader native
```

Leave that preview running while executing the browser tests from a second terminal. These loader options change how the tool reads configuration, not the application's storage or behavior.

Additional scripts: `npm run test:watch`, `npm run typecheck`, `npm run lint`, and `npm run icons` (regenerate the existing PWA icon assets).

## Future integrations

The repository and local-search interfaces provide boundaries for future cloud sync and real search providers. Supabase authentication, server-side authorization, cross-device conflict handling, and cloud document storage still need implementation before cloud accounts can be offered. Private service credentials belong on a backend.

English is the complete base dictionary. Hindi and Malayalam are clearly labelled translation-ready previews with English fallback; complete translations need native-language review. Architecture and extension details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
