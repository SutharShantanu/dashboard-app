"use client"

import { useState, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Bell,
  User as UserIcon,
  Shield,
  FileText,
  Link as LinkIcon,
  Database,
  Pencil,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSet,
} from "@/components/ui/field"
import {
  PasswordStrength,
  isStrongPassword,
} from "@/components/password-strength"
import { Spinner } from "@/components/ui/spinner"
import { LogsDataTable } from "@/components/logs-data-table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/utils"
import Image from "next/image"

const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
})

export default function SettingsPage() {
  const { data: session, status, update } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const { data: dbModeData } = useQuery({
    queryKey: ["dbMode"],
    queryFn: async () => {
      const res = await fetch("/api/students")
      if (!res.ok) throw new Error("Failed to fetch DB mode")
      const json = await res.json()
      return json.configured
        ? "Connected"
        : json.simulated
          ? "Simulated"
          : "Disconnected"
    },
    staleTime: 60000, // 1 minute
  })
  const dbMode = dbModeData || null
  const searchParams = useSearchParams()
  const user = session?.user as any

  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(
    searchParams.get("dialog") === "change-password" ||
      searchParams.get("changePassword") === "open"
  )

  const {
    control: passwordControl,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch: watchPassword,
    formState: { errors: passwordErrors, isSubmitting: isPasswordSubmitting },
  } = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
    mode: "onTouched",
  })

  const newPasswordValue = watchPassword("newPassword", "")

  const {
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isProfileSubmitting },
  } = useForm<z.infer<typeof updateProfileSchema>>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      displayName: "",
    },
    mode: "onTouched",
  })

  useEffect(() => {
    if (user?.displayName || user?.name) {
      resetProfile({
        displayName: user.displayName || user.name || "",
      })
    }
  }, [user, resetProfile])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    if (searchParams.get("tab") === "logs") {
      fetchLogs()
    }
  }, [searchParams])

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch("/api/logs?self=true")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch logs")
      setLogs(data.logs || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoadingLogs(false)
    }
  }

  const isGoogleUser = user?.image || user?.email?.includes("gmail.com")

  const onProfileSubmit = async (
    values: z.infer<typeof updateProfileSchema>
  ) => {
    try {
      const res = await fetch(`/api/users/${user.username || user.name}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: values.displayName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update profile")

      // Dynamic NextAuth session update
      await update({
        displayName: values.displayName.trim(),
      })

      toast.success("Profile display name updated successfully")
      setIsEditingProfile(false)
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const onPasswordSubmit = async (
    values: z.infer<typeof changePasswordSchema>
  ) => {
    if (!isStrongPassword(values.newPassword)) {
      toast.error("Password must meet all security requirements")
      return
    }

    const request = fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    }).then(async (res) => {
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to change password")
      return data
    })

    toast.promise(request, {
      loading: "Updating password…",
      success: () => {
        resetPassword()
        setIsDialogOpen(false)
        return "Password changed successfully!"
      },
      error: (err: Error) => err.message,
    })

    // Await so react-hook-form's isSubmitting stays true until done
    await request.catch(() => {})
  }

  if (status === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const currentTab = searchParams.get("tab") || "profile"

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="w-full space-y-8">
      <PageHeader
        subtitle="Account Settings"
        title="Settings"
        description="Manage your account settings, profile, and security preferences."
      />

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="profile">
            <UserIcon className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations">
            <LinkIcon className="h-4 w-4" /> Integrations
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="h-4 w-4" /> Logs
          </TabsTrigger>
          {user?.role === "admin" && (
            <TabsTrigger value="security">
              <Shield className="h-4 w-4" /> Admin Security
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div className="space-y-1.5">
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your personal details and how others see you.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {isEditingProfile ? (
                  <>
                    <Button
                      type="submit"
                      form="profileForm"
                      disabled={isProfileSubmitting}
                      size="sm"
                    >
                      {isProfileSubmitting && <Spinner className="h-4 w-4" />}
                      Save Changes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        resetProfile({
                          displayName: user.displayName || user.name || "",
                        })
                        setIsEditingProfile(false)
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingProfile(true)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage
                    src={
                      user?.image ||
                      getAvatarUrl(user?.username || user?.name, user?.role)
                    }
                    alt={user?.name || "User Avatar"}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="flex gap-2 pt-1">
                    <Badge variant="secondary" className="capitalize">
                      {user?.role || "User"}
                    </Badge>
                    {isGoogleUser ? (
                      <Badge variant="success-light">
                        <CheckCircle2 className="h-3 w-3" /> Verified via Google
                      </Badge>
                    ) : (
                      <Badge variant="warning-light">
                        <AlertCircle className="h-3 w-3" /> Credentials Login
                      </Badge>
                    )}
                    {user?.role === "admin" && (
                      <Badge variant="secondary">
                        <Database className="h-3.5 w-3.5 text-muted-foreground" />
                        {dbMode || "Checking..."}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {!isGoogleUser && (
                <Alert className="border-warning/20 bg-warning/10 text-warning-foreground">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <AlertTitle className="font-semibold text-warning-foreground">
                    Verify your identity
                  </AlertTitle>
                  <AlertDescription className="text-warning-foreground/90">
                    Your account is not linked to Google. Please ensure your
                    email is correct for important updates.
                    <Button
                      variant="link"
                      className="ml-1 h-auto p-0 font-bold text-warning hover:text-warning-foreground"
                    >
                      Verify Email
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="border-t pt-6">
                <form
                  id="profileForm"
                  onSubmit={handleProfileSubmit(onProfileSubmit)}
                  className="max-w-md space-y-4"
                  noValidate
                >
                  <h4 className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                    Update Profile
                  </h4>
                  <FieldSet>
                    <FieldGroup className="flex flex-row items-center gap-2">
                      <Controller
                        control={profileControl}
                        name="displayName"
                        render={({ field }) => (
                          <Field data-invalid={!!profileErrors.displayName}>
                            <FieldLabel htmlFor="displayName">
                              Display Name
                            </FieldLabel>
                            <Input
                              id="displayName"
                              type="text"
                              placeholder="Enter display name"
                              {...field}
                              readOnly={!isEditingProfile}
                              className={
                                !isEditingProfile ? "cursor-not-allowed" : ""
                              }
                            />
                            {isEditingProfile && (
                              <FieldError
                                errors={[profileErrors.displayName]}
                              />
                            )}
                          </Field>
                        )}
                      />
                      {!isGoogleUser && (
                        <Field className="w-fit">
                          <FieldLabel htmlFor="changePassword">
                            Change Password
                          </FieldLabel>
                          <Button
                            id="changePassword"
                            type="button"
                            onClick={() => setIsDialogOpen(true)}
                            variant="outline"
                          >
                            <KeyRound className="h-4 w-4" />
                            Change Password
                          </Button>
                        </Field>
                      )}
                    </FieldGroup>
                  </FieldSet>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Control how and when you receive notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="rounded-lg border-2 border-dashed py-10 text-center text-sm text-muted-foreground">
                Notification settings coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Integration</CardTitle>
              <CardDescription>
                Connect your account to Google to access Google Sheets.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isGoogleUser ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {user?.image ? (
                      <Image
                        src={user.image}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
                        {user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="success-light">Connected</Badge>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center space-y-4 py-6">
                  <Alert
                    variant="destructive"
                    className="border-destructive/20 bg-destructive/5"
                  >
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="text-lg font-bold">
                      Google Connection Required
                    </AlertTitle>
                    <AlertDescription className="mt-1">
                      The account isn't connected to Google. Kindly connect and
                      then you can choose the sheet.
                    </AlertDescription>
                  </Alert>
                  <Button
                    onClick={() =>
                      signIn("google", {
                        callbackUrl: "/dashboard/settings?tab=integrations",
                      })
                    }
                    className="w-fit"
                  >
                    <svg
                      className="h-4 w-4"
                      aria-hidden="true"
                      focusable="false"
                      data-prefix="fab"
                      data-icon="google"
                      role="img"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 488 512"
                    >
                      <path
                        fill="currentColor"
                        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                      ></path>
                    </svg>
                    Connect Account
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Activity Logs</CardTitle>
              <CardDescription>
                View your recent activities in the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex justify-center py-10">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : logs.length === 0 ? (
                <p className="rounded-lg border-2 border-dashed py-10 text-center text-sm text-muted-foreground">
                  No logs found.
                </p>
              ) : (
                <LogsDataTable logs={logs} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === "admin" && (
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Global Security Configuration</CardTitle>
                <CardDescription>
                  Configure system-wide security policies and manage
                  administrative access.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4 rounded-lg border bg-muted/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">User Management</p>
                      <p className="text-sm text-muted-foreground">
                        Manage roles, permissions and account statuses.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push("/dashboard/users")}
                    >
                      Manage Users
                    </Button>
                  </div>
                </div>
                <div className="cursor-not-allowed space-y-4 rounded-lg border bg-muted/50 p-4 opacity-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Audit Logs</p>
                      <p className="text-sm text-muted-foreground">
                        View detailed logs of all system activities.
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      View Logs
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        name="changePassword"
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new secure password.
            </DialogDescription>
          </DialogHeader>
          <form
            id="changePasswordForm"
            onSubmit={handlePasswordSubmit(onPasswordSubmit)}
            className="m-2"
            noValidate
          >
            <FieldSet>
              <FieldGroup>
                <Controller
                  control={passwordControl}
                  name="currentPassword"
                  render={({ field }) => (
                    <Field data-invalid={!!passwordErrors.currentPassword}>
                      <FieldLabel htmlFor="currentPassword">
                        Current Password
                      </FieldLabel>
                      <PasswordInput
                        id="currentPassword"
                        placeholder="Enter current password"
                        {...field}
                      />
                      <FieldError errors={[passwordErrors.currentPassword]} />
                    </Field>
                  )}
                />
                <Controller
                  control={passwordControl}
                  name="newPassword"
                  render={({ field }) => (
                    <Field data-invalid={!!passwordErrors.newPassword}>
                      <FieldLabel htmlFor="newPassword">
                        New Password
                      </FieldLabel>
                      <PasswordInput
                        id="newPassword"
                        placeholder="Enter new secure password"
                        {...field}
                      />
                      <PasswordStrength
                        password={newPasswordValue || ""}
                        className="mt-2"
                      />
                      <FieldError errors={[passwordErrors.newPassword]} />
                    </Field>
                  )}
                />
              </FieldGroup>
            </FieldSet>
          </form>
          <DialogFooter>
            <Button
              type="submit"
              form="changePasswordForm"
              disabled={isPasswordSubmitting}
            >
              {isPasswordSubmitting && (
                <Spinner className="h-4 w-4" />
              )}
              {isPasswordSubmitting ? "Updating…" : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
