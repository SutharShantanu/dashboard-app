"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard caught error:", error);
  }, [error]);

  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col items-center justify-center space-y-6">
      <div className="flex flex-col items-center space-y-2 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="text-2xl font-bold tracking-tight">Something went wrong!</h2>
        <p className="text-sm text-muted-foreground max-w-[500px]">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
      </div>
      <div className="flex gap-4">
        <Button onClick={() => reset()} variant="default">
          Try again
        </Button>
        <Button onClick={() => window.location.href = "/"} variant="outline">
          Return Home
        </Button>
      </div>
    </div>
  );
}
