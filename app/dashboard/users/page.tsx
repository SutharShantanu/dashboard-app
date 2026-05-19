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
  Check,
  X,
  Key,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
  Pencil,
  Trash2,
  Sparkles,
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
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { z } from "zod"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Field, FieldLabel, FieldError } from "@/components/ui/field"

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

interface UserFormValues {
  username: string
  displayName: string
  email: string
  password?: string
  role: string
  allowedColumns?: string
  permissionPreset?: string
  perSheetPermissions?: Record<string, string[]>
}

function generateSecurePassword(): string {
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lowercase = "abcdefghijklmnopqrstuvwxyz"
  const numbers = "0123456789"
  const specials = "!@#$%^&*()_+~`|}{[]:;?><,./-="

  let password = ""
  password += uppercase[Math.floor(Math.random() * uppercase.length)]
  password += lowercase[Math.floor(Math.random() * lowercase.length)]
  password += numbers[Math.floor(Math.random() * numbers.length)]
  password += specials[Math.floor(Math.random() * specials.length)]

  const allChars = uppercase + lowercase + numbers + specials
  for (let i = 0; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)]
  }

  return password
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("")
}

function UsersDirectoryContent() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()

  const currentUsername =
    (session?.user as any)?.username || session?.user?.name
  const currentUserRole = (session?.user as any)?.role

  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true)
  const [userSearchQuery, setUserSearchQuery] = useState<string>("")

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isViewMode, setIsViewMode] = useState(false)

  // Reset Password Dialog State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState<boolean>(false)
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)
  const [newResetPassword, setNewResetPassword] = useState<string>("")
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false)
  const [isResetSubmitting, setIsResetSubmitting] = useState<boolean>(false)

  const schema = useMemo(() => {
    return z
      .object({
        username: z.string().min(1, "Unique Username is required"),
        displayName: z.string().min(1, "Display Name is required"),
        email: z.string().email("Invalid email address").or(z.literal("")),
        password: z.string().optional(),
        role: z.string().min(1, "Role is required"),
        allowedColumns: z.string().optional(),
        permissionPreset: z.string().optional(),
        perSheetPermissions: z
          .record(z.string(), z.array(z.string()))
          .optional()
          .default({}),
      })
      .superRefine((data, ctx) => {
        if (!isEditMode) {
          if (!data.password) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["password"],
              message: "Password is required",
            })
          } else if (!isStrongPassword(data.password)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["password"],
              message: "Password must meet all security requirements",
            })
          }
        } else {
          if (data.password && !isStrongPassword(data.password)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["password"],
              message: "Password must meet all security requirements",
            })
          }
        }
      })
  }, [isEditMode])

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: "",
      displayName: "",
      email: "",
      password: "",
      role: "sub-admin",
      allowedColumns: "Comments,Notes",
      permissionPreset: "",
      perSheetPermissions: {},
    },
  })

  const watchedRole = watch("role")
  const watchedPassword = watch("password")

  const [connectedSheets, setConnectedSheets] = useState<any[]>([])
  const [sheetsWithColumns, setSheetsWithColumns] = useState<any[]>([])
  const [presets, setPresets] = useState<any[]>([])
  const [newPresetName, setNewPresetName] = useState("")

  // Inline editing allowed columns state
  const [editingAllowedColsUser, setEditingAllowedColsUser] = useState<
    string | null
  >(null)
  const [tempAllowedColsValue, setTempAllowedColsValue] = useState<string>("")

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      const currentUsername =
        (session?.user as any)?.username || session?.user?.name
      const currentUserRole = (session?.user as any)?.role
      if (currentUsername !== "SabaAdmin" && currentUserRole !== "admin") {
        toast.error(
          "Access Denied: This route is specially bound to admins."
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
    const handleOpenModal = () => {
      setIsEditMode(false)
      setIsViewMode(false)
      setIsAddUserOpen(true)
    }
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
  const onSubmit = async (data: UserFormValues) => {
    if (isViewMode) return
    setIsSubmitting(true)
    const promise = async () => {
      let currentPresetId = data.permissionPreset

      // Save preset if name is provided
      if (newPresetName.trim()) {
        try {
          const presetRes = await fetch("/api/permission-presets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: newPresetName.trim(),
              permissions: data.perSheetPermissions,
            }),
          })
          if (presetRes.ok) {
            const presetData = await presetRes.json()
            currentPresetId = presetData.preset?.id || currentPresetId
            toast.success(`Preset "${newPresetName}" saved!`)
            fetchPresets() // Refresh presets list
            setNewPresetName("")
          } else {
            console.error("Failed to save preset")
          }
        } catch (err) {
          console.error("Error saving preset:", err)
        }
      }

      const payload = {
        ...data,
        permissionPreset: currentPresetId,
        allowedColumns:
          data.role === "admin" ? "*" : data.allowedColumns || "Comments,Notes",
      }

      // Remove password if empty in edit mode
      if (isEditMode && !payload.password) {
        delete (payload as any).password
      }

      const url = isEditMode ? `/api/users/${data.username}` : "/api/users"
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
      reset({
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
      success: () =>
        `Successfully ${isEditMode ? "updated" : "registered"} ${data.role}: ${data.username}`,
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
  const handleOpenResetPassword = (user: User) => {
    setResetPasswordUser(user)
    setNewResetPassword("")
    setShowResetPassword(false)
    setIsResetPasswordOpen(true)
  }

  const handleDirectPasswordReset = async () => {
    if (!resetPasswordUser) return
    if (!newResetPassword.trim()) {
      toast.error("Password is required.")
      return
    }
    if (!isStrongPassword(newResetPassword)) {
      toast.error("Password does not meet the strength requirements.")
      return
    }

    setIsResetSubmitting(true)
    const promise = async () => {
      const res = await fetch(`/api/users/${resetPasswordUser.username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newResetPassword.trim() }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to reset password.")

      setIsResetPasswordOpen(false)
      fetchUsers()
      return result
    }

    toast.promise(promise(), {
      loading: `Updating password for ${resetPasswordUser.username}...`,
      success: "Password updated successfully.",
      error: (err) => err.message || "Failed to reset password.",
      finally: () => setIsResetSubmitting(false),
    })
  }

  const handleSendOtpEmail = async () => {
    if (!resetPasswordUser || !resetPasswordUser.email) return

    setIsResetSubmitting(true)
    const promise = async () => {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetPasswordUser.email }),
      })

      const result = await res.json()
      if (!res.ok)
        throw new Error(result.error || "Failed to send reset email.")

      setIsResetPasswordOpen(false)
      return result
    }

    toast.promise(promise(), {
      loading: `Sending reset link to ${resetPasswordUser.email}...`,
      success: `Reset link dispatched to ${resetPasswordUser.email}.`,
      error: (err) => err.message || "Failed to send email.",
      finally: () => setIsResetSubmitting(false),
    })
  }

  const handleEditUser = (user: User) => {
    setIsEditMode(true)
    setIsViewMode(false)
    reset({
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

  const handleViewUser = (user: User) => {
    setIsEditMode(false)
    setIsViewMode(true)
    reset({
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
    setIsViewMode(false)
    reset({
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

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "username",
        header: "Username",
        cell: ({ row }) => (
          <span className="font-bold">{row.original.username}</span>
        ),
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
            variant={
              row.original.isActive === "TRUE" ? "default" : "destructive"
            }
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
          const isSelf = user.username.toLowerCase() === currentUsername?.toLowerCase();
          const isTargetAdminOrSabaAdmin = user.role === "admin" || user.username.toLowerCase() === "sabaadmin";
          const cannotModify = currentUserRole === "admin" && currentUsername !== "SabaAdmin" && !isSelf && isTargetAdminOrSabaAdmin;

          return (
            <div className="flex justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() => handleEditUser(user)}
                      disabled={activeActionId === user.username || cannotModify}
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
                      onClick={() => handleViewUser(user)}
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
                      onClick={() => handleOpenResetPassword(user)}
                      disabled={activeActionId === user.username || cannotModify}
                    >
                      {activeActionId === user.username ? (
                        <Spinner className="h-3.5 w-3.5" />
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
                      variant="destructive"
                      size="icon-xs"
                      onClick={() => {
                        toast.info("Delete functionality not implemented yet.")
                      }}
                      disabled={
                        activeActionId === user.username ||
                        user.username?.toLowerCase() === "sabaadmin" ||
                        cannotModify
                      }
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
    ],
    [handleEditUser, handleViewUser, handleOpenResetPassword, activeActionId, currentUsername, currentUserRole]
  )

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-10 w-10 text-primary" />
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            Verifying administrative access...
          </p>
        </div>
      </div>
    )
  }

  if (currentUsername !== "SabaAdmin" && currentUserRole !== "admin") {
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
            This route is specially bound to admins. You do not have
            permission to view or modify system accounts.
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
          Refresh
        </Button>
      </PageHeader>

      {/* Users Grid Table */}
      <Card className="overflow-hidden">
        <CardContent>
          {loadingUsers ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Spinner className="h-8 w-8 text-primary" />
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
            <>
              <DataTable columns={columns} data={filteredUsers} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Modal Dialog for User Creation */}
      <Dialog
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        name={isViewMode ? "viewUser" : isEditMode ? "editUser" : "createUser"}
      >
        <DialogContent>
          <DialogHeader className="sticky top-0 z-10 border-b border-border">
            <DialogTitle className="text-xl font-extrabold">
              {isViewMode
                ? "User Account Details"
                : isEditMode
                  ? "Edit User Account"
                  : "Create Admin or Sub-Admin Account"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {isViewMode
                ? "View administrative access permissions and settings."
                : isEditMode
                  ? "Update details for this account."
                  : "Register new administrator or restricted sub-administrator."}
            </p>
          </DialogHeader>

          <form
            onSubmit={
              isViewMode ? (e) => e.preventDefault() : handleSubmit(onSubmit)
            }
          >
            <div className="space-y-6 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Username */}
                <Controller
                  name="username"
                  control={control}
                  render={({ field }) => (
                    <Field data-invalid={!!errors.username}>
                      <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Unique Username *
                      </FieldLabel>
                      <Input
                        {...field}
                        type="text"
                        placeholder="e.g. rahul_sub"
                        disabled={isEditMode || isViewMode}
                      />
                      <FieldError errors={[errors.username]} />
                    </Field>
                  )}
                />

                {/* Display Name */}
                <Controller
                  name="displayName"
                  control={control}
                  render={({ field }) => (
                    <Field data-invalid={!!errors.displayName}>
                      <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Display Name *
                      </FieldLabel>
                      <Input
                        {...field}
                        type="text"
                        placeholder="e.g. Rahul Sharma (Advisor)"
                        disabled={isViewMode}
                      />
                      <FieldError errors={[errors.displayName]} />
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Email */}
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <Field
                      data-invalid={!!errors.email}
                      className={isViewMode ? "md:col-span-2" : ""}
                    >
                      <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Email Address
                      </FieldLabel>
                      <Input
                        {...field}
                        type="email"
                        placeholder="e.g. rahul@domain.com"
                        disabled={isViewMode}
                      />
                      <FieldError errors={[errors.email]} />
                    </Field>
                  )}
                />

                {/* Password */}
                {!isViewMode && !isEditMode && (
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <Field data-invalid={!!errors.password}>
                        <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                          {isEditMode
                            ? "New Password (Optional)"
                            : "Login Password *"}
                        </FieldLabel>
                        <InputGroup>
                          <InputGroupInput
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder={
                              isEditMode
                                ? "Leave blank to keep current"
                                : "Create secure password"
                            }
                          />
                          <InputGroupAddon
                            align="inline-end"
                            className="flex items-center gap-1"
                          >
                            <InputGroupButton
                              size="icon-xs"
                              type="button"
                              onClick={() => {
                                const securePw = generateSecurePassword()
                                setValue("password", securePw)
                                setShowPassword(true)
                                navigator.clipboard.writeText(securePw)
                                toast.success(
                                  "Secure password generated and copied to clipboard!"
                                )
                              }}
                              title="Generate Secure Password"
                            >
                              <Sparkles className="size-4 text-primary" />
                            </InputGroupButton>
                            <InputGroupButton
                              size="icon-xs"
                              type="button"
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

                        {watchedPassword && (
                          <PasswordStrength
                            password={watchedPassword}
                            className="mt-2"
                          />
                        )}
                        <FieldError errors={[errors.password]} />
                      </Field>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Role */}
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <Field data-invalid={!!errors.role}>
                      <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Role *
                      </FieldLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={
                          isViewMode ||
                          watch("username")?.toLowerCase() === "sabaadmin" ||
                          (currentUsername !== "SabaAdmin" && currentUserRole === "admin")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">
                            Admin (Full Access)
                          </SelectItem>
                          <SelectItem value="sub-admin">
                            Sub-Admin (Restricted)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FieldError errors={[errors.role]} />
                    </Field>
                  )}
                />
                <div></div>
              </div>

              {watchedRole === "sub-admin" && (
                <div className="space-y-6">
                  <Controller
                    name="perSheetPermissions"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                          Column Permissions
                        </FieldLabel>
                        <PermissionSelector
                          sheets={sheetsWithColumns}
                          value={field.value}
                          onChange={(permissions) => {
                            field.onChange(permissions)
                            setValue("permissionPreset", "")
                          }}
                          presets={presets}
                          onPresetSelect={(presetId) => {
                            const preset = presets.find(
                              (p) => p.id === presetId
                            )
                            if (preset) {
                              setValue(
                                "perSheetPermissions",
                                preset.permissions
                              )
                              setValue("permissionPreset", preset.id)
                            }
                          }}
                          disabled={isViewMode}
                        />
                      </Field>
                    )}
                  />

                  {!isViewMode && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                        Save as Preset Name (Optional)
                      </label>
                      <Input
                        type="text"
                        placeholder="e.g. Sub-Admin Default"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border bg-popover p-4 pt-4 sm:p-6">
              {isViewMode ? (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                >
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsAddUserOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Spinner className="h-4 w-4" />
                    ) : isEditMode ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    {isEditMode ? "Save Changes" : "Create Account"}
                  </Button>
                </>
              )}
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Premium Credentials Management Dialog */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Key className="h-5 w-5 text-primary" />
              Reset Password & Access Options
            </DialogTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Manage credentials and secure access links for account{" "}
              <span className="font-bold text-foreground">
                {resetPasswordUser?.username}
              </span>
              .
            </p>
          </DialogHeader>

          <Tabs defaultValue="direct" className="mt-4 w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="direct">Direct Password</TabsTrigger>
              <TabsTrigger value="otp">OTP Reset Link</TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-4">
              <div className="relative space-y-4 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/20">
                <div className="absolute top-0 left-0 h-full w-1 bg-primary" />
                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    Direct Password Change
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Update the password immediately. The user will be required
                    to use this new password on their next login.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      New Secure Password *
                    </label>
                    <InputGroup>
                      <InputGroupInput
                        type={showResetPassword ? "text" : "password"}
                        value={newResetPassword}
                        onChange={(e) => setNewResetPassword(e.target.value)}
                        placeholder="Enter new secure password"
                      />
                      <InputGroupAddon
                        align="inline-end"
                        className="flex items-center gap-1"
                      >
                        <InputGroupButton
                          size="icon-xs"
                          type="button"
                          onClick={() => {
                            const securePw = generateSecurePassword()
                            setNewResetPassword(securePw)
                            setShowResetPassword(true)
                            navigator.clipboard.writeText(securePw)
                            toast.success(
                              "Secure password generated and copied to clipboard!"
                            )
                          }}
                          title="Generate Secure Password"
                        >
                          <Sparkles className="size-4 text-primary" />
                        </InputGroupButton>
                        <InputGroupButton
                          size="icon-xs"
                          type="button"
                          onClick={() =>
                            setShowResetPassword(!showResetPassword)
                          }
                        >
                          {showResetPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </InputGroupButton>
                      </InputGroupAddon>
                    </InputGroup>
                  </div>

                  {newResetPassword && (
                    <PasswordStrength
                      password={newResetPassword}
                      className="mt-2"
                    />
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleDirectPasswordReset}
                  disabled={
                    isResetSubmitting || !isStrongPassword(newResetPassword)
                  }
                >
                  {isResetSubmitting ? (
                    <Spinner className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Update Password Immediately
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="otp" className="space-y-4">
              <div className="relative space-y-4 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-amber-500/20">
                <div className="absolute top-0 left-0 h-full w-1 bg-amber-500" />
                <div>
                  <h4 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    Trigger OTP Password Reset Link
                  </h4>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Generate a temporary OTP code and dispatch a secure reset
                    link directly to the user's registered email address.
                  </p>
                </div>

                {!resetPasswordUser?.email ? (
                  <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-500">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <span className="font-bold">
                        Email Verification Disabled
                      </span>
                      <p className="mt-0.5 text-muted-foreground">
                        This user account does not have a configured email
                        address. Direct password change must be used.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-2.5 text-xs">
                      <span className="text-muted-foreground">
                        Destination Email:
                      </span>
                      <span className="font-mono font-medium">
                        {resetPasswordUser.email}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendOtpEmail}
                      disabled={isResetSubmitting}
                    >
                      {isResetSubmitting ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                      Send Reset Link Email
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-2 flex justify-end gap-3 border-t border-border pt-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsResetPasswordOpen(false)}
            >
              Cancel
            </Button>
          </div>
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
            <Spinner className="h-10 w-10 text-primary" />
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
