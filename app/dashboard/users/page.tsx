"use client"

import React, { useState, useEffect, Suspense, useMemo } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTabUrlSync } from "@/hooks/useTabUrlSync"
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
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card"

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
  DialogFooter,
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
import {
  Alert,
  AlertTitle,
  AlertDescription,
} from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/utils"

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
  isActive?: string
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
  const { data: session, status: sessionStatus, update: updateSession } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Use only the canonical username field — never fall back to display name
  const currentUsername = (session?.user as any)?.username as string | undefined
  const currentUserRole = (session?.user as any)?.role as string | undefined

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

  const resetPasswordSchema = z.object({
    newPassword: z
      .string()
      .min(1, "Password is required")
      .refine(isStrongPassword, {
        message: "Password must be at least 8 chars with uppercase, number & symbol",
      }),
    showPassword: z.boolean().optional(),
  })
  type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", showPassword: false },
    mode: "onTouched",
  })

  // Tab inside the reset-password dialog — kept in sync with the URL.
  // Industry convention: camelCase param key → ?resetPassword=open&tab=directChange
  const [resetPasswordTab, setResetPasswordTab] = useState<string>(
    () => searchParams.get("tab") ?? "direct"
  )
  useTabUrlSync(resetPasswordTab, "tab", isResetPasswordOpen)

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
        isActive: z.string().optional(),
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
      isActive: "TRUE",
    },
    mode: "onTouched",
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
      const urole = (session?.user as any)?.role as string | undefined
      if (urole !== "admin") {
        toast.error("Access Denied: This route is specially bound to admins.")
        router.push("/dashboard")
        return
      }
      fetchUsers()
      fetchConnectedSheets()
      fetchPresets()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus])

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
      const res = await fetch("/api/users", { cache: "no-store" })
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
      // Refresh the session JWT so header immediately shows the new displayName
      if (isEditMode && data.username?.toLowerCase() === currentUsername?.toLowerCase()) {
        await updateSession({ displayName: data.displayName })
      }
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
    resetPasswordForm.reset({ newPassword: "", showPassword: false })
    setIsResetPasswordOpen(true)
  }



  const handleSendOtpEmail = async () => {
    if (!resetPasswordUser || !resetPasswordUser.email) return

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
    })
  }

  const handleDeleteUser = async (username: string) => {
    const confirmDelete = window.confirm(
      `Are you absolutely sure you want to permanently delete user account: "${username}"?\nThis action is irreversible and will be logged.`
    )
    if (!confirmDelete) return

    setActiveActionId(username)
    const promise = async () => {
      const res = await fetch(`/api/users/${username}`, {
        method: "DELETE",
      })

      const result = await res.json()
      if (!res.ok)
        throw new Error(result.error || "Failed to delete user account.")

      fetchUsers()
      return result
    }

    toast.promise(promise(), {
      loading: `Deleting user account: ${username}...`,
      success: `User account "${username}" has been permanently deleted.`,
      error: (err) => err.message || "Failed to delete user account.",
      finally: () => setActiveActionId(null),
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
      isActive: user.isActive,
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
      isActive: user.isActive,
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
      isActive: "TRUE",
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
        cell: ({ row }) => {
          const user = row.original
          const avatarUrl = getAvatarUrl(user.username, user.role)
          const initials = user.displayName
            ? user.displayName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : user.username.slice(0, 2).toUpperCase()
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={avatarUrl} alt={user.displayName} />
                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">{user.displayName}</span>
            </div>
          )
        },
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
        cell: ({ row }) => {
          const user = row.original
          const isAdmin =
            user.role === "admin" ||
            !user.allowedColumns ||
            user.allowedColumns === "*"
          const presetName = presets.find(
            (p) => p.id === user.permissionPreset
          )?.name
          const cols = isAdmin
            ? ["All Columns"]
            : user.allowedColumns
              ? user.allowedColumns.split(",").map((c) => c.trim())
              : []
          return (
            <HoverCard openDelay={100} closeDelay={80}>
              <HoverCardTrigger asChild>
                <Badge
                  variant="outline"
                  className="cursor-help font-mono text-tiny"
                >
                  {isAdmin
                    ? "All Access"
                    : presetName
                      ? presetName
                      : `${cols.length} col${cols.length !== 1 ? "s" : ""}`}
                </Badge>
              </HoverCardTrigger>
              <HoverCardContent
                side="top"
                align="start"
                className="w-56 space-y-2 p-3"
              >
                {presetName && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-tiny font-bold uppercase tracking-widest text-muted-foreground">
                      Preset
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {presetName}
                    </Badge>
                  </div>
                )}
                <div>
                  <span className="text-tiny font-bold uppercase tracking-widest text-muted-foreground">
                    {isAdmin ? "Access" : "Allowed Columns"}
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {cols.map((col) => (
                      <Badge
                        key={col}
                        variant="outline"
                        className="text-tiny font-mono"
                      >
                        {col}
                      </Badge>
                    ))}
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>
          )
        },
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
            className="text-xs font-bold tracking-wider uppercase"
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
          const isSelf =
            user.username.toLowerCase() === currentUsername?.toLowerCase()
          const isTargetAdminOrSabaAdmin =
            user.role === "admin" || user.username.toLowerCase() === "sabaadmin"
          const cannotModify =
            currentUserRole === "admin" &&
            currentUsername !== "SabaAdmin" &&
            !isSelf &&
            isTargetAdminOrSabaAdmin

          return (
            <div className="flex justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon-xs"
                      onClick={() => handleEditUser(user)}
                      disabled={
                        activeActionId === user.username || cannotModify
                      }
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
                      disabled={
                        activeActionId === user.username || cannotModify
                      }
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
                      onClick={() => handleDeleteUser(user.username)}
                      disabled={
                        activeActionId === user.username ||
                        user.username?.toLowerCase() === "sabaadmin" ||
                        cannotModify ||
                        isSelf
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
    [
      handleEditUser,
      handleViewUser,
      handleOpenResetPassword,
      handleDeleteUser,
      activeActionId,
      currentUsername,
      currentUserRole,
      presets,
    ]
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
            This route is specially bound to admins. You do not have permission
            to view or modify system accounts.
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

      {/* URL pattern: ?userModal=open — camelCase key, stable name */}
      <Dialog
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        name="userModal"
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
            noValidate
          >
            {isViewMode ? (
              <div className="space-y-5 overflow-y-auto p-5">
                {/* Identity Hero Card */}
                <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-card to-card/60 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                        <Avatar className="h-14 w-14 rounded-xl border border-border">
                          <AvatarImage
                            src={getAvatarUrl(
                              watch("username") || "",
                              watch("role") || ""
                            )}
                            alt={watch("displayName")}
                          />
                          <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-lg font-bold">
                            {watch("displayName")?.substring(0, 2).toUpperCase() || "US"}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 z-10 h-3.5 w-3.5 rounded-full border-2 border-card ${
                            watch("isActive") === "TRUE" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                      </div>
                      <div>
                        <h4 className="text-base font-bold leading-tight text-foreground">
                          {watch("displayName")}
                        </h4>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                          @{watch("username")}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge
                        variant={watch("isActive") === "TRUE" ? "default" : "destructive"}
                        className={
                          watch("isActive") === "TRUE"
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                            : "border border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                        }
                      >
                        <span
                          className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
                            watch("isActive") === "TRUE" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {watch("isActive") === "TRUE" ? "Active" : "Suspended"}
                      </Badge>
                      <Badge
                        variant={watch("role") === "admin" ? "default" : "secondary"}
                        className="capitalize text-[10px] tracking-wide"
                      >
                        {watch("role") === "admin" ? "⚡ Admin" : "🔒 Sub-Admin"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3.5">
                    <span className="text-tiny font-bold uppercase tracking-widest text-muted-foreground">
                      Username
                    </span>
                    <p className="font-mono text-sm font-semibold text-foreground">
                      {watch("username")}
                    </p>
                  </div>
                  <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3.5">
                    <span className="text-tiny font-bold uppercase tracking-widest text-muted-foreground">
                      Display Name
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {watch("displayName")}
                    </p>
                  </div>
                  <div className="space-y-1 rounded-lg border border-border bg-muted/30 p-3.5 sm:col-span-2">
                    <span className="text-tiny font-bold uppercase tracking-widest text-muted-foreground">
                      Email Address
                    </span>
                    <p className="text-sm font-semibold text-foreground">
                      {watch("email") ? (
                        <a
                          href={`mailto:${watch("email")}`}
                          className="text-primary underline underline-offset-2 hover:opacity-80"
                        >
                          {watch("email")}
                        </a>
                      ) : (
                        <span className="font-normal italic text-muted-foreground">Not provided</span>
                      )}
                    </p>
                  </div>
                </div>
                {watchedRole === "sub-admin" && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                      <span className="text-tiny font-bold uppercase tracking-widest text-muted-foreground">
                        Sheet &amp; Column Permissions
                      </span>
                      {watch("permissionPreset") && (
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {presets.find((p) => p.id === watch("permissionPreset"))?.name ?? "Custom Preset"}
                        </Badge>
                      )}
                    </div>
                    <PermissionSelector
                      sheets={sheetsWithColumns}
                      value={watch("perSheetPermissions") || {}}
                      onChange={() => {}}
                      presets={presets}
                      onPresetSelect={() => {}}
                      disabled={true}
                    />
                  </div>
                )}
              </div>
            ) : (
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

                          <PasswordStrength
                            password={watchedPassword || ""}
                            className="mt-2"
                          />
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
                            (currentUsername !== "SabaAdmin" &&
                              currentUserRole === "admin")
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
            )}

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

      {/* URL pattern: ?resetPassword=open&tab=direct | tab=otp */}
      <Dialog
        open={isResetPasswordOpen}
        onOpenChange={(open) => {
          setIsResetPasswordOpen(open)
          if (!open) setResetPasswordTab("direct")
        }}
        name="resetPassword"
      >
        <DialogContent>
          <DialogHeader>
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

          {/* Controlled Tabs — value kept in sync with ?tab=direct | tab=otp */}
          <Tabs
            value={resetPasswordTab}
            onValueChange={setResetPasswordTab}
            className="w-fit m-2"
          >
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="direct">Direct Password</TabsTrigger>
              <TabsTrigger value="otp">OTP Reset Link</TabsTrigger>
            </TabsList>

            <TabsContent value="direct">
              <Card className="border ring-0 shadow-none">
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Direct Password Change</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Update the password immediately. The user will be required to use this new
                      password on their next login.
                    </p>
                  </div>

                  <form
                    noValidate
                    onSubmit={resetPasswordForm.handleSubmit(async (values) => {
                      if (!resetPasswordUser) return
                      const promise = async () => {
                        const res = await fetch(
                          `/api/users/${resetPasswordUser.username}`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ password: values.newPassword }),
                          }
                        )
                        const result = await res.json()
                        if (!res.ok)
                          throw new Error(result.error || "Failed to reset password.")
                        setIsResetPasswordOpen(false)
                        fetchUsers()
                        return result
                      }
                      toast.promise(promise(), {
                        loading: `Updating password for ${resetPasswordUser.username}...`,
                        success: "Password updated successfully.",
                        error: (err) => err.message || "Failed to reset password.",
                      })
                    })}
                    className="space-y-4"
                  >
                    <Controller
                      name="newPassword"
                      control={resetPasswordForm.control}
                      render={({ field }) => (
                        <Field data-invalid={!!resetPasswordForm.formState.errors.newPassword}>
                          <FieldLabel className="text-tiny font-bold uppercase tracking-wider text-muted-foreground">
                            New Secure Password *
                          </FieldLabel>
                          <InputGroup>
                            <InputGroupInput
                              {...field}
                              type={
                                resetPasswordForm.watch("showPassword") ? "text" : "password"
                              }
                              placeholder="Enter new secure password"
                              autoComplete="new-password"
                            />
                            <InputGroupAddon align="inline-end" className="flex items-center gap-1">
                              <InputGroupButton
                                size="icon-xs"
                                type="button"
                                title="Generate Secure Password"
                                onClick={() => {
                                  const pw = generateSecurePassword()
                                  field.onChange(pw)
                                  resetPasswordForm.setValue("showPassword", true)
                                  navigator.clipboard.writeText(pw)
                                  toast.success("Secure password generated & copied!")
                                }}
                              >
                                <Sparkles className="size-4 text-primary" />
                              </InputGroupButton>
                              <InputGroupButton
                                size="icon-xs"
                                type="button"
                                onClick={() =>
                                  resetPasswordForm.setValue(
                                    "showPassword",
                                    !resetPasswordForm.watch("showPassword")
                                  )
                                }
                              >
                                {resetPasswordForm.watch("showPassword") ? (
                                  <EyeOff className="size-4" />
                                ) : (
                                  <Eye className="size-4" />
                                )}
                              </InputGroupButton>
                            </InputGroupAddon>
                          </InputGroup>
                          <PasswordStrength
                            password={field.value || ""}
                            className="mt-2"
                          />
                          <FieldError
                            errors={[resetPasswordForm.formState.errors.newPassword]}
                          />
                        </Field>
                      )}
                    />

                    <Button
                      type="submit"
                      disabled={resetPasswordForm.formState.isSubmitting}
                    >
                      {resetPasswordForm.formState.isSubmitting ? (
                        <Spinner className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Update Password Immediately
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="otp">
              <Card className="border ring-0 shadow-none">
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Trigger OTP Password Reset Link</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Generate a temporary OTP code and dispatch a secure reset link directly to
                      the user's registered email address.
                    </p>
                  </div>

                  {!resetPasswordUser?.email ? (
                    <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                      <ShieldAlert className="size-4" />
                      <AlertTitle className="font-bold">Email Not Configured</AlertTitle>
                      <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
                        This account has no registered email address. Use the Direct
                        Password tab instead.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      <Card className="border shadow-none">
                        <CardContent className="flex items-center justify-between p-3">
                          <span className="text-tiny font-bold uppercase tracking-wider text-muted-foreground">
                            Destination
                          </span>
                          <Badge variant="outline" className="font-mono">
                            {resetPasswordUser.email}
                          </Badge>
                        </CardContent>
                      </Card>
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleSendOtpEmail}
                        disabled={resetPasswordForm.formState.isSubmitting}
                      >
                        <Spinner
                          className={`h-4 w-4 ${
                            resetPasswordForm.formState.isSubmitting
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />
                        Send Reset Link Email
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="destructive"
              type="button"
              onClick={() => setIsResetPasswordOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
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
