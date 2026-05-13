"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, RefreshCcw, ShieldAlert, Sparkles, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorType = searchParams.get("error") || "Default";

  let title = "Authentication Error";
  let message = "An unexpected error occurred during authentication. Please try again.";
  let icon = <ShieldAlert className="h-12 w-12 text-red-500 animate-pulse" />;

  switch (errorType) {
    case "Configuration":
      title = "Server Configuration Error";
      message = "There is a problem with the server authentication configuration (e.g., missing Auth0 or OAuth credentials). Please verify your environment variables.";
      icon = <Server className="h-12 w-12 text-amber-500 animate-pulse" />;
      break;
    case "AccessDenied":
      title = "Access Denied";
      message = "You do not have permission to access this portal or your account is deactivated.";
      icon = <AlertTriangle className="h-12 w-12 text-amber-500 animate-pulse" />;
      break;
    case "Verification":
      title = "Verification Failed";
      message = "The token or authentication session could not be verified. Please log in again.";
      icon = <ShieldAlert className="h-12 w-12 text-red-500 animate-pulse" />;
      break;
    default:
      if (errorType && errorType !== "Default") {
        message = decodeURIComponent(errorType);
      }
      break;
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-radial from-slate-50 to-slate-100 p-6 dark:from-slate-900 dark:to-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)]" />
      <div className="absolute top-1/3 left-1/3 h-96 w-96 rounded-full bg-red-500/10 blur-3xl" />
      <div className="absolute bottom-1/3 right-1/3 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative w-full max-w-md text-center animate-fade-in-up">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/20 text-white dark:bg-indigo-500">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Aegis Sheet Portal
          </h1>
        </div>

        {/* Card */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-8 shadow-2xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/60">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-red-50 p-4 dark:bg-red-500/10 border border-red-500/20">
              {icon}
            </div>
          </div>

          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {title}
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {message}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="default"
              size="lg"
              onClick={() => router.push("/login")}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Login
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>

        <div className="mt-6 text-xs text-slate-400 dark:text-slate-500">
          Error Code: <code className="rounded-md bg-slate-200/50 px-1.5 py-0.5 font-mono text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">{errorType}</code>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-svh flex items-center justify-center bg-slate-950 text-white">Loading error state...</div>}>
      <AuthErrorContent />
    </Suspense>
  );
}
