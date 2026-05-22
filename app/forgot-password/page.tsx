"use client"

import { useState, useEffect, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  Mail,
  KeyRound,
  Lock,
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"

// Custom UI Components
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Field,
  FieldLabel,
  FieldError,
  FieldSet,
  FieldGroup,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Password strength checker and component
import {
  PasswordStrength,
  isStrongPassword,
} from "@/components/password-strength"

// Validation schemas
const step1Schema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .trim(),
})

const step2Schema = z
  .object({
    otp: z.string().length(6, "Verification code must be exactly 6 characters"),
    newPassword: z
      .string()
      .min(1, "Password is required")
      .refine(isStrongPassword, {
        message:
          "Password must be at least 8 chars with uppercase, number & symbol",
      }),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type Step1FormValues = z.infer<typeof step1Schema>
type Step2FormValues = z.infer<typeof step2Schema>

function ForgotPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isOtpVerified, setIsOtpVerified] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)

  // Forms initialization
  const step1Form = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    defaultValues: { email: "" },
    mode: "onTouched",
  })

  const step2Form = useForm<Step2FormValues>({
    resolver: zodResolver(step2Schema),
    defaultValues: { otp: "", newPassword: "", confirmPassword: "" },
    mode: "onTouched",
  })

  const {
    register: register1,
    handleSubmit: handleSubmit1,
    setValue: setValue1,
    formState: { errors: errors1, isSubmitting: isSubmitting1 },
  } = step1Form

  const {
    control: control2,
    register: register2,
    handleSubmit: handleSubmit2,
    setValue: setValue2,
    setError: setError2,
    clearErrors: clearErrors2,
    watch: watch2,
    formState: {
      errors: errors2,
      isSubmitting: isSubmitting2,
      isValid: isValid2,
    },
  } = step2Form

  const watchedPassword = watch2("newPassword")
  const watchedOtp = watch2("otp")

  // Auto-verify OTP when 6 characters are entered and shift focus
  useEffect(() => {
    if (!watchedOtp || watchedOtp.length !== 6 || !email) {
      setIsOtpVerified(false)
      setOtpError(null)
      clearErrors2("otp")
      return
    }

    let active = true

    const checkOtp = async () => {
      try {
        const res = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp: watchedOtp, checkOnly: true }),
        })
        const data = await res.json()
        if (!res.ok) {
          if (active) {
            setIsOtpVerified(false)
            setOtpError(data.error || "Incorrect verification code.")
          }
          return
        }
        if (data.success && active) {
          setIsOtpVerified(true)
          setOtpError(null)
          clearErrors2("otp")
          toast.success("Verification code matched! Moving to new password field.")
          
          // Move focus to the New Password field
          setTimeout(() => {
            const nextInput = document.getElementById("newPassword")
            if (nextInput) {
              nextInput.focus()
            }
          }, 100)
        }
      } catch (err) {
        if (active) {
          setIsOtpVerified(false)
          setOtpError("Failed to verify code. Please try again.")
        }
      }
    }

    checkOtp()

    return () => {
      active = false
    }
  }, [watchedOtp, email, clearErrors2])

  // Sync parameters if direct link is shared or step transitions occur
  useEffect(() => {
    const emailParam = searchParams.get("email")
    const otpParam = searchParams.get("otp")
    const stepParam = searchParams.get("step")

    if (emailParam) {
      setEmail(emailParam)
      setValue1("email", emailParam)
    }
    if (otpParam) {
      setValue2("otp", otpParam)
    }

    if (stepParam === "2" || (emailParam && otpParam)) {
      setStep(2)
      if (emailParam && otpParam && !stepParam) {
        toast.success("Direct link detected! Form auto-populated.")
      }
    } else {
      setStep(1)
    }
  }, [searchParams, setValue1, setValue2])

  // Handler for requesting OTP code (Step 1)
  const onSendOtp = async (values: Step1FormValues) => {
    const targetEmail = values.email

    const promise = fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail }),
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to send OTP code")
      }
      return data
    })

    toast.promise(promise, {
      loading: "Sending verification code...",
      success: "Verification code sent to your email!",
      error: (err) => err.message || "Failed to send OTP",
    })

    try {
      await promise
      setEmail(targetEmail)

      const params = new URLSearchParams(window.location.search)
      params.set("step", "2")
      params.set("email", targetEmail)
      router.push(`${window.location.pathname}?${params.toString()}`, {
        scroll: false,
      })
    } catch {
      // Handled by toast.promise
    }
  }

  // Handler for resetting password (Step 2)
  const onResetPassword = async (values: Step2FormValues) => {
    const promise = fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        otp: values.otp,
        newPassword: values.newPassword,
      }),
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password")
      }
      return data
    })

    toast.promise(promise, {
      loading: "Verifying code and updating password...",
      success: "Password reset successfully! Logging you in...",
      error: (err) => err.message || "Failed to verify code",
    })

    try {
      const data = await promise
      if (data.username) {
        const loginRes = await signIn("credentials", {
          username: data.username,
          password: values.newPassword,
          redirect: false,
        })
        if (loginRes?.error) {
          toast.error("Auto-login failed. Redirecting to login page...")
          setTimeout(() => {
            router.push("/login")
          }, 1500)
        } else {
          toast.success("Welcome back! Loading your dashboard...", {
            icon: <Sparkles className="h-4 w-4 animate-pulse text-emerald-500" />,
          })
          setTimeout(() => {
            router.push("/dashboard")
            router.refresh()
          }, 1500)
        }
      } else {
        setTimeout(() => {
          router.push("/login")
        }, 1500)
      }
    } catch (err: any) {
      const errMsg = err.message || ""
      if (errMsg.toLowerCase().includes("otp") || errMsg.toLowerCase().includes("code")) {
        setOtpError(errMsg)
      }
    }
  }

  const [isResending, setIsResending] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [resendAttempts, setResendAttempts] = useState(0)

  // Initialize countdown timer when entering Step 2
  useEffect(() => {
    if (step === 2) {
      setTimeLeft(30)
    }
  }, [step])

  // Countdown timer interval effect
  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  // Handler for resending OTP code
  const handleResendCode = async () => {
    if (!email) {
      toast.error("Email address is missing.")
      return
    }
    if (resendAttempts >= 3) {
      toast.error("Maximum of 3 resend attempts reached. Please check your mailbox.")
      return
    }
    if (timeLeft > 0) {
      toast.error(`Please wait ${timeLeft} seconds before requesting another code.`)
      return
    }

    setIsResending(true)
    const promise = fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code")
      }
      return data
    })

    toast.promise(promise, {
      loading: "Resending verification code...",
      success: "Verification code resent successfully!",
      error: (err) => err.message || "Failed to resend code",
    })

    try {
      await promise
      setValue2("otp", "")
      setOtpError(null)
      setResendAttempts((prev) => prev + 1)
      setTimeLeft(30)
    } catch {
      // Handled by toast.promise
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-6">
      {/* Sleek Decorative Background Gradients */}
      <div className="pointer-events-none absolute top-[-10%] right-[-10%] h-[30rem] w-[30rem] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] left-[-10%] h-[30rem] w-[30rem] rounded-full bg-emerald-500/5 blur-[120px]" />

      <div className="animate-fade-in-up relative z-10 w-full max-w-md">
        {/* Brand Header */}
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

        {/* Dynamic Forgot Password Form Card */}
        <Card className="border-border/60 bg-card/90 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle>
              {step === 1 ? "Reset Password" : "Verification Required"}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? "Enter your email address and we'll send you a 6-digit verification code to reset your password."
                : `We sent a 6-digit code to ${email || "your email address"}. Enter it below with your new password.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <form onSubmit={handleSubmit1(onSendOtp)} noValidate>
                <FieldSet>
                  <FieldGroup>
                    <Field data-invalid={!!errors1.email}>
                      <FieldLabel htmlFor="email">Email Address</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          id="email"
                          type="email"
                          placeholder="name@example.com"
                          disabled={isSubmitting1}
                          aria-invalid={!!errors1.email}
                          {...register1("email")}
                        />
                        <InputGroupAddon align="inline-start">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </InputGroupAddon>
                      </InputGroup>
                      <FieldError errors={[errors1.email]} />
                    </Field>
                  </FieldGroup>
                </FieldSet>

                <Button
                  type="submit"
                  disabled={isSubmitting1}
                  className="mt-6 w-full"
                >
                  {isSubmitting1 ? (
                    <>
                      <Spinner className="h-4 w-4" data-icon="inline-start" />
                      Sending code…
                    </>
                  ) : (
                    <>Send Code</>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit2(onResetPassword)} noValidate>
                <FieldSet>
                  <FieldGroup>
                    {/* Verification Code OTP Field */}
                    <Controller
                      control={control2}
                      name="otp"
                      render={({ field }) => (
                        <Field data-invalid={!!otpError || !!errors2.otp}>
                          <div className="flex items-center justify-between">
                            <FieldLabel htmlFor="otp">
                              Verification Code
                            </FieldLabel>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="xs"
                                      onClick={handleResendCode}
                                      disabled={isResending || isSubmitting2 || timeLeft > 0 || resendAttempts >= 3}
                                    >
                                      <RefreshCw
                                        className={`h-3 w-3 ${isResending ? "animate-spin" : ""}`}
                                      />
                                      {timeLeft > 0 ? `Resend (${timeLeft}s)` : "Resend Code"}
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {resendAttempts >= 3
                                    ? "Maximum of 3 resend attempts reached. Please check your mailbox."
                                    : timeLeft > 0
                                    ? `Please wait ${timeLeft} seconds before requesting another code.`
                                    : "Click to request a new verification code."}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <div className="flex justify-center">
                            <InputOTP
                              id="otp"
                              maxLength={6}
                              disabled={isSubmitting2 || isResending}
                              aria-invalid={!!otpError || !!errors2.otp}
                              {...field}
                            >
                              <InputOTPGroup >
                                <InputOTPSlot index={0} placeholder="-" data-success={isOtpVerified} aria-invalid={!!otpError || !!errors2.otp} />
                                <InputOTPSlot index={1} placeholder="-" data-success={isOtpVerified} aria-invalid={!!otpError || !!errors2.otp} />
                                <InputOTPSlot index={2} placeholder="-" data-success={isOtpVerified} aria-invalid={!!otpError || !!errors2.otp} />
                              </InputOTPGroup>
                              <InputOTPSeparator/>
                              <InputOTPGroup >
                                <InputOTPSlot index={3} placeholder="-" data-success={isOtpVerified} aria-invalid={!!otpError || !!errors2.otp} />
                                <InputOTPSlot index={4} placeholder="-" data-success={isOtpVerified} aria-invalid={!!otpError || !!errors2.otp} />
                                <InputOTPSlot index={5} placeholder="-" data-success={isOtpVerified} aria-invalid={!!otpError || !!errors2.otp} />
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <FieldError errors={[{ message: otpError || errors2.otp?.message }]} />
                        </Field>
                      )}
                    />

                    {/* New Password Field */}
                    <Field data-invalid={!!errors2.newPassword}>
                      <FieldLabel htmlFor="newPassword">
                        New Password
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          id="newPassword"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          disabled={isSubmitting2}
                          aria-invalid={!!errors2.newPassword}
                          {...register2("newPassword")}
                        />
                        <InputGroupAddon align="inline-start">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </InputGroupAddon>
                        <InputGroupAddon align="inline-end">
                          <Button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting2}
                            aria-label={
                              showPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </InputGroupAddon>
                      </InputGroup>
                      {watchedPassword && (
                        <PasswordStrength
                          password={watchedPassword}
                          className="mt-2"
                        />
                      )}
                      <FieldError errors={[errors2.newPassword]} />
                    </Field>

                    {/* Confirm Password Field */}
                    <Field data-invalid={!!errors2.confirmPassword}>
                      <FieldLabel htmlFor="confirmPassword">
                        Confirm Password
                      </FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          disabled={isSubmitting2}
                          aria-invalid={!!errors2.confirmPassword}
                          {...register2("confirmPassword")}
                        />
                        <InputGroupAddon align="inline-start">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        </InputGroupAddon>
                        <InputGroupAddon align="inline-end">
                          <Button
                            type="button"
                            onClick={() =>
                              setShowConfirmPassword(!showConfirmPassword)
                            }
                            variant="ghost"
                            size="icon"
                            disabled={isSubmitting2}
                            aria-label={
                              showConfirmPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </InputGroupAddon>
                      </InputGroup>
                      <FieldError errors={[errors2.confirmPassword]} />
                    </Field>
                  </FieldGroup>
                </FieldSet>

                <Button
                  type="submit"
                  disabled={isSubmitting2 || !isValid2 || !isOtpVerified || !!otpError}
                  className="mt-6 w-full"
                >
                  {isSubmitting2 ? (
                    <>
                      <Spinner className="h-4 w-4" data-icon="inline-start" />
                      Resetting password…
                    </>
                  ) : (
                    <>Reset Password</>
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          {/* Footer Actions wrapped inside premium CardFooter */}
          <CardFooter className="flex w-full justify-between p-2">
            {step === 2 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  const params = new URLSearchParams(window.location.search)
                  params.set("step", "1")
                  router.push(
                    `${window.location.pathname}?${params.toString()}`,
                    { scroll: false }
                  )
                }}
                disabled={isSubmitting2}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Change email address
              </Button>
            )}
            <Button variant="link" asChild>
              <Link href="/login">
                Go to Login <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="flex flex-col items-center gap-2">
            <Spinner className="h-6 w-6 text-primary" />
            <span className="text-xs text-muted-foreground">
              Loading Aegis Portal...
            </span>
          </div>
        </div>
      }
    >
      <ForgotPasswordContent />
    </Suspense>
  )
}
