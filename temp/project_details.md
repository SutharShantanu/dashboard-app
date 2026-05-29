Here is a comprehensive, implementation-ready assessment of the repository, focusing on architecture, cleanup, and structural improvements.

1.  Executive Summary  


This repository contains a modern Next.js 16 (App Router) dashboard application designed to manage, display, and synchronize data with Google Sheets in real-time. It uses MongoDB
as its primary datastore and NextAuth.js for role-based access control.

Key Findings:

1. Core architecture is solid but strained: The project uses modern tools (Tailwind v4, React Query, shadcn/ui), but domain logic is heavily centralized.
2. lib/sheets.ts is a "God Object": At over 600 lines, this file handles Google Sheets API calls, MongoDB CRUD for multiple models, permission logic, and Server-Sent Events  
   (SSE) broadcasting. This is the biggest architectural bottleneck.
3. Cluttered root directory: There are over 25 ad-hoc test scripts, scratchpads, and temporary directories scattered throughout the repository, adding significant noise.
4. Client-side data fetching needs alignment: Despite having @tanstack/react-query installed, components like app-sidebar.tsx still rely on manual useEffect + fetch  
   patterns, leading to duplicate state management logic.  
   ──────

2)  Repository Understanding & Documentation Draft  


This section is designed to be easily copy-pasted into a standard ARCHITECTURE.md or DEVELOPMENT.md file for onboarding new developers.

### Overview

Aegis Sheet DB is a bidirectional data synchronization dashboard. It allows users to view and modify data locally while keeping it perfectly synced with a connected Google  
 Spreadsheet. It features granular column-level permissions, robust audit logging, and role-based access (Admin vs. Sub-admin).

### Tech Stack

• Framework: Next.js 16 (App Router)  
 • Database: MongoDB (Mongoose ORM)  
 • Styling: Tailwind CSS v4, shadcn/ui  
 • Authentication: NextAuth.js  
 • Key Integrations: Google Sheets API (via googleapis ), Google Apps Script Webhooks

### Folder Structure & Responsibilities

• app/ : Next.js App Router definitions.  
 • (dashboard)/ : Protected UI routes (e.g., /students , /users , /sheets ). Shares the main layout and sidebar.  
 • api/ : Backend endpoints. Contains webhook receivers, data endpoints, and Google Drive integrations.  
 • components/ : React components.  
 • ui/ : Base UI elements provided by shadcn/ui.  
 • Root components: Domain-specific UI pieces (e.g., app-sidebar.tsx , permission-selector.tsx ).  
 • lib/ : Core backend logic and integrations.  
 • models/ : Mongoose database schemas ( User , AuditLog , SheetRow , ConnectedSheet ).  
 • hooks/ : Custom React hooks for debouncing, file uploads, etc.

### Request & Data Flow

1. Google Sheets to App: Google Apps Script (documented in SYNC_STRATEGY.md ) fires a webhook to app/api/sheet-webhook upon cell edits. The webhook updates MongoDB ( SheetRow )
   and broadcasts an SSE event.
2. App to Google Sheets: (Conceptualized in lib/sheets.ts ) UI changes trigger internal API routes, which update MongoDB, log the action in AuditLog , and push the update to the
   Google Sheets API.
3. Client State: The UI listens to SSE streams ( lib/sse.ts ) to update local state without refreshing.  


### First Things to Read for Onboarding

1.  README.md for local setup.
2.  SYNC_STRATEGY.md to understand the webhook integration.
3.  models/ directory to understand the database shape.
4.  lib/sheets.ts to understand where the bulk of the business logic currently lives.  
    ──────

3)  Unneeded / Review-Needed File Candidates  


The repository contains a massive amount of "dead weight" in the form of scratchpads, experimental scripts, and temporary folders.

### High Confidence (Safe to Remove)

These files and directories are clearly local experiments, scratchpads, or one-off migration scripts that are not part of the Next.js build or runtime.

Path │ Reason │ Next Step
───────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────────┼──────────────────────────────────────────────
scratch/ (entire directory) │ Contains ad-hoc JS scripts ( dns*check.js , query_db.js ). │ Delete entirely.
temp/ (entire directory) │ Contains only an empty or notes markdown file. │ Delete entirely.
simulated_sheets/ (entire directory) │ Contains static JSON dumps. A grep reveals no imports in the source code. │ Delete entirely.
test*_.js , test\__.cjs (root) │ 8+ files like test_mongo_final.js , test_checkbox.cjs . Used for isolated testing, │ Delete entirely.
│ not part of the test suite. │
scratch_test_dns.js (root) │ Network debugging script. │ Delete.
replace_icons.py , replace_settings.py │ One-off Python scripts for refactoring. │ Delete.
rewrite_sheets.ts (root) │ Looks like an old iteration or standalone refactor attempt of lib/sheets.ts . │ Review, extract any missing logic, then  
 │ │ delete.

### Medium Confidence (Review Before Action)

These files have value but belong elsewhere.

