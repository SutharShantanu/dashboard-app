"use client"

import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  RefreshCcw,
  ShieldAlert,
  Sparkles,
  Server,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const errorType = searchParams.get("error") || "Default"

  let title = "Authentication Error"
  let message =
    "An unexpected error occurred during authentication. Please try again."
  let icon = <ShieldAlert className="h-12 w-12 animate-pulse text-red-500" />

  switch (errorType) {
    case "Configuration":
      title = "Server Configuration Error"
      message =
        "There is a problem with the server authentication configuration (e.g., missing Auth0 or OAuth credentials). Please verify your environment variables."
      icon = <Server className="h-12 w-12 animate-pulse text-amber-500" />
      break
    case "AccessDenied":
      title = "Access Denied"
      message =
        "You do not have permission to access this portal or your account is deactivated."
      icon = (
        <AlertTriangle className="h-12 w-12 animate-pulse text-amber-500" />
      )
      break
    case "Verification":
      title = "Verification Failed"
      message =
        "The token or authentication session could not be verified. Please log in again."
      icon = <ShieldAlert className="h-12 w-12 animate-pulse text-red-500" />
      break
    default:
      if (errorType && errorType !== "Default") {
        message = decodeURIComponent(errorType)
      }
      break
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="animate-fade-in-up relative w-full max-w-md text-center">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Aegis Sheet Portal
          </h1>
        </div>

        {/* Card */}
        <Card>
          <CardContent>
            <div className="mb-6 flex justify-center">
              <div className="rounded-full bg-muted p-4">
                {icon}
              </div>
            </div>

            <h2 className="text-xl font-semibold text-foreground">
              {title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {message}
            </p>

            <div className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="default" onClick={() => router.push("/login")}>
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Return to Login
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => window.location.reload()}
              >
                <RefreshCcw className="h-4 w-4 shrink-0" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-xs text-muted-foreground">
          Error Code:{" "}
          <code className="rounded-md bg-muted px-2 py-1 font-mono text-foreground">
            {errorType}
          </code>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
          Loading error state...
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  )
}
