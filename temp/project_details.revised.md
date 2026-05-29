# Dashboard App — Project Details (Revised)

> Revised 2026-05-29 from direct repository inspection. Supersedes the original
> draft. Corrections of note: sync is **one-way (Sheets → MongoDB)**, not
> bidirectional; React Query is **partially** adopted; there are **5** models;
> `temp/` must **not** be deleted.

## 1. Overview

A Next.js 16 (App Router, Turbopack) + React 19 dashboard for managing tabular
"student" data. Rows originate in Google Sheets and are mirrored into MongoDB;
the UI reads from MongoDB and pushes live updates to connected browsers over
Server-Sent Events (SSE). Access is role-based (admin / sub-admin) with
column-level permissions, and all mutations are written to an audit log.

**Sync direction is one-way today:** Google Sheets → webhook → MongoDB → SSE →
browser. There is no write-back from the app to Google Sheets. `SYNC_STRATEGY.md`
and `README.md` describe "two-way" sync aspirationally — only the inbound half
is implemented.

## 2. Tech Stack

- **Framework:** Next.js 16 App Router (Turbopack), React 19
- **Database:** MongoDB via Mongoose
- **Auth:** NextAuth v4 (JWT sessions); Credentials + Google + optional Auth0
- **Styling/UI:** Tailwind CSS v4, shadcn/ui, lucide/`@thesvg/react`
- **Client data:** TanStack Query (partial), TanStack Table, React Hook Form, Zod
- **Integrations:** Google Sheets + Drive (`googleapis`), Google Apps Script
  webhook, nodemailer (OTP / password reset), XLSX import
- **Testing:** Vitest (`__tests__/`), Playwright (dependency present)

## 3. Folder structure & responsibilities

- `app/` — App Router.
  - `(dashboard)/` — protected UI: `dashboard`, `students`, `users`, `sheets`,
    `sheets/[id]`, `logs`, `settings`. Shared `layout.tsx` + sidebar.
  - `api/` — route handlers: `auth/*` (NextAuth, OTP, change/forgot password,
    session-log), `users`, `students` (+ `import`, `history`, `[id]`),
    `connected-sheets`, `permission-presets`, `logs`, `drive/list`,
    `sheet-health`, `presence/{focus,blur}`, `stream` (SSE), `sheet-webhook`
    (inbound), `debug/sheet-data`.
  - public routes: `login`, `forgot-password`, `auth-error`, root `page.tsx`.
- `components/` — domain UI (`app-sidebar`, `permission-selector`,
  `logs-data-table`, `drive-browser`, `settings-dialog`, `sync-indicator`, …)
  and `components/ui/` (the shadcn primitive library).
- `lib/`
  - `sheets.ts` — **overloaded domain core** (see §6): Google auth + Sheets
    fetch, Drive listing, User CRUD, row/student CRUD, audit append, connected
    -sheet CRUD, `resolveUserAllowedColumns`.
  - `sse.ts` — in-memory `SseManager` singleton (clients + presence) on
    `globalThis`.
  - `auth.ts` — NextAuth options + JWT/session callbacks.
  - `mongodb.ts` — cached connection. `email.ts` — nodemailer. `date.tsx`,
    `utils.ts`.
- `models/` — `User`, `AuditLog`, `SheetRow`, `ConnectedSheet`,
  `PermissionPreset` (5).
- `hooks/` — `use-debounce`, `use-file-upload`, `use-mobile`, `useTabUrlSync`,
  `useDialogUrlActive`, `use-deep-compare-effect`, `use-memoized-fn`.
- `middleware.ts` — `withAuth` gate; redirects non-admins away from `/users`.
- `scripts/` — admin seeding / migrations (some duplicated as `.js` + `.ts`).
- `__tests__/` — Vitest suite.

## 4. Data model

- **`SheetRow`** — `{ rowId, sheetId, data: Mixed, lastModifiedBy,
  lastModifiedAt }`, unique index on `{ sheetId, rowId }`. `sheetId` is the
  spreadsheetId, or the literal `"default"` when none is supplied.
- **`User`** — credentials + `role`, legacy `allowedColumns` (CSV string) **and**
  `perSheetPermissions` (`Map<sheet, columns[]>`), `permissionPreset`, OTP
  fields, `gender`.
- **`PermissionPreset`** — named `Map<sheetId, columns[]>` templates.
- **`AuditLog`** — actor/action/target/old-new value/ip/userAgent/details.
- **`ConnectedSheet`** — `{ spreadsheetId, title, sheetName, url, addedBy }`.

## 5. Request & data flow

1. **Sheets → App (inbound):** Apps Script (`SYNC_STRATEGY.md`) posts cell edits
   to `app/api/sheet-webhook`, which maps row/col to `(rowId, column)` and calls
   `updateStudentCell` → writes MongoDB + `sseManager.broadcast`.
   ⚠️ Currently buggy: argument positions are off and no `spreadsheetId` is
   passed, so it only targets `sheetId="default"`; the header scheme also
   mismatches the Apps Script (see `audit.md` §4).
2. **App reads:** `(dashboard)` pages call `/api/students`, `/api/users`, etc.
   `getStudents` lazily triggers `syncSheetData` (a Google fetch) on a cold sheet.
3. **App writes:** UI → API route → `lib/sheets.ts` → MongoDB + audit + SSE
   broadcast. **No write-back to Google Sheets.**
4. **Live updates:** browsers subscribe to `/api/stream`; presence is tracked via
   `/api/presence/{focus,blur}` and rendered by `sync-indicator.tsx`.
5. **Auth:** Credentials verified against `User`; JWT carries `role` +
   `perSheetPermissions`; `middleware.ts` protects dashboard routes.

## 6. Known weak points (address before/around feature work)

- **`lib/sheets.ts` God object (648 lines):** Google API + Drive + User CRUD +
  row CRUD + audit + connected-sheet CRUD + permission resolution in one module.
- **One-way sync only;** write-back to Sheets is unimplemented despite docs.
- **Webhook correctness:** wrong positional args + header mismatch + `default`
  sheet assumption.
- **In-memory SSE** won't fan out across serverless instances (Vercel).
- **Weak typing:** ~114 `any`/`as any` in `lib`+`app`; `"TRUE"/"FALSE"` string
  booleans; `perSheetPermissions?: any`.
- **Security:** hardcoded secret fallbacks; Google login grants `role:"admin"`.
- **Inconsistent client fetching:** RQ in some pages, raw `fetch`+`useEffect` in
  `app-sidebar`, `drive-browser`, `settings-dialog`, `logs-data-table`,
  `google-connection-card`, `connect-sheet-navbar-button`.
- **Repo clutter:** `scratch/`, `simulated_sheets/`, root `test_*.js/.cjs`,
  `replace_*.py`, `scratch_test_dns.js`, `rewrite_sheets.ts` (a generator that
  overwrites `lib/sheets.ts`).

## 7. Onboarding reading order

1. `README.md` (setup) and this document.
2. `models/` (data shape) → `lib/sheets.ts` (where logic lives).
3. `lib/auth.ts` + `middleware.ts` (access control).
4. `app/api/sheet-webhook/route.ts` + `lib/sse.ts` + `SYNC_STRATEGY.md` (sync,
   noting the bugs above).
