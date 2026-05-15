"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
  Loader2
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const user = session?.user as any

  const [loading, setLoading] = useState(false)

  // Profile Form
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  const isGoogleUser = user?.image || user?.email?.includes("gmail.com")

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`/api/users/${user.username || user.name}/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to change password")
      toast.success("Password changed successfully")
      setCurrentPassword("")
      setNewPassword("")
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (status === "loading") {
    return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  return (
    <div className="container mx-auto py-10 space-y-8 max-w-5xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings, profile, and security preferences.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="profile" className="data-[state=active]:bg-background">
            <UserIcon className="w-4 h-4 mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-background">
            <Bell className="w-4 h-4 mr-2" /> Notifications
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
                  </div>
                </div>
              </div>

              {!isGoogleUser && (
                <Alert variant="warning" className="bg-amber-50 border-amber-200 text-amber-900">
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
                  <h4 className="text-sm font-medium mb-4 flex items-center">
                    <KeyRound className="w-4 h-4 mr-2" /> Change Password
                  </h4>
                  <form onSubmit={handleChangePassword} className="grid gap-4 max-w-md">
                    <div className="grid gap-2">
                      <Label htmlFor="current">Current Password</Label>
                      <Input 
                        id="current" 
                        type="password" 
                        value={currentPassword} 
                        onChange={e => setCurrentPassword(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="new">New Password</Label>
                      <Input 
                        id="new" 
                        type="password" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        required 
                      />
                    </div>
                    <Button type="submit" disabled={loading} className="w-fit">
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Update Password
                    </Button>
                  </form>
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
    </div>
  )
}
