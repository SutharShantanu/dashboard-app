"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white py-2 text-xs font-semibold text-slate-500 shadow-xs transition-all hover:bg-red-50 hover:text-red-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-red-950/20 dark:hover:text-red-400"
    >
      <LogOut className="h-4 w-4" />
      <span>Sign Out</span>
    </button>
  );
}
