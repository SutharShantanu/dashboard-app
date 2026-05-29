# Audit of `temp/project_details.md`

Reviewed against the actual repository on 2026-05-29. Verdict: the draft is a
useful starting point with a roughly accurate tech-stack summary and a mostly
sound cleanup list, but it contains **one critical architecture error, one
dangerous deletion recommendation, several mischaracterizations, and notable
omissions**. It needs a substantial rewrite of the architecture/data-flow
sections; the cleanup table and roadmap can be kept with corrections.

---

## 1. What the repo actually looks like (ground truth)

A Next.js 16 (App Router, Turbopack) + React 19 dashboard backed by MongoDB
(Mongoose) with NextAuth v4 (JWT sessions). It manages tabular "student" data
that is mirrored **one-way from Google Sheets into MongoDB**, with live
in-process fan-out to connected browsers over Server-Sent Events.

Subsystems / boundaries:

- **`app/api/*` (backend)** — route handlers for auth, users, students,
  connected-sheets, permission-presets, logs, drive listing, sheet-health,
  presence, the SSE `stream`, and the inbound `sheet-webhook`.
- **`lib/sheets.ts` (domain core, 648 lines)** — Google auth + Sheets fetch,
  Google Drive listing, User CRUD, Student/row CRUD, audit-log append,
  connected-sheet CRUD, and `resolveUserAllowedColumns` permission logic. This
  is genuinely overloaded (see below).
- **`lib/sse.ts`** — an in-memory `SseManager` singleton holding client
  connections + presence state. Stored on `globalThis`.
- **`lib/auth.ts`** — NextAuth config: Credentials + Google + (optional) Auth0
  providers, JWT/session callbacks that hydrate role and `perSheetPermissions`.
- **`lib/mongodb.ts`, `lib/email.ts`, `lib/date.tsx`, `lib/utils.ts`** —
  connection caching, nodemailer (OTP/password reset), date formatting, cn().
- **`models/*` (5 schemas)** — `User`, `AuditLog`, `SheetRow`, `ConnectedSheet`,
  `PermissionPreset`.
- **`components/*`** — domain UI + a large `components/ui/*` shadcn library.
- **`middleware.ts`** — `withAuth` route protection; gates `/users` to admins.
- **`__tests__/*`** — an existing Vitest suite (users, students, sheets, debug).
- Root/`scratch/`/`simulated_sheets/` — genuine throwaway clutter.

---

## 2. Claim-by-claim verification

### Correct claims
- Next.js 16 App Router, Tailwind v4, shadcn/ui, React Query, MongoDB/Mongoose,
  NextAuth, `googleapis`, Apps Script webhook. ✅ (matches `package.json`,
  `README.md`).
- `lib/sheets.ts` is a God object at 648 lines mixing Google API, Mongo CRUD for
  multiple models, audit logging, and permission resolution. ✅ Confirmed.
- Root directory is cluttered with ad-hoc scripts (`test_*.js/.cjs`,
  `replace_*.py`, `scratch_test_dns.js`, `scratch/`, `simulated_sheets/`,
  `rewrite_sheets.ts`). ✅ Confirmed. `rewrite_sheets.ts` is a one-off codegen
  script whose last line is `fs.writeFileSync('lib/sheets.ts', content)` — it
  regenerates an **older** version of `sheets.ts` and is stale/dangerous to run.
- `app-sidebar.tsx` fetches with manual `useEffect` + `fetch` + local state
  (`connectedSheets`, `isLoadingSheets`). ✅ Confirmed (lines 104, 116, 203).
- `components.json` and `scripts/` should be kept. ✅ Reasonable.

### Incorrect / misleading claims (must fix)

1. **"Bidirectional data synchronization … keeping it perfectly synced with a
   connected Google Spreadsheet" / "App to Google Sheets: UI changes … push the
   update to the Google Sheets API." — FALSE.**
   There is **no write-back to Google Sheets anywhere** in `app/` or `lib/`
   (grep for `values.update/append/batchUpdate` returns nothing).
   `updateStudentCell` and `createStudent` write to MongoDB and call
   `sseManager.broadcast` only. Sync is **one-way: Sheets → MongoDB** via
   `app/api/sheet-webhook`. `SYNC_STRATEGY.md` and `README.md` repeat the same
   "two-way" overclaim. This is the most important correction.

2. **"temp/ … Contains only an empty or notes markdown file. → Delete entirely."
   — FALSE and DANGEROUS.** `temp/` holds `project_details.md` (the source of
   this audit) and now the generated outputs. Do **not** delete `temp/`.

3. **"SSE broadcasting" framed as part of the `sheets.ts` bottleneck / the SSE
   logic living in sheets.ts.** Mischaracterized. The SSE manager lives in
   `lib/sse.ts`; `sheets.ts` only *calls* `sseManager.broadcast` twice. The
   God-object critique of `sheets.ts` is still valid on other grounds, but SSE
   is not part of it.

4. **"@tanstack/react-query installed, yet components … still rely on manual
   useEffect + fetch."** Overstated as a blanket condition. React Query **is
   adopted** in `app/(dashboard)/students`, `dashboard`, `sheets/[id]`,
   `settings`, plus `sync-indicator.tsx` and `dashboard-breadcrumb.tsx`
   (`QueryClientProvider` is wired in `components/providers.tsx`). The real
   problem is **inconsistent adoption** — `app-sidebar.tsx`, `drive-browser.tsx`,
   `settings-dialog.tsx`, `logs-data-table.tsx`, `google-connection-card.tsx`,
   and `connect-sheet-navbar-button.tsx` still hand-roll `fetch`. The
   `app-sidebar` example is correct; the generalization is not.

