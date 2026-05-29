# Dashboard App

A modern, high-performance dashboard application built with the Next.js App Router. It features advanced data table management, Google Sheets integration, and role-based authentication.

## 🚀 Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack), React 19
- **Styling:** Tailwind CSS v4
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/), Lucide Icons
- **State & Data Management:** TanStack Query, TanStack Table, React Hook Form
- **Backend & Database:** Node.js, MongoDB (Mongoose)
- **Authentication:** NextAuth.js
- **Integrations:** Google Sheets API, XLSX (Excel/CSV parsing)

## 📁 Project Structure

This project follows a standard Next.js App Router architecture:

- `app/`: Defines the routing structure.
  - `(dashboard)/`: Protected dashboard routes (e.g., `/students`, `/users`, `/sheets`).
  - `api/`: Backend API routes for database, authentication, and integrations.
  - `login/`: Public authentication routes.
- `components/`: Reusable UI components.
  - `ui/`: Core generic shadcn/ui components.
- `lib/`: Core utilities (`mongodb.ts`, `auth.ts`, `sheets.ts`).
- `models/`: Mongoose schemas for MongoDB (`AuditLog`, `SheetRow`).
- `hooks/`: Custom React hooks (e.g., file upload handlers).

## 🛠️ Features

- **Google Sheets & File Import:** Import CSV, XLSX, JSON, and live Google Sheets data with duplicate prevention.
- **Robust Data Tables:** Sortable, filterable, and paginated tables using TanStack Table.
- **Side-Panel Details View:** Explore individual record details and history using slide-out Sheets and Timelines.
- **Role-Based Access Control:** Differentiate access between generic users and admins.
- **Audit Logging:** Track all data mutations and system events.

## 💻 Getting Started

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Setup Environment Variables:**
   Create a `.env` file based on the required configuration (e.g., MongoDB URI, NextAuth secret, Google credentials).

3. **Run the Development Server:**
   ```bash
   npm run dev
   ```

4. **Build for Production:**
   ```bash
   npm run build
   ```

## 🗂️ Scripts

One-off utility scripts live in `scripts/`. Run them with `npx tsx scripts/<name>.ts` (TypeScript) or `node scripts/<name>.js` (JavaScript).

| Script | Purpose |
|---|---|
| `seed-admin.ts` | Create the initial `SabaAdmin` user in MongoDB |
| `migrate.ts` | General migration script |
| `migrate-default-permissions.js` | Backfill default permission presets on existing users |
| `migrate-user-genders.js` | Backfill gender field on existing users |
| `grant-sabaadmin-all-sheets.js` | Grant SabaAdmin full access to all connected sheets |
| `create-admin.js` | Create an admin user interactively |
| `verify_mongo.ts` | Verify MongoDB connection and schema |
| `apps-script.js` | Reference Apps Script code to deploy in Google Sheets for webhook sync |

> **Note:** `apps-script.js` is not a Node.js script — paste its contents into the Google Apps Script editor inside your spreadsheet.
