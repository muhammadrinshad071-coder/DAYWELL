# Daywell — Architecture

## Current release

Daywell is a client-only, local-first application. React renders nine lazy-loaded screens inside a shared responsive shell. TypeScript and Zod define the data contract; IndexedDB persists application records. A production service worker caches static assets and provides offline app-shell navigation.

No backend configuration is required. The local profile is a display preference, and records remain on the current browser/device and origin. Cloud identity, cloud sync, and in-app business search are future integrations.

## Boundaries and entry points

| Location | Responsibility |
| --- | --- |
| `src/main.tsx` | React root, router, reduced-motion configuration, provider composition, and local font/CSS imports. |
| `src/App.tsx` | Lazy-loaded routes, storage loading/recovery states, transitions, and not-found handling. |
| `src/core/models.ts` | Domain schemas/types, workspace version, preferences, empty workspace, and entity metadata. |
| `src/core/repository.ts` | `WorkspaceRepository` contract and its transactional IndexedDB implementation. |
| `src/core/operations.ts` | Record mutations, completion/recurrence, and habit/wellness log updates. |
| `src/core/calculations.ts` | Financial summaries, budget usage, shopping totals, document status, habit streaks/progress, and wellness history. |
| `src/core/dates.ts`, `money.ts` | Local calendar handling, recurrence anchors, exact monetary parsing, formatting, and quantity totals. |
| `src/core/backup.ts`, `search.ts`, `activity.ts` | Versioned backup validation, local cross-module search, upcoming items and recent-record activity. |
| `src/core/attachments.ts` | Bounded PDF/image validation, binary-to-base64 encoding, download lifecycle, and file schemas. |
| `src/core/i18n.ts`, `translations/en.ts` | Typed UI text, interpolation, category labels, locale selection, and preview-language fallback. |
| `src/core/local-help.ts` | Real-search-provider interface and encoded external map search hand-off. |
| `src/state/` | Contexts/providers, serialized commits, preferences, foreground clock, notifications, PWA lifecycle, and form/query hooks. |
| `src/components/` | Shared UI primitives, navigation, search, lazy charts, skeletons, and rendering-error fallback. |
| `src/pages/` | Overview, planner, money, reminders, shopping, documents, local help, wellness, settings, and module forms. |
| `tests/unit/`, `tests/e2e/` | Domain/repository tests and real production-browser workflows. |

`src/styles.css` defines shared theme tokens and responsive layouts alongside Tailwind CSS. Motion provides lightweight transitions and honors reduced-motion preferences. Recharts is loaded separately when chart components are needed. The font and icons are served locally with the app.

## Provider composition

```text
PreferencesProvider
  ErrorBoundary
    FeedbackProvider
      ClockProvider
        DataProvider
          BrowserRouter
            PWAProvider
              App → AppShell → lazy feature screen
```

Preferences are available to translated feedback and rendering-error messages. The data provider receives shared confirmation/toast services. Routing is available to notifications and search. `ClockProvider` updates approximately once a minute while the document is visible and refreshes immediately when it becomes visible.

## Data model and ownership

### Application records: IndexedDB

- Database: **`daywell-local-v1`**, IndexedDB version **1**.
- Object store: **`workspace`**.
- Key: **`current`**.
- Value: one validated `Workspace` snapshot with `schemaVersion: 1`.

The snapshot contains tasks, transactions, budgets, savings goals, reminders, shopping lists (with nested items), documents with optional file attachments, saved contacts, habits, habit logs, wellness logs/settings, and notification deduplication keys. It starts empty; demonstration records exist only in test fixtures.

Top-level records and logs have UUIDs and creation/update timestamps. Nested shopping items have their own UUIDs. Schemas validate types, lengths, numeric ranges, real calendar dates, required scheduling fields, unique IDs, habit references, unique daily logs, and unique category/month/currency budgets. Validation happens at forms, load, writes, and restore boundaries.

The snapshot design is appropriate for the bounded local workspace. A future larger/cloud dataset can use indexed entity tables without changing feature UI contracts unnecessarily.

### Simple preferences: LocalStorage

**`daywell.preferences`** contains profile name, preferred currency, preview language, date format, theme, notification opt-in, widget order/visibility, and selected area. These values are validated independently. LocalStorage does not hold task, transaction, shopping, document, or health records.

The application does not upload records, document metadata/files, contacts, or backups. External map searches explicitly open a third-party site. Backups are downloaded through a temporary object URL. Document attachments remain local; public document links and bank connections are not implemented.

