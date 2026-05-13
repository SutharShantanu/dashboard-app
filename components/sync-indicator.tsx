"use client";

import { useQueryClient, useIsFetching } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { RefreshCw, Database } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
      <Badge variant="secondary" className="text-xs gap-1.5 flex items-center font-bold uppercase tracking-wider">
        <Database className="h-3.5 w-3.5 text-muted-foreground" />
          DB: {dbMode || "Checking..."}
      </Badge>

      {/* SYNC TIME */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handleManualSync}
          disabled={isFetching > 0}
          className="group flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:rotate-45 ${
              isFetching > 0 ? "animate-spin" : ""
            }`}
          />
          <span>{isFetching > 0 ? "Syncing..." : syncLabel}</span>
        </Button>
      </div>
    </div>
  );
}
