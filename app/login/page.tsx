"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
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
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-radial from-slate-50 to-slate-100 p-6 dark:from-slate-900 dark:to-slate-950">
      {/* Decorative background grid and ambient glows */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)]" />
      <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="animate-fade-in-up relative w-full max-w-md">
        {/* Logo/Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 dark:bg-indigo-500 dark:shadow-indigo-500/10">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            Aegis Sheet Portal
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Secure Google Sheets DB Client Dashboard
          </p>
        </div>

        {/* Login Card */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 shadow-2xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/60">
          <CardHeader className="px-8 pt-8 pb-4">
            <CardTitle className="text-xl font-bold tracking-tight">Sign In</CardTitle>
            <CardDescription className="text-xs">
              Enter your credentials to access the student data terminal.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 pt-0">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)}>
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
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="focus:outline-none text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </InputGroupAddon>
                        </InputGroup>
                        <FieldError errors={[errors.password]} />
                      </Field>
                    )}
                  />
                </FieldGroup>
              </FieldSet>

              <Button type="submit" disabled={isSubmitting} className="mt-6 w-full">
                {isSubmitting ? (
                  <>
                    <Spinner className="h-4 w-4" data-icon="inline-start" />
                    Signing in…
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    Enter Terminal
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Footer hint ── */}
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Tip: Default administrator credentials are{" "}
          <code className="rounded-md bg-slate-200/50 px-1.5 py-0.5 font-mono text-indigo-600 dark:bg-slate-800/50 dark:text-indigo-400">
            admin
          </code>{" "}
          /{" "}
          <code className="rounded-md bg-slate-200/50 px-1.5 py-0.5 font-mono text-indigo-600 dark:bg-slate-800/50 dark:text-indigo-400">
            admin1234
          </code>
        </p>
      </div>
    </div>
  )
}
