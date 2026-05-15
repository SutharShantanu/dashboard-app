"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  Search,
  UserPlus,
  Users,
  RefreshCw,
  Check,
  X,
  Key,
  ShieldAlert,
} from "lucide-react"

// shadcn/ui components
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { PageHeader } from "@/components/page-header"

interface User {
  username: string
  displayName: string
  email: string
  role: string
  allowedColumns: string
  isActive: string
  createdAt: string
  createdBy: string
}

function UsersDirectoryContent() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true)
  const [userSearchQuery, setUserSearchQuery] = useState<string>("")

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false)
  const [newUser, setNewUser] = useState({
    username: "",
    displayName: "",
    email: "",
    password: "",
    role: "sub-admin",
    allowedColumns: "Comments,Notes",
  })

  // Inline editing allowed columns state
  const [editingAllowedColsUser, setEditingAllowedColsUser] = useState<
    string | null
  >(null)
  const [tempAllowedColsValue, setTempAllowedColsValue] = useState<string>("")

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      if (session?.user?.role !== "admin") {
        toast.error(
          "Access Denied: Only administrators can view user accounts."
        )
        router.push("/dashboard")
        return
      }
      fetchUsers()
    }
  }, [sessionStatus, session, router])

  // Custom event listener for external modal open triggers (e.g., sidebar)
  useEffect(() => {
    const handleOpenModal = () => setIsAddUserOpen(true)
    window.addEventListener("open_add_user_modal", handleOpenModal)
    return () => {
      window.removeEventListener("open_add_user_modal", handleOpenModal)
    }
  }, [])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch("/api/users")
      if (!res.ok) throw new Error("Failed to load users")
      const data = await res.json()
      setUsers(data.users || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch users list.")
    } finally {
      setLoadingUsers(false)
    }
  }

  // Handles creating a new user account
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !newUser.username ||
      !newUser.displayName ||
      !newUser.password ||
      !newUser.role
    ) {
      toast.error("All user account fields are required.")
      return
    }

    try {
      const payload = {
        ...newUser,
        allowedColumns:
          newUser.role === "admin"
            ? "*"
            : newUser.allowedColumns || "Comments,Notes",
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to register user.")

      toast.success(
        `Successfully registered ${newUser.role} user: ${newUser.username}`
      )
      setIsAddUserOpen(false)
      setNewUser({
        username: "",
        displayName: "",
        email: "",
        password: "",
        role: "sub-admin",
        allowedColumns: "Comments,Notes",
      })
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to save account.")
    }
  }

  // Toggle user activation status
  const handleToggleUserActive = async (
    username: string,
    currentActive: string
  ) => {
    const nextActive = currentActive === "TRUE" ? "FALSE" : "TRUE"
    try {
      const res = await fetch(`/api/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      })

      const result = await res.json()
      if (!res.ok)
        throw new Error(result.error || "Failed to change user status.")

      toast.success(`User '${username}' activation updated successfully.`)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle user status.")
    }
  }

  // Saves updated allowed columns for a sub-admin
  const handleSaveAllowedCols = async (username: string) => {
    try {
      const res = await fetch(`/api/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedColumns: tempAllowedColsValue }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to update columns.")

      toast.success(`Permissions updated successfully for user ${username}.`)
      setEditingAllowedColsUser(null)
      fetchUsers()
    } catch (err: any) {
      toast.error(err.message || "Failed to save user columns.")
    }
  }

  // Reset Sub-admin Password
  const handleResetPassword = async (username: string) => {
    const newPass = prompt(
      `Enter a new secure password for sub-admin '${username}':`
    )
    if (newPass === null) return
    if (newPass.trim().length < 4) {
      toast.error("Password must be at least 4 characters long.")
      return
    }

    try {
      const res = await fetch(`/api/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPass.trim() }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to reset password.")

      toast.success(
        `Password has been reset successfully for user '${username}'.`
      )
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.")
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
  )

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            Verifying administrative access...
          </p>
        </div>
      </div>
    )
  }

  if (session?.user?.role !== "admin") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
        <Card className="max-w-md border-destructive/20 bg-destructive/5 p-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg font-bold text-destructive">
            Access Restricted
          </CardTitle>
          <CardDescription className="mt-2 text-muted-foreground">
            You do not have administrative privileges required to view or modify
            system accounts.
          </CardDescription>
          <Button
            onClick={() => router.push("/dashboard")}
            className="mt-6 w-full"
          >
            Return to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-svh w-full max-w-full overflow-x-hidden bg-background p-6 text-foreground">
      <div className="mx-auto w-full max-w-7xl space-y-8">
        {/* Header Dashboard Banner */}
        <PageHeader
          subtitle="System Administration"
          title="Admins & Sub-Admins Directory"
          description="Manage administrative accounts, assign role-based column access locks, and oversee account activation status across your workspace."
          actionButton={
            <Button onClick={() => setIsAddUserOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Create Account
            </Button>
          }
        />


        {/* User Search Bar */}
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex w-full max-w-md items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by username or display name..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="h-10 w-full pl-9"
            />
          </div>

          <Button
            variant="outline"
            onClick={fetchUsers}
            disabled={loadingUsers}
            className="h-10 gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${loadingUsers ? "animate-spin" : ""}`}
            />
            Refresh Directory
          </Button>
        </div>

        {/* Users Grid Table */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-medium text-muted-foreground">
                Loading administrative accounts...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20">
              <Empty className="mx-auto max-w-md p-12">
                <EmptyMedia variant="icon" className="mb-4 size-12">
                  <Users className="size-6 text-muted-foreground" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle className="text-lg font-bold">
                    No accounts found
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-6 py-4 font-semibold">
                      Username
                    </TableHead>
                    <TableHead className="px-6 py-4 font-semibold">
                      Display Name
                    </TableHead>
                    <TableHead className="px-6 py-4 font-semibold">
                      Email
                    </TableHead>
                    <TableHead className="px-6 py-4 font-semibold">
                      Role
                    </TableHead>
                    <TableHead className="px-6 py-4 font-semibold">
                      Permissions
                    </TableHead>
                    <TableHead className="px-6 py-4 font-semibold">
                      Created At
                    </TableHead>
                    <TableHead className="px-6 py-4 font-semibold">
                      Status
                    </TableHead>
                    <TableHead className="px-6 py-4 text-right font-semibold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow
                      key={user.username}
                      className="transition-colors hover:bg-muted/40"
                    >
                      <TableCell className="px-6 py-4 font-bold whitespace-nowrap">
                        {user.username}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-medium whitespace-nowrap">
                        {user.displayName}
                      </TableCell>
                      <TableCell className="px-6 py-4 font-medium text-muted-foreground whitespace-nowrap">
                        {user.email || "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <Badge
                          variant={
                            user.role === "admin" ? "default" : "secondary"
                          }
                          className="capitalize"
                        >
                          {user.role || "sub-admin"}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        {editingAllowedColsUser === user.username ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={tempAllowedColsValue}
                              onChange={(e) =>
                                setTempAllowedColsValue(e.target.value)
                              }
                              className="h-8 w-64 text-xs"
                            />
                            <Button
                              size="icon-xs"
                              onClick={() =>
                                handleSaveAllowedCols(user.username)
                              }
                              title="Save Columns"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon-xs"
                              onClick={() => setEditingAllowedColsUser(null)}
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="px-2.5 py-1 font-mono text-xs"
                            >
                              {user.allowedColumns || "None"}
                            </Badge>
                            {user.role !== "admin" && (
                              <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => {
                                  setEditingAllowedColsUser(user.username)
                                  setTempAllowedColsValue(user.allowedColumns)
                                }}
                                className="h-7 text-xs font-medium"
                              >
                                Edit
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap text-muted-foreground text-sm">
                        {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy HH:mm") : "-"}
                      </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            handleToggleUserActive(user.username, user.isActive)
                          }
                          className="transition-all duration-200 hover:opacity-80"
                        >
                          <Badge
                            variant={
                              user.isActive === "TRUE"
                                ? "default"
                                : "destructive"
                            }
                            className="cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase"
                          >
                            {user.isActive === "TRUE" ? "Active" : "Suspended"}
                          </Badge>
                        </button>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(user.username)}
                          className="h-8 gap-1.5 text-xs"
                        >
                          <Key className="h-3.5 w-3.5" />
                          Reset Pass
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
}
        </div>

        {/* Modal Dialog for User Creation */}
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                Create Admin or Sub-Admin Account
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Register new administrator or restricted sub-administrator.
              </p>
            </DialogHeader>

            <form onSubmit={handleCreateUserSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Unique Username *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. rahul_sub"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Display Name *
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Sharma (Advisor)"
                  value={newUser.displayName}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      displayName: e.target.value,
                    }))
                  }
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="e.g. rahul@domain.com"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Login Password *
                </label>
                <Input
                  type="password"
                  placeholder="Create secure password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Role *
                </label>
                <Select
                  value={newUser.role}
                  onValueChange={(val) =>
                    setNewUser((prev) => ({ ...prev, role: val }))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Full Access)</SelectItem>
                    <SelectItem value="sub-admin">
                      Sub-Admin (Restricted)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newUser.role === "sub-admin" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Allowed Columns (Comma Separated)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Comments,Notes"
                    value={newUser.allowedColumns}
                    onChange={(e) =>
                      setNewUser((prev) => ({
                        ...prev,
                        allowedColumns: e.target.value,
                      }))
                    }
                    className="h-10"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Allowed Columns specify what columns to the right of Grade
                    they are allowed to modify.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Account</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default function UsersDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-10 w-10 animate-spin text-primary" />
            <p className="animate-pulse text-sm font-medium tracking-wide text-muted-foreground">
              Loading users directory...
            </p>
          </div>
        </div>
      }
    >
      <UsersDirectoryContent />
    </Suspense>
  )
}
