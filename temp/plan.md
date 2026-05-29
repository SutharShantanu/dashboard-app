# Implementation Plan

Derived from `project_details.revised.md` and `project_details.audit.md`.
Ordered so correctness/safety risks are stabilized before structural refactors,
and structure is improved before broad UI cleanup. **Stop and reproduce each bug
before fixing it** — several fixes change data-write behavior.

Legend: Effort S/M/L · Risk L/M/H.

---

## Phase 0 — Repo hygiene (do first; unblocks navigation)

Independent, near-zero risk. None of these are imported by the build/runtime.

- **0.1** Delete `scratch/`, `simulated_sheets/`, root `test_*.js`/`test_*.cjs`,
  `scratch_test_dns.js`, `replace_icons.py`, `replace_settings.py`,
  `rewrite_sheets.ts`. (S/L) — Verify with `grep -r` that nothing in `app/`,
  `lib/`, `components/`, `scripts/` imports them first.
- **0.2** Do **not** touch `temp/`, `components.json`, `__tests__/`. (—)
- **0.3** De-duplicate `scripts/`: pick `.ts` or `.js` for `seed-admin` and
  `migrate*`, delete the other, add a short "scripts usage" note to `README.md`.
  (S/L)
- **0.4** Run `npm run typecheck && npm run lint && npm run test` to capture a
  green baseline before any code change. (S/L)

Dependency: none. Gate: baseline build/test green.

---

## Phase 1 — Correctness & security stabilization (highest priority)

These are real defects; fix before building on top of the sync/auth paths.

- **1.1 Fix the webhook wiring.** `app/api/sheet-webhook/route.ts` passes
  positional args incorrectly to `updateStudentCell` (`"webhook"` lands in
  `actorRole`; `ip`/`sheetName`/`spreadsheetId` default). Resolve the target
  `ConnectedSheet` from the payload and pass the correct `spreadsheetId` so
  inbound edits hit the right `SheetRow.sheetId` instead of `"default"`. Also
  pass `spreadsheetId` to the `getStudents` call. (M/M)
  - Depends on a decision: how the Apps Script payload identifies the sheet
    (it currently sends `sheetName` only). May require mapping `sheetName` →
    `spreadsheetId` via `ConnectedSheet`.
- **1.2 Align webhook auth.** The route checks `Authorization: Bearer`, the
  Apps Script sends `x-webhook-secret`. Pick one (recommend `x-webhook-secret`),
  fix both `route.ts` and `SYNC_STRATEGY.md`, and **fail closed** if
  `SHEET_WEBHOOK_SECRET` is unset rather than defaulting to `"default_secret"`.
  (S/L)
- **1.3 Harden auth secrets.** Remove the hardcoded `NEXTAUTH_SECRET` fallback
  in `lib/auth.ts` (throw/log if missing). (S/L)
- **1.4 Fix Google-provider privilege escalation.** `lib/auth.ts` assigns
  `role: "admin"` to every Google login. Either gate behind an allowlist /
  existing-`User` lookup, or default to `sub-admin`. Decide with the owner
  whether Google sign-in is even enabled in prod. (M/M)
- **1.5 Add/adjust tests** for the corrected webhook mapping and any auth change.
  (M/L)

Dependency: Phase 0 baseline. Gate: webhook round-trip verified against a real
connected sheet (or a faithful integration test); test suite green.

---

## Phase 2 — Decompose `lib/sheets.ts` (structural)

Do after Phase 1 so refactors sit on correct behavior. Move logic; don't rewrite
it. Keep `sheets.ts` re-exporting moved symbols until call sites are migrated, to
avoid a big-bang import churn.

- **2.1** Create `lib/services/`. Extract `appendAuditLog` →
  `audit.service.ts` first (smallest, most-imported; `lib/auth.ts` also imports
  it). Update imports. (M/L)
- **2.2** Extract Google integration (`getSheetsClient`, `listDriveFiles`,
  `fetchRawGoogleSheetsData`) → `google-sheets.service.ts`. (M/M)
- **2.3** Extract User CRUD + `resolveUserAllowedColumns` → `user.service.ts`.
  (M/M)
- **2.4** Extract row/student CRUD + `syncSheetData` → `student.service.ts`.
  Decouple the implicit lazy-sync-on-read in `getStudents` into an explicit call
  the route makes, so reads don't silently hit Google. (M/M)
- **2.5** Extract connected-sheet CRUD → `connected-sheet.service.ts`.
  Reduce `sheets.ts` to thin re-exports or remove it. (M/M)

Dependency: Phase 1. Gate: typecheck/lint/tests green after each extraction;
no behavior change intended.

---

## Phase 3 — Typing & shared helpers (quality)

- **3.1** Replace `perSheetPermissions?: any` and the worst `as any` casts in
  the new services with real types (`Record<string, string[]>`, a shared
  `PermissionMap`). Target the ~114 `any` count downward, prioritizing
  `lib/` and API routes. (M/M)
- **3.2** Normalize the `isActive` `"TRUE"/"FALSE"` ↔ `boolean` conversion into
  one mapper at the service boundary instead of inline conversions. (S/M)
- **3.3** Extract the duplicated username-regex-escape into a single helper
  (`lib/utils.ts` or `user.service.ts`); use it in `auth.ts` and the user
  service. (S/L)

Dependency: Phase 2 (types belong with the extracted services). Defer-able if
time-constrained, but cheap once services exist.

---

## Phase 4 — Client data-fetching consistency (UI)

- **4.1** Migrate the raw-`fetch` holdouts to React Query for consistency with
  the already-RQ pages: `app-sidebar.tsx`, `drive-browser.tsx`,
  `settings-dialog.tsx`, `logs-data-table.tsx`, `google-connection-card.tsx`,
  `connect-sheet-navbar-button.tsx`. Start with `app-sidebar.tsx`
  (`useConnectedSheets()` hook). (M/L)
- **4.2** Optionally split the largest components (`app-sidebar.tsx` 601,
  `permission-selector.tsx` 462, `logs-data-table.tsx` 440) once their data
  fetching is hook-extracted. (M/L) — Lowest priority; cosmetic/readability.

Dependency: Phase 0 (clean tree). Independent of Phases 2–3 but easier after
typing exists.

---

## Phase 5 — SSE scalability (defer until deploy target is confirmed)

- **5.1** If deploying to Vercel/multi-instance, the in-memory `lib/sse.ts`
  singleton cannot fan out across instances. Evaluate a shared transport
  (Redis pub/sub, Ably/Pusher, or a single long-lived node). (L/H)

Defer until someone confirms the production topology — no work if it stays
single-instance.

---

## Now vs. later

- **Now:** Phase 0, Phase 1 (1.1–1.3 especially), and start Phase 2.1–2.2.
- **Soon:** Phase 2 remainder + Phase 3.
- **Later / as capacity allows:** Phase 4, component splitting, and Phase 5
  pending deployment decisions; revisit the "two-way sync" docs once write-back
  is actually scoped.
