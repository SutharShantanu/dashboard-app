"use client";

import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RefreshCw, Database, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function SyncIndicator() {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [syncLabel, setSyncLabel] = useState("Just synced");
  const [dbMode, setDbMode] = useState<"Simulated" | "Google Sheets" | null>(null);

  // Poll for database mode
  useEffect(() => {
    async function fetchDbMode() {
      try {
        const res = await fetch("/api/students");
        if (res.ok) {
          const json = await res.json();
          // We can determine simulated mode by checking if any google API header is missed (usually standard API)
          // or we can expose it via an API, let's expose it in student endpoint or assume Google Sheet if env exists.
          setDbMode(json.simulated ? "Simulated" : "Google Sheets");
        }
      } catch {}
    }
    fetchDbMode();
  }, [isFetching]);

  // Set initial sync time on query success
  useEffect(() => {
    if (isFetching === 0) {
      setLastSynced(new Date());
    }
  }, [isFetching]);

  // Update human readable relative time
  useEffect(() => {
    if (!lastSynced) return;

    const interval = setInterval(() => {
      const diffMs = new Date().getTime() - lastSynced.getTime();
      const diffSecs = Math.floor(diffMs / 1000);

      if (diffSecs < 10) {
        setSyncLabel("Just synced");
      } else if (diffSecs < 60) {
        setSyncLabel(`Synced ${diffSecs}s ago`);
      } else {
        const mins = Math.floor(diffSecs / 60);
        setSyncLabel(`Synced ${mins}m ago`);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [lastSynced]);

  const handleManualSync = async () => {
    toast.promise(queryClient.invalidateQueries(), {
      loading: "Synchronizing database structures...",
      success: () => {
        setLastSynced(new Date());
        return "Database synchronized successfully!";
      },
      error: "Synchronization failed.",
    });
  };

  return (
    <div className="flex items-center gap-4">
      {/* DB MODE PILL */}
      <div className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <Database className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
        <span className="text-[11px] font-bold uppercase tracking-wider">
          DB: {dbMode || "Checking..."}
        </span>
      </div>

      {/* SYNC TIME */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleManualSync}
          disabled={isFetching > 0}
          className="group flex h-8 items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 text-xs font-semibold text-slate-600 shadow-xs transition-all hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-slate-400 transition-transform group-hover:rotate-45 dark:text-slate-500 ${
              isFetching > 0 ? "animate-spin" : ""
            }`}
          />
          <span>{isFetching > 0 ? "Syncing..." : syncLabel}</span>
        </button>
      </div>
    </div>
  );
}
