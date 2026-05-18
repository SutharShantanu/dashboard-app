"use client"

import React, { useState, useEffect, Suspense, useMemo } from "react"
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
  Pencil,
  Trash2,
} from "lucide-react"

import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
import { PermissionSelector } from "@/components/permission-selector"
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
  permissionPreset?: string
  perSheetPermissions?: Record<string, string[]>
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
    permissionPreset: "",
    perSheetPermissions: {} as Record<string, string[]>,
  })

  const [connectedSheets, setConnectedSheets] = useState<any[]>([])
  const [sheetsWithColumns, setSheetsWithColumns] = useState<any[]>([])
  const [presets, setPresets] = useState<any[]>([])
  const [newPresetName, setNewPresetName] = useState("")
  const [isEditMode, setIsEditMode] = useState(false)

  // Inline editing allowed columns state
  const [editingAllowedColsUser, setEditingAllowedColsUser] = useState<
    string | null
  >(null)
  const [tempAllowedColsValue, setTempAllowedColsValue] = useState<string>("")

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      const currentUsername = (session?.user as any)?.username || session?.user?.name
      if (currentUsername !== "SabaAdmin") {
        toast.error(
          "Access Denied: This route is specially bound to only SabaAdmin."
        )
        router.push("/dashboard")
        return
      }
      fetchUsers()
      fetchConnectedSheets()
      fetchPresets()
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

  const fetchConnectedSheets = async () => {
    try {
      const res = await fetch("/api/connected-sheets")
      if (!res.ok) throw new Error("Failed to load connected sheets")
      const data = await res.json()
      setConnectedSheets(data.connectedSheets || [])

      // Now fetch columns for each sheet
      const sheetsData = []
      for (const sheet of data.connectedSheets || []) {
        try {
          const sRes = await fetch(
            `/api/students?spreadsheetId=${sheet.spreadsheetId}`
          )
          if (sRes.ok) {
            const sData = await sRes.json()
            sheetsData.push({
              id: sheet.spreadsheetId,
              title: sheet.title,
              columns: sData.columns || [],
            })
          }
        } catch (err) {
          console.error(
            `Failed to fetch columns for sheet ${sheet.title}:`,
            err
          )
        }
      }
      setSheetsWithColumns(sheetsData)
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch connected sheets.")
    }
  }

  const fetchPresets = async () => {
    try {
      const res = await fetch("/api/permission-presets")
      if (!res.ok) throw new Error("Failed to load presets")
      const data = await res.json()
      setPresets(data.presets || [])
    } catch (err: any) {
      console.error("Failed to fetch presets:", err)
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeActionId, setActiveActionId] = useState<string | null>(null)

  // Handles creating or updating a user account
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !newUser.username ||
      !newUser.displayName ||
      (!isEditMode && !newUser.password) || // Password required only for new users
      !newUser.role
    ) {
      toast.error("Required fields are missing.")
      return
    }

    setIsSubmitting(true)
    const promise = async () => {
      let currentPresetId = newUser.permissionPreset

      // Save preset if name is provided
      if (newPresetName.trim()) {
        try {
          const presetRes = await fetch("/api/permission-presets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newPresetName.trim(),
              permissions: newUser.perSheetPermissions,
            }),
          })
          if (presetRes.ok) {
            const presetData = await presetRes.json()
            currentPresetId = presetData.preset?.id || currentPresetId
            toast.success(`Preset "${newPresetName}" saved!`)
            fetchPresets() // Refresh presets list
          } else {
            console.error("Failed to save preset")
          }
        } catch (err) {
          console.error("Error saving preset:", err)
        }
      }

      const payload = {
        ...newUser,
        permissionPreset: currentPresetId,
        allowedColumns:
          newUser.role === "admin"
            ? "*"
            : newUser.allowedColumns || "Comments,Notes",
      }

      // Remove password if empty in edit mode
      if (isEditMode && !payload.password) {
        delete (payload as any).password
      }

      const url = isEditMode ? `/api/users/${newUser.username}` : "/api/users"
      const method = isEditMode ? "PATCH" : "POST"

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const result = await res.json()
      if (!res.ok)
        throw new Error(
          result.error ||
            `Failed to ${isEditMode ? "update" : "register"} user.`
        )

      setIsAddUserOpen(false)
      setNewUser({
        username: "",
        displayName: "",
        email: "",
        password: "",
        role: "sub-admin",
        allowedColumns: "Comments,Notes",
        permissionPreset: "",
        perSheetPermissions: {},
      })
      fetchUsers()
      return result
    }

    toast.promise(promise(), {
      loading: isEditMode
        ? "Updating user account..."
        : "Creating user account...",
      success: (data) =>
        `Successfully ${isEditMode ? "updated" : "registered"} ${newUser.role}: ${newUser.username}`,
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

  const handleEditUser = (user: User) => {
    setIsEditMode(true)
    setNewUser({
      username: user.username,
      displayName: user.displayName,
      email: user.email || "",
      password: "",
      role: user.role,
      allowedColumns: user.allowedColumns,
      permissionPreset: user.permissionPreset || "",
      perSheetPermissions: user.perSheetPermissions || {},
    })
    setIsAddUserOpen(true)
  }

  const handleOpenCreateModal = () => {
    setIsEditMode(false)
    setNewUser({
      username: "",
      displayName: "",
      email: "",
      password: "",
      role: "sub-admin",
      allowedColumns: "Comments,Notes",
      permissionPreset: "",
      perSheetPermissions: {},
    })
    setIsAddUserOpen(true)
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase()))
  )

  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      accessorKey: "username",
      header: "Username",
      cell: ({ row }) => <span className="font-bold">{row.original.username}</span>,
    },
    {
      accessorKey: "displayName",
      header: "Display Name",
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email || "-",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge
          variant={row.original.role === "admin" ? "default" : "secondary"}
          className="capitalize"
        >
          {row.original.role || "sub-admin"}
        </Badge>
      ),
    },
    {
      accessorKey: "allowedColumns",
      header: "Permissions",
      cell: ({ row }) => (
        <Badge variant="outline" className="px-2.5 py-1 font-mono text-xs">
          {row.original.role === "admin" ||
          !row.original.allowedColumns ||
          row.original.allowedColumns === "*" ||
          row.original.allowedColumns.toLowerCase() === "none"
            ? "All"
            : row.original.allowedColumns}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) =>
        row.original.createdAt
          ? format(new Date(row.original.createdAt), "MMM d, yyyy HH:mm")
          : "-",
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive === "TRUE" ? "default" : "destructive"}
          className="rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase"
        >
          {row.original.isActive === "TRUE" ? "Active" : "Suspended"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const user = row.original
        return (
          <div className="flex justify-end gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => handleEditUser(user)}
                    disabled={activeActionId === user.username}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit User</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => handleEditUser(user)}
                    disabled={activeActionId === user.username}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>View User</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => handleResetPassword(user.username)}
                    disabled={activeActionId === user.username}
                  >
                    {activeActionId === user.username ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Key className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset Password</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => {
                      toast.info("Delete functionality not implemented yet.")
                    }}
                    disabled={activeActionId === user.username || user.username === "SabaAdmin"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete User</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )
      },
    },
  ], [handleEditUser, handleResetPassword, activeActionId])

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

  const currentUsername = (session?.user as any)?.username || session?.user?.name
  if (currentUsername !== "SabaAdmin") {
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
            This route is specially bound to only SabaAdmin. You do not have permission to view or modify system accounts.
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
      >
        <Button onClick={() => handleOpenCreateModal()}>
          <UserPlus className="h-4 w-4" />
          Create Account
        </Button>
      </PageHeader>

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
          <div className="p-6">
            <DataTable columns={columns} data={filteredUsers} />
          </div>
        )}
      </div>

      {/* Modal Dialog for User Creation */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen} name={isEditMode ? "editUser" : "createUser"}>
        <DialogContent className="max-w-4xl rounded-3xl">
          <DialogHeader className="sticky top-0 z-10 border-b border-border bg-popover p-4 sm:p-6">
            <DialogTitle className="text-xl font-extrabold">
              {isEditMode
                ? "Edit User Account"
                : "Create Admin or Sub-Admin Account"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {isEditMode
                ? "Update details for this account."
                : "Register new administrator or restricted sub-administrator."}
            </p>
          </DialogHeader>

          <form onSubmit={handleCreateUserSubmit}>
            <div className="max-h-[65vh] overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Username */}
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
                  disabled={isEditMode}
                />
              </div>

              {/* Display Name */}
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
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Email */}
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

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  {isEditMode ? "New Password (Optional)" : "Login Password *"}
                </label>
                <InputGroup className="h-10">
                  <InputGroupInput
                    type={showPassword ? "text" : "password"}
                    placeholder={
                      isEditMode
                        ? "Leave blank to keep current"
                        : "Create secure password"
                    }
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

                {newUser.password && (
                  <PasswordStrength
                    password={newUser.password}
                    className="mt-2"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Role */}
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
              <div></div>
            </div>

            {newUser.role === "sub-admin" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Column Permissions
                </label>
                <PermissionSelector
                  sheets={sheetsWithColumns}
                  value={newUser.perSheetPermissions}
                  onChange={(permissions) =>
                    setNewUser((prev) => ({
                      ...prev,
                      perSheetPermissions: permissions,
                    }))
                  }
                  presets={presets}
                  onPresetSelect={(presetId) => {
                    const preset = presets.find((p) => p.id === presetId)
                    if (preset) {
                      setNewUser((prev) => ({
                        ...prev,
                        perSheetPermissions: preset.permissions,
                        permissionPreset: preset.id,
                      }))
                    }
                  }}
                />

                <div className="mt-4 space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Save as Preset Name (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Sub-Admin Default"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            )}

            </div>
            
            <div className="flex justify-end gap-3 border-t border-border bg-popover p-4 pt-4 sm:p-6">
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsAddUserOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isSubmitting ||
                  (!isEditMode
                    ? !isStrongPassword(newUser.password)
                    : newUser.password
                      ? !isStrongPassword(newUser.password)
                      : false)
                }
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isEditMode ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <UserPlus className="h-4 w-4" />
                )}
                {isEditMode ? "Save Changes" : "Create Account"}
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
