"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  LogIn,
  Sparkles,
  ShieldAlert,
  User,
  KeyRound,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react"
import { GoogleIcon } from "@/components/icons/google-logo"
import { UndrawLogin } from "react-undraw-illustrations"

// shadcn/ui components
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

// ─── Validation schema ────────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z
    .string()
    .min(1, "Username is required")
    .max(64, "Username must be under 64 characters")
    .trim(),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must be under 128 characters"),
})

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
    mode: "onTouched",
  })

  const onSubmit = async (values: z.infer<typeof loginSchema>) => {
    setError("")

    try {
      const res = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
      })

      if (res?.error) {
        setError(res.error)
        toast.error(res.error)
      } else {
        // Fire-and-forget: log full session details (browser, OS, IP, location)
        fetch("/api/auth/session-log", { method: "POST" }).catch(() => {});

        toast.success("Welcome back! Loading your dashboard...", {
          icon: <Sparkles className="h-4 w-4 animate-pulse text-emerald-500" />,
        })
        router.push("/dashboard")
        router.refresh()
      }
    } catch (err: any) {
      setError("An unexpected error occurred. Please try again.")
      toast.error("Unexpected error occurred.")
    }
  }

  return (
    <div className="flex min-h-svh bg-background">
      {/* Left Column - Login Form */}
      <div className="flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
        <div className="animate-fade-in-up relative w-full max-w-md">
          {/* Logo/Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Aegis Sheet Portal
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Secure Google Sheets DB Client Dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the student data terminal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <FieldSet>
                <FieldGroup>
                  <Field data-invalid={!!errors.username}>
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="username"
                        type="text"
                        autoComplete="username"
                        placeholder="e.g. admin or sub-admin username"
                        disabled={isSubmitting}
                        aria-invalid={!!errors.username}
                        {...register("username")}
                      />
                      <InputGroupAddon align="inline-start">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError errors={[errors.username]} />
                  </Field>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field }) => (
                      <Field data-invalid={!!errors.password}>
                        {/* 1. Removed "Forgot password?" from here — moved below */}
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <InputGroup>
                          <InputGroupInput
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            placeholder="••••••••"
                            disabled={isSubmitting}
                            aria-invalid={!!errors.password}
                            {...field}
                          />
                          <InputGroupAddon align="inline-start">
                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                          </InputGroupAddon>
                          <InputGroupAddon align="inline-end">
                            <Button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              variant="ghost"
                              size="icon"
                              aria-label={
                                showPassword ? "Hide password" : "Show password"
                              }
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </InputGroupAddon>
                        </InputGroup>
                        <FieldError errors={[errors.password]} />
                      </Field>
                    )}
                  />
                  {/* 1. "Forgot password?" moved here, below the password field */}
                  <div className="flex justify-end">
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </FieldGroup>
              </FieldSet>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="mt-6 w-full"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4" data-icon="inline-start" />
                    Signing in…
                  </>
                ) : (
                  <>Login</>
                )}
              </Button>

              {/* 2. "Or continue with" divider */}
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="mt-6 w-full"
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              >
                <GoogleIcon className="mr-2 h-4 w-4" />
                Google
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
      </div>
      
      {/* Right Column - Illustration */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-muted/30 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
        
        <Card className="z-10 flex h-full max-h-[800px] w-full max-w-2xl flex-col items-center justify-center border-none bg-background/50 p-12 shadow-xl backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
          <div className="mb-12 w-full max-w-md animate-fade-in-up">
            <UndrawLogin primaryColor="#6366f1" height="300px" />
          </div>
          <div className="text-center animate-fade-in-up delay-150">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Welcome to Aegis Portal</h2>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Access your personalized student dashboard, manage data efficiently, and connect seamlessly with Google Sheets.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