Storage belongs to the origin (scheme, host, and port), browser profile, and device. Development, preview, and a later deployment have separate workspaces; backup/restore is the current way to move data between them.

### Attachments and contacts

`PersonalDocument.attachment` is optional. It stores the original filename, allowlisted MIME type, byte size and base64 payload. One PDF, PNG, JPEG, or WebP is supported per record, with a 2 MiB per-file and 6 MiB combined-workspace bound. Validation checks extensions, signatures, safe filenames, base64 shape and declared sizes at load, import and write boundaries. File selection checks size before reading. Files are downloaded using short-lived blob URLs and are never rendered as active HTML in the app.

Keeping the bounded attachment payload in the same snapshot makes record/file save, delete, restore and reset atomic. It also preserves complete bytes in existing JSON backup workflows. This deliberately trades base64 overhead and snapshot scanning for a single transactional storage contract. A larger document library should move blobs to a dedicated repository and adopt streaming/archive backups.

Contacts have a name, user-defined category, phone and/or address, emergency flag and notes. Phone validation excludes URI control syntax. Calling and external maps require explicit link activation; names and notes render as React text. No emergency numbers are invented or seeded.

The additive schema accepts older version 1 snapshots and backups: absent `contacts` defaults to an empty array and absent `attachment` remains undefined. The IndexedDB database version is unchanged. New backups should be restored in the current app; older builds cannot read the new fields. Storage is device-local and unencrypted, which is disclosed in the UI.

### Activity centre

The bell derives its indicator from open tasks/reminders due within seven days (including overdue items) and documents inside their configured renewal window. The modal lists these chronologically and links to the existing record editors. Recent changes are the latest 50 saved records sorted by `updatedAt`; this is not an immutable event log and does not retain deleted records. The foreground clock refreshes date-sensitive indicators.

## Commit flow and cross-tab consistency

```text
User action
  → form/domain validation
  → DataProvider's serial promise queue
  → repository.update(mutation)
  → read latest stored snapshot inside a read/write transaction
  → mutate and validate the draft
  → put snapshot and await transaction completion
  → update React state, disclose success, broadcast the change
```

- Mutations run against the latest committed snapshot rather than an old UI snapshot. Independent additions from multiple tabs therefore retain one another's records.
- React record state changes after IndexedDB confirms the commit. A failed transaction aborts and preserves the previous stored workspace; form drafts remain available for retry.
- `BroadcastChannel('daywell-changes')` tells other tabs to reload committed data. Visibility changes also reload the workspace. LocalStorage `storage` events refresh valid preferences from other tabs.
- Loading failures show a retry state. Record-save failures and preference-save failures have distinct banners/status messages.
- Record and preference storage are separate, so workspace restore and preference replacement are not one cross-storage transaction. Preferences are applied only after the record restore succeeds; a preference-write failure is explicitly disclosed.

The repository boundary is:

```ts
interface WorkspaceRepository {
  load(): Promise<Workspace>
  update(mutation: (draft: Workspace) => void): Promise<Workspace>
  replace(workspace: Workspace): Promise<Workspace>
  close(): Promise<void>
}
```

## Accuracy and scheduling

### Money

Money is represented as integer minor units: paise/cents for two-decimal currencies and whole yen for JPY. Decimal input is parsed into integers before persistence. Bounds keep supported totals within safe integer arithmetic. Financial summaries and charts group records by their recorded currency and date range; no exchange-rate conversion is implied.

Budget usage matches expense type, currency, category, and month. Savings goal balances are manual and separate from the transaction ledger. Shopping unit prices are multiplied by quantities and rounded per line to the nearest minor unit. Actual prices use nullish checks so a valid zero is retained; projected totals fall back to estimates only when an actual price is absent.

### Dates and recurrence

Date-only fields use local `YYYY-MM-DD` calendar keys, avoiding UTC-midnight day shifts. Scheduled times use local browser time. Recurrence supports daily, weekly, monthly, and yearly intervals, preserves the original month-end/leap-day anchor, and skips missed occurrences.

Completing a recurring task/reminder saves the original completion and creates its successor in the same mutation. The original's `nextCreated` flag prevents duplicate successors when it is reopened and completed again. The application does not run an independent background scheduler.

### Habits and document alerts

Habit scheduling respects creation dates and daily/weekday/weekend frequency. Values are stored per habit and local date; one log is permitted for each combination. Streaks traverse scheduled days and allow today's incomplete habit to retain yesterday's streak. Progress uses the habit's current target/frequency, so edits can change historical calculated rates.

Water and optional sleep values share one wellness log per date. Charted missing sleep stays `null`, rather than being presented as zero hours. Document alerts are derived from expiry dates and renewal lead times; changing renewal metadata updates both dashboard and reminder views.

