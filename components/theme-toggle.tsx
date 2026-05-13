"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-9 w-9 rounded-xl border border-slate-200 bg-white/50 dark:border-slate-800 dark:bg-slate-900/50" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-xs transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900"
      title="Toggle dark mode (Press D)"
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-amber-500 animate-spin-slow" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
      )}
    </button>
  );
}
