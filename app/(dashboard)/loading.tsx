"use client";

import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading dashboard...</p>
    </div>
  );
}
