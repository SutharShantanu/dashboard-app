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
