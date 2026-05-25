"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Database,
  Bell,
  User as UserIcon,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import { useRouter, useSearchParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/utils"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: any
}

export function SettingsDialog({
  open,
  onOpenChange,
  user,
}: SettingsDialogProps) {
  const router = useRouter()

  const searchParams = useSearchParams()

  // Is this user from Google SSO or Credentials?
  // We check if the user has an image (avatar usually comes from Google) or if we injected a provider flag.
  // Assuming lack of avatar or specific domain implies credentials for now, but ideally we'd pass the provider.
  const isGoogleUser = user?.image || user?.email?.includes("gmail.com") // Mock heuristic if provider is not in session
  const activeTab = searchParams?.get("settingsTab") || "profile"

  const handleTabChange = (val: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set("settingsTab", val)
    router.replace(`${window.location.pathname}?${params.toString()}`, {
      scroll: false,
    })
  }

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [loading, setLoading] = useState(false)

  // DB Settings
  const [sheetUrl, setSheetUrl] = useState("")
  const [sheetTitle, setSheetTitle] = useState("")

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // API route doesn't exist yet, we'll create it later.
      const res = await fetch("/api/auth/change-password", {
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

  const handleConnectSheet = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Reusing logic from the old sidebar or implementing new one
      const res = await fetch("/api/sheets/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl, title: sheetTitle }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to connect sheet")
      toast.success("Sheet connected successfully")
      setSheetUrl("")
      setSheetTitle("")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} name="settings">
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your profile, security, and application settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="m-2 w-fit"
        >
          <TabsList>
            <TabsTrigger value="profile">
              <UserIcon className="h-4 w-4" /> Profile
            </TabsTrigger>
            {user?.role === "admin" && (
              <TabsTrigger value="database">
                <Database className="h-4 w-4" /> Database
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4" /> Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border border-border">
                  <AvatarImage
                    src={getAvatarUrl(
                      user?.username || user?.name || "",
                      user?.role || ""
                    )}
                    alt={user?.name}
                  />
                  <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">{user?.name}</h3>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <div className="mt-1 flex gap-2">
                    <Badge variant="secondary">{user?.role || "User"}</Badge>
                    {isGoogleUser && (
                      <Badge
                        variant="outline"
                        className="border-green-200 bg-green-50 text-green-700"
                      >
                        Verified via Google
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {!isGoogleUser && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Email Not Verified</AlertTitle>
                  <AlertDescription>
                    You have not connected a Google account. To use features
                    requiring email (like password resets), please verify your
                    email manually or sign in with Google.
                    {/* Placeholder for OTP verification trigger */}
                    <Button
                      variant="link"
                      className="ml-1 h-auto p-0 font-bold"
                    >
                      Verify Email Now
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <div className="border-t pt-4">
                <h4 className="mb-4 flex items-center text-sm font-medium">
                  <KeyRound className="h-4 w-4 mr-1" /> Change Password
                </h4>
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current">Current Password</Label>
                    <Input
                      id="current"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new">New Password</Label>
                    <Input
                      id="new"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
              </div>
            </div>
          </TabsContent>

          {user?.role === "admin" && (
            <TabsContent value="database" className="space-y-6 pt-4">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">
                  Connect External Google Sheet
                </h4>
                <p className="mb-4 text-sm text-muted-foreground">
                  Add another Google Sheet as a database source for the
                  dashboard.
                </p>
                <form onSubmit={handleConnectSheet} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sheetUrl">Google Sheet URL</Label>
                    <Input
                      id="sheetUrl"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sheetTitle">Display Name (Optional)</Label>
                    <Input
                      id="sheetTitle"
                      placeholder="e.g. 2024 Admissions"
                      value={sheetTitle}
                      onChange={(e) => setSheetTitle(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Connecting..." : "Connect Sheet"}
                  </Button>
                </form>
              </div>
            </TabsContent>
          )}

          <TabsContent value="notifications" className="space-y-6 pt-4">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Recent Notifications</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-4 rounded-lg border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Account Created</span>
                    <span className="text-xs text-muted-foreground">
                      Your account has been successfully provisioned.
                    </span>
                    <span className="text-tiny text-muted-foreground">
                      Just now
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-lg border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-500">
                    <Database className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Database Synced</span>
                    <span className="text-xs text-muted-foreground">
                      The primary student database was synced from Google
                      Sheets.
                    </span>
                    <span className="text-tiny text-muted-foreground">
                      2 hours ago
                    </span>
                  </div>
                </div>
                <div className="flex items-start gap-4 rounded-lg border p-3 opacity-60">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Security Alert</span>
                    <span className="text-xs text-muted-foreground">
                      New login detected from a different IP address.
                    </span>
                    <span className="text-tiny text-muted-foreground">
                      Yesterday
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                View All Notifications
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
