"use client"

import { useState, useEffect } from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { PasswordStrength, isStrongPassword } from "@/components/password-strength"
import { Spinner } from "@/components/ui/spinner"

const updateProfileSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
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

  const onProfileSubmit = async (values: z.infer<typeof updateProfileSchema>) => {
    try {
      const res = await fetch(
        `/api/users/${user.username || user.name}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ displayName: values.displayName.trim() }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update profile")
      
      // Dynamic NextAuth session update
      await update({
        displayName: values.displayName.trim(),
      })

      toast.success("Profile display name updated successfully")
    } catch (err: any) {
      toast.error(err.message)
    }
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

      <Tabs
        value={currentTab}
        onValueChange={handleTabChange}
        className="space-y-6"
      >
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

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal details and how others see you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/10 text-2xl font-bold text-primary">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="flex gap-2 pt-1">
                    <Badge variant="secondary" className="capitalize">
                      {user?.role || "User"}
                    </Badge>
                    {isGoogleUser ? (
                      <Badge
                        variant="outline"
                        className="border-green-200 bg-green-50 text-green-700"
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Verified via
                        Google
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-orange-200 bg-orange-50 text-orange-700"
                      >
                        <AlertCircle className="mr-1 h-3 w-3" /> Credentials
                        Login
                      </Badge>
                    )}
                    {user?.role === "admin" && (
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase"
                      >
                        <Database className="h-3.5 w-3.5 text-muted-foreground" />
                        {dbMode || "Checking..."}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {!isGoogleUser && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">
                    Verify your identity
                  </AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Your account is not linked to Google. Please ensure your
                    email is correct for important updates.
                    <Button
                      variant="link"
                      className="ml-1 h-auto p-0 font-bold text-amber-800 hover:text-amber-900"
                    >
                      Verify Email
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="border-t pt-6">
                <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4 max-w-md">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Update Profile</h4>
                  <FieldSet>
                    <FieldGroup>
                      <Controller
                        control={profileControl}
                        name="displayName"
                        render={({ field }) => (
                          <Field data-invalid={!!profileErrors.displayName}>
                            <FieldLabel htmlFor="displayName">Display Name</FieldLabel>
                            <Input id="displayName" type="text" placeholder="Enter display name" {...field} />
                            <FieldError errors={[profileErrors.displayName]} />
                          </Field>
                        )}
                      />
                    </FieldGroup>
                  </FieldSet>
                  <Button type="submit" disabled={isProfileSubmitting}>
                    {isProfileSubmitting && <Spinner className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
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
                      <img
                         src={user.image}
                         alt={user.name}
                         className="h-10 w-10 rounded-full"
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
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-green-50 text-green-700"
                  >
                    Connected
                  </Badge>
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
                <div className="overflow-hidden rounded-md border">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                          Timestamp
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                          Action
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">
                          Details
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {logs.map((log, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-xs whitespace-nowrap text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            <Badge
                              variant={
                                log.action === "LOGIN"
                                  ? "default"
                                  : log.action === "LOGOUT"
                                    ? "secondary"
                                    : "outline"
                              }
                            >
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {log.details}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
    </div>
  )
}
