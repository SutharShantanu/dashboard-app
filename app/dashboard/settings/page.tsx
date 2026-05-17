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
  Loader2,
  FileText,
  Link as LinkIcon,
  Database
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldSet } from "@/components/ui/field"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
})

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const { data: dbModeData } = useQuery({
    queryKey: ["dbMode"],
    queryFn: async () => {
      const res = await fetch("/api/students");
      if (!res.ok) throw new Error("Failed to fetch DB mode");
      const json = await res.json();
      return json.configured ? "Connected" : (json.simulated ? "Simulated" : "Disconnected");
    },
    staleTime: 60000, // 1 minute
  });
  const dbMode = dbModeData || null;
  const searchParams = useSearchParams()
  const user = session?.user as any

  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Dialog state from URL
  const isDialogOpen = searchParams.get("dialog") === "change-password"

  const setDialogOpen = (open: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    if (open) {
      params.set("dialog", "change-password")
    } else {
      params.delete("dialog")
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  const getPasswordStrength = (pass: string) => {
    let s = 0;
    if (pass.length > 5) s++;
    if (pass.length > 7) s++;
    if (/[A-Z]/.test(pass)) s++;
    if (/[0-9]/.test(pass)) s++;
    if (/[^A-Za-z0-9]/.test(pass)) s++;
    return s;
  };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
    },
  })

  const newPasswordValue = watch("newPassword", "")

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

  const onSubmit = async (values: z.infer<typeof changePasswordSchema>) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${user.username || user.name}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to change password")
      toast.success("Password changed successfully")
      reset()
      setDialogOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  const currentTab = searchParams.get("tab") || "profile"

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="py-10 space-y-8 w-full">
      <PageHeader
        subtitle="Account Settings"
        title="Settings"
        description="Manage your account settings, profile, and security preferences."
      />

      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="data-[state=active]:bg-background">
            <UserIcon className="w-4 h-4 mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-background">
            <Bell className="w-4 h-4 mr-2" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-background">
            <LinkIcon className="w-4 h-4 mr-2" /> Integrations
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-background">
            <FileText className="w-4 h-4 mr-2" /> Logs
          </TabsTrigger>
          {user?.role === "admin" && (
            <TabsTrigger value="security" className="data-[state=active]:bg-background">
              <Shield className="w-4 h-4 mr-2" /> Admin Security
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details and how others see you.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-2 border-primary/20">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="flex gap-2 pt-1">
                    <Badge variant="secondary" className="capitalize">{user?.role || "User"}</Badge>
                    {isGoogleUser ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Verified via Google
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        <AlertCircle className="w-3 h-3 mr-1" /> Credentials Login
                      </Badge>
                    )}
                    {user?.role === "admin" && (
                      <Badge variant="secondary" className="text-xs gap-1.5 flex items-center font-bold uppercase tracking-wider">
                        <Database className="h-3.5 w-3.5 text-muted-foreground" />
                        {dbMode || "Checking..."}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {!isGoogleUser && (
                <Alert className="bg-amber-50 border-amber-200 text-amber-900">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-800">Verify your identity</AlertTitle>
                  <AlertDescription className="text-amber-700">
                    Your account is not linked to Google. Please ensure your email is correct for important updates.
                    <Button variant="link" className="p-0 h-auto font-bold ml-1 text-amber-800 hover:text-amber-900">
                      Verify Email
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {!isGoogleUser && (
                <div className="pt-6 border-t">
                  <Button onClick={() => setDialogOpen(true)} variant="outline">
                    <KeyRound className="w-4 h-4 mr-2" /> Change Password
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Control how and when you receive notifications.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground py-10 text-center border-2 border-dashed rounded-lg">
                Notification settings coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Integration</CardTitle>
              <CardDescription>Connect your account to Google to access Google Sheets.</CardDescription>
            </CardHeader>
            <CardContent>
              {isGoogleUser ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {user?.image ? (
                      <img src={user.image} alt={user.name} className="h-10 w-10 rounded-full" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold">
                        {user?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{user?.name}</p>
                      <p className="text-sm text-muted-foreground">{user?.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Connected
                  </Badge>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 space-y-4">
                  <Alert variant="destructive" className="bg-destructive/5 border-destructive/20">
                    <AlertCircle className="h-5 w-5" />
                    <AlertTitle className="text-lg font-bold">Google Connection Required</AlertTitle>
                    <AlertDescription className="mt-1">
                      The account isn't connected to Google. Kindly connect and then you can choose the sheet.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={() => signIn("google", { callbackUrl: "/dashboard/settings?tab=integrations" })} className="w-fit">
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                      <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
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
              <CardDescription>View your recent activities in the system.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
              ) : logs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-10 text-center border-2 border-dashed rounded-lg">
                  No logs found.
                </p>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Timestamp</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {logs.map((log, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 text-xs">
                            <Badge variant={log.action === "LOGIN" ? "default" : log.action === "LOGOUT" ? "secondary" : "outline"}>
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
                <CardDescription>Configure system-wide security policies and manage administrative access.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 border space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">User Management</p>
                      <p className="text-sm text-muted-foreground">Manage roles, permissions and account statuses.</p>
                    </div>
                    <Button variant="outline" onClick={() => router.push("/dashboard/users")}>
                      Manage Users
                    </Button>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border space-y-4 opacity-50 cursor-not-allowed">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Audit Logs</p>
                      <p className="text-sm text-muted-foreground">View detailed logs of all system activities.</p>
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

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => setDialogOpen(open)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new one.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FieldSet>
              <FieldGroup>
                <Controller
                  control={control}
                  name="currentPassword"
                  render={({ field }) => (
                    <Field data-invalid={!!errors.currentPassword}>
                      <FieldLabel htmlFor="currentPassword">Current Password</FieldLabel>
                      <Input 
                        id="currentPassword" 
                        type="password" 
                        {...field} 
                      />
                      <FieldError errors={[errors.currentPassword]} />
                    </Field>
                  )}
                />
                <Controller
                  control={control}
                  name="newPassword"
                  render={({ field }) => (
                    <Field data-invalid={!!errors.newPassword}>
                      <FieldLabel htmlFor="newPassword">New Password</FieldLabel>
                      <Input 
                        id="newPassword" 
                        type="password" 
                        {...field} 
                      />
                      {newPasswordValue && (
                        <div className="mt-1 space-y-1 w-full">
                          <div className="flex gap-1 h-1">
                            {[1, 2, 3, 4, 5].map((level) => {
                              const strength = getPasswordStrength(newPasswordValue);
                              return (
                                <div 
                                  key={level}
                                  className={`h-full flex-1 rounded-full ${
                                    level <= strength
                                      ? strength <= 2
                                        ? "bg-red-500"
                                        : strength === 3
                                        ? "bg-orange-500"
                                        : "bg-emerald-500"
                                      : "bg-muted"
                                  }`}
                                />
                              );
                            })}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {getPasswordStrength(newPasswordValue) <= 2 && "Weak"}
                            {getPasswordStrength(newPasswordValue) === 3 && "Medium"}
                            {getPasswordStrength(newPasswordValue) >= 4 && "Strong"}
                          </p>
                        </div>
                      )}
                      <FieldError errors={[errors.newPassword]} />
                    </Field>
                  )}
                />
              </FieldGroup>
            </FieldSet>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Update Password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