Path │ Reason │ Next Step
────────────────────────┼────────────────────────────────────────────────────────────────────────────┼─────────────────────────────────────────────────────────────────────────────
scripts/ (directory) │ Contains DB seeding and migration scripts (e.g., seed-admin.js , │ Keep, but document their usage in the README. Remove any that are outdated.
│ migrate-user-genders.js ). │
components.json │ Used by shadcn/ui CLI. │ Keep (Do not delete, required for CLI).
──────  
 4) Modularization & Optimization Plan

The project needs structural modularization to ensure long-term maintainability.

### A. Resolve the lib/sheets.ts God Object

Problem: lib/sheets.ts handles MongoDB connections, Google Sheets API authentication, generic CRUD for Users/Students/Logs, and permission resolution. If something breaks, this
is the only place to look, making it a merge-conflict nightmare.  
 Proposed Change: Break this file down into a domain-driven structure within a new lib/services/ directory:

• lib/services/google-sheets.service.ts : Exclusively handles Google Auth and API fetching.  
 • lib/services/user.service.ts : Handles Mongoose User queries, creation, and updates.  
 • lib/services/student.service.ts : Handles Student row logic.  
 • lib/services/audit.service.ts : Centralizes appendAuditLog .  
 Effort: Large | Risk: Medium | Benefit: Drastically improves testability and separation of concerns.

### B. Standardize Client-Side Data Fetching

Problem: The app has @tanstack/react-query installed, yet components like app-sidebar.tsx use raw useEffect blocks with local state ( isLoadingSheets , connectedSheets ) to
fetch data.  
 Proposed Change: Create a hooks/queries/ directory. Extract API calls into custom hooks (e.g., useConnectedSheets() ) using useQuery .  
 Effort: Medium | Risk: Low | Benefit: Eliminates race conditions, provides automatic caching, and shrinks component file sizes.

### C. UI Component Splitting

Problem: components/app-sidebar.tsx and components/permission-selector.tsx are very large (~400-600 lines) and handle too much layout, state, and rendering simultaneously.  
 Proposed Change:

• Split app-sidebar.tsx into SidebarNavigation , SidebarSearch , and SidebarConfig .  
 • Split permission-selector.tsx into ColumnList (for rendering the badges) and PermissionActions (for the buttons).  
 Effort: Medium | Risk: Low | Benefit: Easier to read, test, and reuse.  
 ──────  
 5) Prioritized Roadmap

This roadmap provides a safe, step-by-step path to refactoring without doing a "big-bang" rewrite.

### Phase 1: Immediate Safety & Cleanup Wins (Do This Today)

Goal: Remove noise and reduce cognitive load when navigating the project tree.

1. Delete scratch/ , temp/ , and simulated_sheets/ directories.
2. Delete all test*\*.js , test*\*.cjs , and python scripts in the root directory.
3. Review rewrite_sheets.ts . If it contains no critical unmerged logic, delete it.
   Dependencies: None. Very safe.

### Phase 2: Unify Data Fetching Strategy (Next Few Days)

Goal: Leverage the existing React Query dependency to clean up UI components.

1. Create hooks/queries/useSheets.ts and hooks/queries/useLogs.ts .
2. Refactor app-sidebar.tsx to use useQuery instead of manual useEffect fetching.
3. Apply this pattern to all tables and list views in app/(dashboard)/ .
   Dependencies: Phase 1 (clean tree makes searching for useEffect easier).

### Phase 3: Structural Domain Modularization (Next 1-2 Weeks)

Goal: Dismantle the lib/sheets.ts god object.

1. Create lib/services/ folder.
2. Extract the appendAuditLog function into lib/services/audit.ts and update imports project-wide.
3. Extract Google API initialization and fetchers into lib/services/google.ts .
4. Extract User and Permission logic into lib/services/users.ts .
5. Leave only the high-level orchestration functions in sheets.ts , or deprecate it entirely in favor of the services.
   Dependencies: Requires thorough testing to ensure the webhook and SSE integrations don't break.

### Phase 4: Maintainability and UI Refinements (Long-Term)

Goal: Shrink component files and standardize the UI layer.

1. Break down app-sidebar.tsx and logs-data-table.tsx into sub-components.
2. Ensure strict boundaries: UI components should not contain raw fetch calls, only hook invocations.
   ──────

6)  Suggested Next Verification Steps

Before you begin deleting or refactoring, I recommend taking these exact steps:

1. Verify Webhook Behavior: Check app/api/sheet-webhook/route.ts to ensure it only relies on lib/sheets.ts and not any of the root test scripts.
2. Review rewrite_sheets.ts : Do a quick visual diff between rewrite_sheets.ts and lib/sheets.ts to ensure rewrite_sheets.ts wasn't an unfinished upgrade that you actually
   need.
3. Check for missing index files: Ensure that splitting lib/sheets.ts won't break circular dependencies (e.g., User model needing AuditLog model).

This roadmap provides a clean, highly scalable foundation. You are perfectly positioned to mature this codebase from a rapid prototype into a highly maintainable enterprise  
 application.

