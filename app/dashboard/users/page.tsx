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
  Loader2,
  Check,
  X,
  Key,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
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
import {
  PasswordStrength,
  isStrongPassword,
} from "@/components/password-strength"
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"

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
  const [showPassword, setShowPassword] = useState<boolean>(false)
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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeActionId, setActiveActionId] = useState<string | null>(null)

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

    setIsSubmitting(true)
    const promise = async () => {
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
      return result
    }

    toast.promise(promise(), {
      loading: "Creating user account...",
      success: (data) =>
        `Successfully registered ${newUser.role}: ${newUser.username}`,
      error: (err) => err.message || "Failed to save account.",
      finally: () => setIsSubmitting(false),
    })
  }

  // Toggle user activation status
  const handleToggleUserActive = async (
    username: string,
    currentActive: string
  ) => {
    const nextActive = currentActive === "TRUE" ? "FALSE" : "TRUE"
    setActiveActionId(username)

    const promise = async () => {
      const res = await fetch(`/api/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      })

      const result = await res.json()
      if (!res.ok)
        throw new Error(result.error || "Failed to change user status.")

      fetchUsers()
      return result
    }

    toast.promise(promise(), {
      loading: `Updating status for ${username}...`,
      success: `User account ${nextActive === "TRUE" ? "activated" : "suspended"} successfully.`,
      error: (err) => err.message || "Failed to toggle user status.",
      finally: () => setActiveActionId(null),
    })
  }

  // Saves updated allowed columns for a sub-admin
  const handleSaveAllowedCols = async (username: string) => {
    setActiveActionId(username)
    const promise = async () => {
      const res = await fetch(`/api/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedColumns: tempAllowedColsValue }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to update columns.")

      setEditingAllowedColsUser(null)
      fetchUsers()
      return result
    }

    toast.promise(promise(), {
      loading: "Saving permission updates...",
      success: `Permissions updated for user ${username}.`,
      error: (err) => err.message || "Failed to save user columns.",
      finally: () => setActiveActionId(null),
    })
  }

  // Reset Sub-admin Password
  const handleResetPassword = async (username: string) => {
    const newPass = prompt(
      `Enter a new secure password for sub-admin '${username}':`
    )
    if (newPass === null) return
    if (newPass.trim().length < 8) {
      toast.error("Password must be at least 8 characters long.")
      return
    }

    setActiveActionId(username)
    const promise = async () => {
      const res = await fetch(`/api/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPass.trim() }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to reset password.")
      return result
    }

    toast.promise(promise(), {
      loading: "Resetting password...",
      success: "Password reset successfully.",
      error: (err) => err.message || "Failed to reset password.",
      finally: () => setActiveActionId(null),
    })
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
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
    <div className="mx-auto w-full space-y-8">
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
          onClick={() => {
            toast.promise(fetchUsers(), {
              loading: "Refreshing user directory...",
              success: "Directory updated successfully.",
              error: "Failed to refresh users.",
            })
          }}
          disabled={loadingUsers}
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
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                    <TableCell className="px-6 py-4 font-medium whitespace-nowrap text-muted-foreground">
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
                            disabled={activeActionId === user.username}
                            onClick={() => handleSaveAllowedCols(user.username)}
                            title="Save Columns"
                          >
                            {activeActionId === user.username ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon-xs"
                            disabled={activeActionId === user.username}
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
                            {user.role === "admin" ||
                            !user.allowedColumns ||
                            user.allowedColumns === "*" ||
                            user.allowedColumns.toLowerCase() === "none"
                              ? "All"
                              : user.allowedColumns}
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
                    <TableCell className="px-6 py-4 text-sm whitespace-nowrap text-muted-foreground">
                      {user.createdAt
                        ? format(new Date(user.createdAt), "MMM d, yyyy HH:mm")
                        : "-"}
                    </TableCell>
                    <TableCell className="px-6 py-4 whitespace-nowrap">
                      <button
                        disabled={activeActionId === user.username}
                        onClick={() =>
                          handleToggleUserActive(user.username, user.isActive)
                        }
                        className="transition-all duration-200 hover:opacity-80 disabled:opacity-50"
                      >
                        <Badge
                          variant={
                            user.isActive === "TRUE" ? "default" : "destructive"
                          }
                          className="cursor-pointer rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase"
                        >
                          {activeActionId === user.username ? (
                            <Loader2 className="mr-1 h-2 w-2 animate-spin" />
                          ) : null}
                          {user.isActive === "TRUE" ? "Active" : "Suspended"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right whitespace-nowrap">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={activeActionId === user.username}
                        onClick={() => handleResetPassword(user.username)}
                        className="h-8 gap-1.5 text-xs"
                      >
                        {activeActionId === user.username ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Key className="h-3.5 w-3.5" />
                        )}
                        Reset Pass
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
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
              <InputGroup className="h-10">
                <InputGroupInput
                  type={showPassword ? "text" : "password"}
                  placeholder="Create secure password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>

              <PasswordStrength password={newUser.password} className="mt-2" />
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
              <Button
                type="submit"
                disabled={isSubmitting || !isStrongPassword(newUser.password)}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Create Account
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function UsersDirectoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
