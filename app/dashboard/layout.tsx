import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SyncIndicator } from "@/components/sync-indicator";
import {
  Users,
  GraduationCap,
  History,
  LayoutDashboard,
  Database,
  Sparkles,
} from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const { displayName, role, username } = session.user;
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : username.slice(0, 2).toUpperCase();

  // Deterministic avatar color based on initials
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-rose-500",
  ];
  const colorIndex = initials.charCodeAt(0) % colors.length;
  const avatarColor = colors[colorIndex];

  return (
    <div className="flex min-h-screen bg-slate-50/50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {/* SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white shadow-xs transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
        {/* Brand Header */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-6 dark:border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/10 dark:bg-indigo-500">
            <Sparkles className="h-4.5 w-4.5 animate-pulse" />
          </div>
          <span className="font-bold tracking-tight text-slate-900 dark:text-white">
            Aegis Sheet DB
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 space-y-1 px-4 py-6">
          <Link
            href="/dashboard?tab=students"
            className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100"
          >
            <GraduationCap className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            <span>Student Records</span>
          </Link>

          {role === "admin" && (
            <>
              <Link
                href="/dashboard?tab=users"
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100"
              >
                <Users className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                <span>Sub-Admins Directory</span>
              </Link>

              <Link
                href="/dashboard?tab=logs"
                className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-100"
              >
                <History className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                <span>Audit Logs</span>
              </Link>
            </>
          )}
        </nav>

        {/* Footer / User card */}
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50/50 p-3 dark:bg-slate-800/30">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-inner ${avatarColor}`}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                {displayName}
              </p>
              <div className="flex items-center gap-1">
                <span className="inline-flex rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  {role}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-2.5">
            <SignOutButton />
          </div>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 flex-col pl-64">
        {/* TOP STATUS NAVIGATION BAR */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/75 px-8 backdrop-blur-xl transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/75">
          <div className="flex items-center gap-4">
            <SyncIndicator />
          </div>

          <div className="flex items-center gap-3.5">
            <ThemeToggle />
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