5. **"models/ … (User, AuditLog, SheetRow, ConnectedSheet)" — incomplete.**
   There are **5** models; `PermissionPreset` is missing from the list.

### Stale / unverifiable assumptions
- "rewrite_sheets.ts … Looks like an old iteration … Review, extract any missing
  logic." It is not a parallel module — it is a generator that *overwrites*
  `lib/sheets.ts`. Treat it as delete-on-sight, not as a source of logic.
- "temp/ contains only notes" — stale snapshot.

---

## 3. Important details the draft omits

- **Auth surface is much larger than "Admin vs Sub-admin."** Three NextAuth
  providers (Credentials, Google, Auth0), JWT strategy, OTP/forgot-password +
  change-password flows (`app/api/auth/*`), nodemailer (`lib/email.ts`),
  password-strength UI, and a `session-log` endpoint.
- **Presence/collaboration**: `app/api/presence/focus|blur` + `lib/sse.ts`
  presence map drive live "who is editing which cell" indicators.
- **Permission system has two layers**: legacy comma-separated `allowedColumns`
  **and** `perSheetPermissions` (Map<sheet, columns[]>), reconciled in
  `resolveUserAllowedColumns` (`lib/sheets.ts:597`), plus a `PermissionPreset`
  model + `/api/permission-presets` API and `permission-selector.tsx` UI.
- **Existing test suite** (Vitest) and Playwright dependency — the draft implies
  the repo has no real tests.
- **`middleware.ts`** route protection is not mentioned.

---

## 4. Real quality risks found (with file references)

Ranked by impact × likelihood.

1. **Webhook is wired incorrectly (correctness bug).**
   `app/api/sheet-webhook/route.ts` calls
   `updateStudentCell(student.ID, columnName, value, "google-sheets-sync", "webhook")`.
   The signature is `(id, column, newValue, actor, actorRole, ip, sheetName,
   spreadsheetId)`, so `"webhook"` is passed as **actorRole**, and `sheetName`/
   `spreadsheetId` default — meaning the webhook only ever touches
   `sheetId="default"` while real rows are keyed by `spreadsheetId`. Inbound
   edits to any connected sheet will fail to match (`getStudents(sheetName)` is
   likewise called without a `spreadsheetId`).

2. **Webhook auth header mismatch.** The route validates an
   `Authorization: Bearer <secret>` header, but the Apps Script in
   `SYNC_STRATEGY.md` sends `headers: { "x-webhook-secret": ... }`. As shipped,
   the documented integration returns 401.

3. **In-memory SSE singleton is incompatible with serverless/multi-instance.**
   `lib/sse.ts` keeps clients in a module-level `Set` on `globalThis`. On Vercel
   (the documented deploy target) or any multi-instance host, a broadcast only
   reaches clients pinned to the same instance. Real architectural constraint.

4. **Security smells.** Hardcoded fallbacks for `NEXTAUTH_SECRET`
   (`lib/auth.ts`) and `SHEET_WEBHOOK_SECRET` (defaults to `"default_secret"`);
   the **Google provider assigns `role: "admin"` to any successful Google
   login** (`lib/auth.ts`) — a privilege-escalation path if Google sign-in is
   enabled in production.

5. **Pervasive weak typing.** ~114 occurrences of `any`/`as any` across
   `lib/` + `app/`. `perSheetPermissions?: any` in `sheets.ts`; `Student` is a
   string-map with an index signature; `isActive` is `"TRUE"/"FALSE"` strings in
   the lib layer but `boolean` in the model, converted ad hoc in multiple
   places. This is the main maintainability tax.

6. **`getStudents` does implicit lazy sync on read** (`lib/sheets.ts:328`),
   coupling a read path to a network call to Google + writes to Mongo. Hard to
   reason about and test.

7. **Repeated username-regex escaping** (`auth.ts`, `sheets.ts` ×3) — duplicated
   logic that should be a single helper.

---

## 5. Cleanup list — corrected

Safe to delete (confirmed throwaway, not imported by build/runtime):
`scratch/`, `simulated_sheets/`, root `test_*.js` / `test_*.cjs`,
`scratch_test_dns.js`, `replace_icons.py`, `replace_settings.py`,
`rewrite_sheets.ts` (codegen that overwrites `lib/sheets.ts` — delete, do not
"extract logic"). Note: none of these are gitignored, so they are tracked noise.

**Keep:** `temp/` (corrects the draft), `components.json`, `scripts/` (document
usage; some — `seed-admin.js`+`.ts`, `migrate*.js/.ts` — are duplicated in JS+TS
and should be deduped), `__tests__/`.

---

## 6. Document disposition

**Substantially amend (partial rewrite), do not split.** The draft's structure
(summary → understanding → cleanup → modularization → roadmap) is fine and worth
keeping. But the architecture and data-flow sections assert a two-way sync that
does not exist and recommend deleting `temp/`, so those sections must be
rewritten from repo facts. Splitting into multiple docs is unnecessary at this
size. The revised version is in `temp/project_details.revised.md`.