## Notification lifecycle

Notification opt-in is a preference; browser permission is requested from an explicit settings action. The notification component acts only when storage is ready, the app is visible/open, opt-in is enabled, and the native API reports permission granted.

Due reminders and document renewal alerts are shown in small batches. Keys include the record and its scheduled/expiry information. A session set suppresses repeats before persistence finishes, and a bounded IndexedDB key list suppresses repeats across refreshes. Clicking a notification opens its record. Construction failures are surfaced without affecting reminder CRUD.

This uses browser notification constructors, not Web Push or scheduled service-worker alarms. Browser/OS delivery behavior varies. Automated native tests verify permission getters, real constructors, click handling, opt-out, and saved deduplication; visible OS-popup delivery is not certified.

## Backup and destructive operations

Backups are strict versioned JSON:

```text
app: 'daywell'
version: 1
exportedAt: ISO timestamp
data: validated Workspace
preferences: validated Preferences
```

The size limit is 10 MiB. Import checks size and validates the entire structure before showing a replacement confirmation with its count/date. Restore replaces the snapshot in one IndexedDB transaction. Unsupported versions, malformed data, invalid references, and duplicate records/logs/budgets leave the current workspace intact.

Reset replaces application records with an empty workspace after confirmation and retains simple preferences. Individual destructive record actions also require confirmation. JSON backups include personal information and are not encrypted.

## PWA, offline, and hosting

`vite.config.ts` configures `vite-plugin-pwa` with prompt-based updates, a standalone manifest, normal/maskable PNG icons, and Workbox precaching of scripts, styles, HTML, icons, and local fonts. Navigation falls back to the cached `/index.html` app shell. `public/offline.html` is also included as a standalone offline information page.

The service worker is disabled during development. Offline behavior is verified against the production build/preview after activation and caching. `navigator.serviceWorker.ready` can resolve while a worker is still `activating`; tests wait for `activated` before asserting readiness.

The UI shows an offline banner and explicit update/install controls when the browser exposes those capabilities. Local IndexedDB writes continue offline. External map links are unavailable offline.

For deployment, serve **`dist/`** from an HTTPS origin with SPA history fallback to `index.html`. The current manifest, asset URLs, and Vite base assume deployment at the origin root. A subdirectory deployment needs coordinated base, manifest, asset, and service-worker scope changes. Prefer revalidation for HTML/service-worker files and long-lived caching for hashed assets.

## Localization and accessible UI

`TranslationKey` is derived from the complete English dictionary. Components request typed keys with named interpolation. Hindi and Malayalam have small preview dictionaries and fall back to English; full native-language review remains future work.

Shared primitives provide labelled controls, semantic buttons, progress labels, keyboard-operated tabs/menus, modal focus trapping/restoration, Escape handling, skip navigation, loading states, and toast feedback. Responsive navigation uses a sidebar on larger screens and a drawer/bottom navigation on mobile. Calendar/table overflow remains inside its container.

## Verification strategy

- **Unit:** exact money/date behavior, recurrence, domain calculations, schemas, operations, search, IndexedDB persistence/concurrency, and atomic rejection.
- **Browser:** all module workflows, saved calculations, refresh persistence, backup downloads/restores, storage denial/aborts and retry, cross-tab additions/preferences, global search, widget ordering/actions, native notification handling, PWA assets/activation, and offline writes/reloads.
- **Accessibility/responsive:** axe WCAG A/AA checks for populated modules/forms in light/dark desktop/mobile views, keyboard navigation/focus, chart containment, and narrow phone/tablet/long-name layouts.

Browser tests use isolated contexts and fixed calendar dates while retaining native timer/animation clocks. Test records are restored through the actual import UI. The production preview is the browser target. Exact verified run results are recorded in `DEVELOPMENT_PROGRESS.md`.

## Supabase and local-search extension plan

The repository contract is an integration boundary, not an implemented sync engine. A later cloud phase should add:

1. Real authentication and account-owned records with server-side authorization/row-level security.
2. Versioned database/schema migrations and an account-aware repository/sync service.
3. An offline outbox, deletion tracking, idempotent operations, conflict policy, and sync status/error handling.
4. An explicit, validated migration of the existing device workspace to the signed-in account.
5. Private cloud file storage/access rules before synchronising local document attachments.

An eventual `LocalSearchProvider` must return genuine business records with source URLs and handle unavailable/empty/error states. Any private provider credentials belong on a backend. The current explicit map-search hand-off remains usable without provider setup.
