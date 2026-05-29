"use client"

import React, {
  useState,
  useEffect,
  Suspense,
  useMemo,
  useCallback,
} from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTabUrlSync } from "@/hooks/useTabUrlSync"
import { DateCell } from "@/lib/date"
import { toast } from "sonner"
import {
  Search,
  UserPlus,
  Users,
  Check,
  Key,
  ShieldAlert,
  Eye,
  EyeOff,
  RefreshCw,
  Pencil,
  Trash2,
  Sparkles,
  Blend,
  User,
  Type,
  AtSign,
  Mailbox,
  Mars,
  Venus,
  Lock,
  Sheet,
  ExternalLink,
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { PasswordInput } from "@/components/ui/password-input"
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { BadgeDot } from "@/components/ui/badge-dot"
import {
  Item,
  ItemGroup,
  ItemMedia,
  ItemContent,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item"
import { Separator } from "@/components/ui/separator"
import { getAvatarUrl } from "@/lib/utils"
import { CopyButton } from "@/components/ui/copy-button"

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
  gender?: string
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
  gender: string
}


function UsersDirectoryContent() {
  const {
    data: session,
    status: sessionStatus,
    update: updateSession,
  } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Use only the canonical username field — never fall back to display name
  const currentUsername = (session?.user as any)?.username as string | undefined
  const currentUserRole = (session?.user as any)?.role as string | undefined

  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true)
  const [userSearchQuery, setUserSearchQuery] = useState<string>("")

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(
    () =>
      searchParams.get("userModal") === "open" ||
      searchParams.get("editUserDetails") === "open" ||
      searchParams.get("viewUserDetail") === "open"
  )

  const [isEditMode, setIsEditMode] = useState(
    () => searchParams.get("editUserDetails") === "open"
  )
  const [isViewMode, setIsViewMode] = useState(
    () => searchParams.get("viewUserDetail") === "open"
  )

  // Reset Password Dialog State
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState<boolean>(
    () => searchParams.get("resetPassword") === "open"
  )
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null)

  const resetPasswordSchema = z.object({
    newPassword: z
      .string()
      .min(1, "Password is required")
      .refine(isStrongPassword, {
        message:
          "Password must be at least 8 chars with uppercase, number & symbol",
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
        gender: z.string().min(1, "Gender is required"),
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
      gender: "male",
      allowedColumns: "",
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
  const [selectedSheet, setSelectedSheet] = useState("")

  // Inline editing allowed columns state
  const [editingAllowedColsUser, setEditingAllowedColsUser] = useState<
    string | null
  >(null)
  const [tempAllowedColsValue, setTempAllowedColsValue] = useState<string>("")
  useEffect(() => {
    if (isAddUserOpen) {
      if (sheetsWithColumns.length > 0) {
        setSelectedSheet((prev) => prev || sheetsWithColumns[0].id)
      }
    } else {
      setSelectedSheet("")
    }
  }, [isAddUserOpen, sheetsWithColumns])

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

  const handleCloseUserModal = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.delete("userModal")
    params.delete("editUserDetails")
    params.delete("viewUserDetail")
    params.delete("username")
    router.push(`${window.location.pathname}?${params.toString()}`, {
      scroll: false,
    })
    reset()
  }, [router, reset])

  const handleCloseResetPasswordModal = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.delete("resetPassword")
    params.delete("username")
    params.delete("tab")
    router.push(`${window.location.pathname}?${params.toString()}`, {
      scroll: false,
    })
  }, [router])

  const handleOpenCreateModal = useCallback(() => {
    const params = new URLSearchParams(window.location.search)
    params.set("userModal", "open")
    params.delete("username")
    router.push(`${window.location.pathname}?${params.toString()}`, {
      scroll: false,
    })
  }, [router])

  const handleEditUser = useCallback(
    (user: User) => {
      const params = new URLSearchParams(window.location.search)
      params.set("editUserDetails", "open")
      params.set("username", user.username)
      router.push(`${window.location.pathname}?${params.toString()}`, {
        scroll: false,
      })
    },
    [router]
  )

  const handleViewUser = useCallback(
    (user: User) => {
      const params = new URLSearchParams(window.location.search)
      params.set("viewUserDetail", "open")
      params.set("username", user.username)
      router.push(`${window.location.pathname}?${params.toString()}`, {
        scroll: false,
      })
    },
    [router]
  )

  const handleOpenResetPassword = useCallback(
    (user: User) => {
      const params = new URLSearchParams(window.location.search)
      params.set("resetPassword", "open")
      params.set("username", user.username)
      if (!params.get("tab")) {
        params.set("tab", "direct")
      }
      router.push(`${window.location.pathname}?${params.toString()}`, {
        scroll: false,
      })
    },
    [router]
  )

  // Custom event listener for external modal open triggers (e.g., sidebar)
  useEffect(() => {
    const handleOpenModal = () => {
      handleOpenCreateModal()
    }
    window.addEventListener("open_add_user_modal", handleOpenModal)
    return () => {
      window.removeEventListener("open_add_user_modal", handleOpenModal)
    }
  }, [handleOpenCreateModal])

  // Sync URL search params to React states for deep-linking support
  useEffect(() => {
    if (users.length === 0) return

    const userModalParam = searchParams.get("userModal")
    const editUserDetailsParam = searchParams.get("editUserDetails")
    const viewUserDetailParam = searchParams.get("viewUserDetail")
    const usernameParam = searchParams.get("username")

    if (
      userModalParam === "open" ||
      editUserDetailsParam === "open" ||
      viewUserDetailParam === "open"
    ) {
      if (usernameParam) {
        const targetUser = users.find(
          (u) => u.username.toLowerCase() === usernameParam.toLowerCase()
        )
        if (targetUser) {
          const isView = viewUserDetailParam === "open"
          const isEdit = editUserDetailsParam === "open"
          setIsViewMode(isView)
          setIsEditMode(isEdit)
          reset({
            username: targetUser.username,
            displayName: targetUser.displayName,
            email: targetUser.email || "",
            password: "",
            role: targetUser.role,
            gender: targetUser.gender || "male",
            allowedColumns: targetUser.allowedColumns,
            permissionPreset: targetUser.permissionPreset || "",
            perSheetPermissions: targetUser.perSheetPermissions || {},
            isActive: targetUser.isActive,
          })
          setIsAddUserOpen(true)
        }
      } else {
        setIsViewMode(false)
        setIsEditMode(false)
        if (!isAddUserOpen) {
          reset({
            username: "",
            displayName: "",
            email: "",
            password: "",
            role: "sub-admin",
            gender: "male",
            allowedColumns: "",
            permissionPreset: "",
            perSheetPermissions: {},
            isActive: "TRUE",
          })
        }
        setIsAddUserOpen(true)
      }
    } else {
      setIsAddUserOpen(false)
    }
  }, [searchParams, users, reset])

  useEffect(() => {
    if (users.length === 0) return

    const resetPasswordParam = searchParams.get("resetPassword")
    const usernameParam = searchParams.get("username")

    if (resetPasswordParam === "open" && usernameParam) {
      const targetUser = users.find(
        (u) => u.username.toLowerCase() === usernameParam.toLowerCase()
      )
      if (targetUser) {
        setResetPasswordUser(targetUser)
        setIsResetPasswordOpen(true)
      }
    } else {
      setIsResetPasswordOpen(false)
    }
  }, [searchParams, users])

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
              columns: (sData.columns || []).filter(
                (c: string) => c && c.trim() !== ""
              ),
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
        allowedColumns: data.allowedColumns || "",
      }

      // Remove password if empty in edit mode
      if (isEditMode && !payload.password) {
        delete (payload as any).password
      }

      const targetUsername = isEditMode
        ? searchParams.get("username") || data.username
        : data.username
      const url = isEditMode ? `/api/users/${targetUsername}` : "/api/users"
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

      handleCloseUserModal()
      // Refresh the session JWT so header immediately shows the new displayName
      if (
        isEditMode &&
        data.username?.toLowerCase() === currentUsername?.toLowerCase()
      ) {
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

      handleCloseResetPasswordModal()
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
        cell: ({ row }) => <span className="">{row.original.username}</span>,
      },
      {
        accessorKey: "displayName",
        header: "Display Name",
        cell: ({ row }) => {
          const user = row.original
          const avatarUrl = getAvatarUrl(user.username, user.role, user.gender)
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
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} alt={user.displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="font-medium text-foreground">
                {user.displayName}
              </span>
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
            variant={
              row.original.role === "admin" ? "primary-light" : "warning-light"
            }
            className="uppercase"
          >
            {row.original.role || "sub-admin"}
          </Badge>
        ),
      },
      {
        accessorKey: "gender",
        header: "Gender",
        cell: ({ row }) => {
          const gender = row.original.gender || "male"
          return (
            <Badge
              variant="outline"
              className="flex w-fit items-center gap-1.5 capitalize"
            >
              {gender === "female" ? (
                <Venus className="h-3.5 w-3.5 shrink-0" />
              ) : gender === "male" ? (
                <Mars className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <Blend className="h-3.5 w-3.5 shrink-0" />
              )}
              <span>{gender}</span>
            </Badge>
          )
        },
      },
      {
        accessorKey: "allowedColumns",
        header: "Permissions",
        cell: ({ row }) => {
          const user = row.original
          const isAllAccess = user.allowedColumns === "*"
          const presetName = presets.find(
            (p) => p.id === user.permissionPreset
          )?.name

          let cols: string[] = []
          if (isAllAccess) {
            cols = ["All Columns"]
          } else if (
            user.perSheetPermissions &&
            Object.keys(user.perSheetPermissions).length > 0
          ) {
            const allCols = new Set<string>()
            let hasAnySheetAllAccess = false
            Object.values(user.perSheetPermissions).forEach((sheetCols) => {
              if (sheetCols.includes("*")) {
                hasAnySheetAllAccess = true
              } else {
                sheetCols.forEach((c) => {
                  if (c.trim()) allCols.add(c.trim())
                })
              }
            })
            cols = Array.from(allCols)
            if (hasAnySheetAllAccess) {
              cols.unshift("All Columns (Specific Sheets)")
            }
          } else if (user.allowedColumns) {
            cols = user.allowedColumns
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          }

          const hasNoAccess = !isAllAccess && cols.length === 0

          const badgeEl = (
            <Badge
              variant={
                isAllAccess
                  ? "success-light"
                  : hasNoAccess
                    ? "destructive-light"
                    : "info-light"
              }
              className={hasNoAccess ? "font-mono" : "cursor-help font-mono"}
            >
              {isAllAccess
                ? "All Access"
                : hasNoAccess
                  ? "No Access"
                  : presetName
                    ? presetName
                    : `${cols.length} col${cols.length !== 1 ? "s" : ""}`}
            </Badge>
          )

          if (hasNoAccess) {
            return badgeEl
          }

          return (
            <HoverCard openDelay={100} closeDelay={80}>
              <HoverCardTrigger asChild>
                {badgeEl}
              </HoverCardTrigger>
              <HoverCardContent
                side="top"
                align="start"
                className="w-fit max-w-xs p-0"
              >
                <Card className="shadow-none border-0 ring-0">
                  {/* Preset / Header Area */}
                  <CardHeader className="border-b">
                    <CardTitle className="flex w-full items-center justify-between">
                      <span className="uppercase">Permissions</span>
                      {presetName && (
                        <Badge variant="primary-light" className="uppercase">
                          {presetName}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs uppercase">
                      {isAllAccess
                        ? "Global Access Level"
                        : hasNoAccess
                          ? "Access Status"
                          : "Allowed Columns per Sheet"}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex flex-col gap-2.5">
                    <ScrollArea className="max-h-64">
                      <div className="space-y-3">
                        {hasNoAccess ? (
                          <EmptyState
                            title=""
                            description={<span className="text-xs italic">No columns assigned yet</span>}
                            className="border-0 p-4 py-6"
                          />
                        ) : isAllAccess ? (
                          <Alert variant="info" className="py-2.5">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="primary-light"
                                className="font-mono text-xs"
                              >
                                *
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                All Sheets & Columns (Full Administrator Access)
                              </span>
                            </div>
                          </Alert>
                        ) : user.perSheetPermissions &&
                          Object.keys(user.perSheetPermissions).length > 0 ? (
                          Object.entries(user.perSheetPermissions).map(
                            ([sheetId, sheetCols]) => {
                              const sheetTitle =
                                sheetsWithColumns.find((s) => s.id === sheetId)
                                  ?.title || "Unknown Sheet"
                              const isSheetAll = sheetCols.includes("*")
                              return (
                                <div
                                  key={sheetId}
                                  className="group relative border bg-muted/30 p-2.5 transition-all hover:border-muted-foreground/20 hover:bg-muted/50"
                                >
                                  <div className="mb-2 flex items-center justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-1.5">
                                      <Sheet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                      <span
                                        className="truncate text-xs font-semibold text-foreground/80"
                                        title={sheetTitle}
                                      >
                                        {sheetTitle}
                                      </span>
                                    </div>
                                    <Badge
                                      variant="secondary"
                                      className="text-tiny shrink-0 origin-right scale-90 font-mono"
                                    >
                                      {isSheetAll
                                        ? "all"
                                        : `${sheetCols.length} col${sheetCols.length !== 1 ? "s" : ""}`}
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {sheetCols.map((c) => (
                                      <Badge
                                        key={c}
                                        variant="outline"
                                        className="text-tiny font-mono"
                                      >
                                        {c === "*" ? "All Columns" : c}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )
                            }
                          )
                        ) : (
                          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-2">
                            {cols.map((col) => (
                              <Badge
                                key={col}
                                variant="secondary"
                                className="text-tiny border font-mono"
                              >
                                {col}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>

                  <CardFooter>
                    {!isAllAccess && !hasNoAccess && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewUser(user)}
                        className="w-full"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View Details
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              </HoverCardContent>
            </HoverCard>
          )
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ row }) => <DateCell value={row.original.createdAt} />,
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.isActive === "TRUE"
                ? "success-light"
                : "destructive-light"
            }
            className="text-xs tracking-wider uppercase"
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
      sheetsWithColumns,
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
    <div className="mx-auto w-full space-y-6">
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
              <EmptyState
                title="No accounts found"
                description={null}
                icon={<Users className="size-6 text-muted-foreground" />}
                className="mx-auto max-w-md p-12"
              />
            </div>
          ) : (
            <>
              <DataTable columns={columns} data={filteredUsers} />
            </>
          )}
        </CardContent>
      </Card>

      {/* URL pattern: ?userModal=open | ?editUserDetails=open | ?viewUserDetail=open */}
      <Dialog
        open={isAddUserOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseUserModal()
        }}
        name={
          isViewMode
            ? "viewUserDetail"
            : isEditMode
              ? "editUserDetails"
              : "userModal"
        }
      >
        <DialogContent className="flex max-h-[85vh] w-4xl flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
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
            className="flex flex-1 flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-1">
              {isViewMode ? (
                <div className="space-y-4 p-2">
                  {/* Identity Hero Card */}
                  <Card className="overflow-hidden border shadow-none ring-0">
                    <CardContent>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage
                              src={getAvatarUrl(
                                watch("username") || "",
                                watch("role") || "",
                                watch("gender") || ""
                              )}
                              alt={watch("displayName")}
                            />
                            <AvatarFallback>
                              {watch("displayName")
                                ?.substring(0, 2)
                                .toUpperCase() || "US"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-medium text-foreground">
                              {watch("displayName")}
                            </span>
                            <span className="truncate font-mono text-xs text-muted-foreground">
                              @{watch("username")}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge
                            variant={
                              watch("isActive") === "TRUE"
                                ? "success-light"
                                : "destructive-light"
                            }
                          >
                            <BadgeDot
                              variant={
                                watch("isActive") === "TRUE"
                                  ? "success"
                                  : "destructive"
                              }
                            />
                            {watch("isActive") === "TRUE"
                              ? "Active"
                              : "Suspended"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Identity Info — Item list */}
                  <ItemGroup className="grid grid-cols-2 gap-1">
                    <Item variant="muted" className="border">
                      <ItemMedia
                        variant="icon"
                        className="text-muted-foreground"
                      >
                        <AtSign />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="text-tiny font-bold tracking-widest text-muted-foreground uppercase">
                          Username
                        </ItemTitle>
                        <ItemDescription className="font-mono font-semibold text-foreground">
                          {watch("username")}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                    <Item variant="muted">
                      <ItemMedia
                        variant="icon"
                        className="text-muted-foreground"
                      >
                        <Type />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="text-tiny font-bold tracking-widest text-muted-foreground uppercase">
                          Display Name
                        </ItemTitle>
                        <ItemDescription className="font-semibold text-foreground">
                          {watch("displayName")}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                    <Item variant="muted" className="border">
                      <ItemMedia
                        variant="icon"
                        className="text-muted-foreground"
                      >
                        <Mailbox />
                      </ItemMedia>
                      <ItemContent className="min-w-0">
                        <ItemTitle className="text-tiny font-bold tracking-widest text-muted-foreground uppercase">
                          Email Address
                        </ItemTitle>
                        <ItemDescription className="flex min-w-0 items-center justify-between gap-1 font-semibold text-foreground">
                          {watch("email") ? (
                            <>
                              <span
                                className="flex-1 truncate"
                                title={watch("email")}
                              >
                                {watch("email")}
                              </span>
                              <CopyButton
                                size="icon-xs"
                                content={watch("email")}
                                className="shrink-0"
                              />
                            </>
                          ) : (
                            <span className="text-muted-foreground italic">
                              Not provided
                            </span>
                          )}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                    <Item variant="muted">
                      <ItemMedia
                        variant="icon"
                        className="text-muted-foreground"
                      >
                        <User />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle className="text-tiny font-bold tracking-widest text-muted-foreground uppercase">
                          Gender
                        </ItemTitle>
                        <ItemDescription className="font-semibold text-foreground capitalize">
                          {watch("gender") || "Male"}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  </ItemGroup>

                  {/* Unified Sheet Access — works for both admin and sub-admin */}
                  {sheetsWithColumns.length > 0 && (
                    <>
                      <div className="flex items-center gap-3">
                        <Separator className="flex-1" />
                        <span className="text-tiny font-bold tracking-widest text-muted-foreground uppercase">
                          Sheet Access
                        </span>
                        {watch("allowedColumns") === "*" ? (
                          <Badge variant="success-light" className="text-tiny">
                            <BadgeDot variant="success" />
                            Full Access to All
                          </Badge>
                        ) : (
                          watch("permissionPreset") && (
                            <Badge variant="outline" className="text-tiny">
                              {presets.find(
                                (p) => p.id === watch("permissionPreset")
                              )?.name ?? "Custom Preset"}
                            </Badge>
                          )
                        )}
                        <Separator className="flex-1" />
                      </div>

                      <ItemGroup className="gap-1.5">
                        {sheetsWithColumns.map((sheet: any) => {
                          const isAllAccess = watch("allowedColumns") === "*"
                          const grantedCols: string[] = (
                            isAllAccess
                              ? sheet.columns
                              : ((watch("perSheetPermissions") || {})[
                                  sheet.id
                                ] ?? [])
                          ).filter((col: string) => col && col.trim() !== "")
                          const hasAccess =
                            isAllAccess || grantedCols.length > 0

                          return (
                            <Item
                              key={sheet.id}
                              variant="muted"
                              className={`flex-col items-start gap-2 border ${!hasAccess ? "opacity-50" : ""}`}
                            >
                              {/* Sheet header row */}
                              <div className="flex w-full items-center gap-2">
                                <ItemMedia
                                  variant="icon"
                                  className="shrink-0 text-muted-foreground"
                                >
                                  <Key className="size-4" />
                                </ItemMedia>
                                <ItemContent className="min-w-0 flex-1">
                                  <ItemTitle className="text-xs font-medium text-foreground">
                                    {sheet.title}
                                  </ItemTitle>
                                  <ItemDescription className="font-mono text-xs">
                                    {sheet.id}
                                  </ItemDescription>
                                </ItemContent>
                                {isAllAccess ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-tiny shrink-0"
                                  >
                                    All Columns
                                  </Badge>
                                ) : hasAccess ? (
                                  <Badge
                                    variant="info-light"
                                    className="text-tiny shrink-0"
                                  >
                                    {grantedCols.length} column
                                    {grantedCols.length !== 1 ? "s" : ""}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="destructive-light"
                                    className="text-tiny shrink-0"
                                  >
                                    <BadgeDot variant="destructive" />
                                    No Access
                                  </Badge>
                                )}
                              </div>

                              {/* Granted column chips — only for users with access */}
                              {!isAllAccess && hasAccess && (
                                <div className="flex w-full flex-wrap gap-1">
                                  {grantedCols.map((col: string) => (
                                    <Badge
                                      key={col}
                                      variant="secondary"
                                      className="text-tiny font-mono"
                                    >
                                      {col}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </Item>
                          )
                        })}
                      </ItemGroup>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-6 p-2">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Username */}
                    <Controller
                      name="username"
                      control={control}
                      render={({ field }) => (
                        <Field data-invalid={!!errors.username}>
                          <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Unique Username *
                          </FieldLabel>
                          <InputGroup>
                            <InputGroupAddon align="inline-start">
                              <AtSign className="size-4" />
                            </InputGroupAddon>
                            <InputGroupInput
                              {...field}
                              type="text"
                              placeholder="e.g. rahul_sub"
                              disabled={isEditMode || isViewMode}
                            />
                          </InputGroup>
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
                          <InputGroup>
                            <InputGroupAddon align="inline-start">
                              <Type className="size-4" />
                            </InputGroupAddon>
                            <InputGroupInput
                              {...field}
                              type="text"
                              placeholder="e.g. Rahul Sharma (Advisor)"
                              disabled={isViewMode}
                            />
                          </InputGroup>
                          <FieldError errors={[errors.displayName]} />
                        </Field>
                      )}
                    />

                    {/* Email */}
                    <Controller
                      name="email"
                      control={control}
                      render={({ field }) => (
                        <Field
                          data-invalid={!!errors.email}
                          className={isViewMode ? "md:col-span-3" : ""}
                        >
                          <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Email Address
                          </FieldLabel>
                          <InputGroup>
                            <InputGroupAddon align="inline-start">
                              <Mailbox className="size-4" />
                            </InputGroupAddon>
                            <InputGroupInput
                              {...field}
                              type="email"
                              placeholder="e.g. rahul@domain.com"
                              disabled={isViewMode}
                            />
                          </InputGroup>
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
                          <Field
                            data-invalid={!!errors.password}
                            className="md:col-span-2"
                          >
                            <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                              {isEditMode
                                ? "New Password (Optional)"
                                : "Login Password *"}
                            </FieldLabel>
                            <PasswordInput
                              {...field}
                              placeholder={
                                isEditMode
                                  ? "Leave blank to keep current"
                                  : "Create secure password"
                              }
                              generatePassword={true}
                              onGeneratePassword={(pw) => {
                                setValue("password", pw, { shouldValidate: true })
                              }}
                              showStrengthIndicator={true}
                              passwordValue={watchedPassword || ""}
                            />
                            <FieldError errors={[errors.password]} />
                          </Field>
                        )}
                      />
                    )}

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
                              watch("username")?.toLowerCase() ===
                                "sabaadmin" ||
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

                    {/* Gender */}
                    <Controller
                      name="gender"
                      control={control}
                      render={({ field }) => (
                        <Field data-invalid={!!errors.gender}>
                          <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Gender *
                          </FieldLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isViewMode}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">
                                <span className="flex items-center gap-2">
                                  <Mars className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span>Male</span>
                                </span>
                              </SelectItem>
                              <SelectItem value="female">
                                <span className="flex items-center gap-2">
                                  <Venus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span>Female</span>
                                </span>
                              </SelectItem>
                              <SelectItem value="other">
                                <span className="flex items-center gap-2">
                                  <Blend className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                  <span>Other</span>
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldError errors={[errors.gender]} />
                        </Field>
                      )}
                    />

                    {/* Column Permissions — shown for all roles (SabaAdmin assigns access) */}
                    {sheetsWithColumns.length > 0 && (
                      <>
                        {/* Column Permissions selectors (Select Sheet, Load Preset) */}
                        <Field className="col-span-1">
                          <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            Column Permissions
                          </FieldLabel>
                          <div className="flex flex-col gap-2">
                            {presets.length > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="min-w-[80px] text-xs text-muted-foreground">
                                  Load Preset:
                                </span>
                                <Select
                                  value={watch("permissionPreset") || ""}
                                  onValueChange={(presetId) => {
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
                                >
                                  <SelectTrigger className="flex-1 text-xs">
                                    <SelectValue placeholder="Select a preset" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {presets.map((p) => (
                                      <SelectItem
                                        key={p.id}
                                        value={p.id}
                                        className="text-xs"
                                      >
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <Select
                              value={selectedSheet}
                              onValueChange={setSelectedSheet}
                              disabled={isViewMode}
                            >
                              <SelectTrigger className="w-full flex-1 text-xs">
                                <SelectValue placeholder="Select sheet" />
                              </SelectTrigger>
                              <SelectContent>
                                {sheetsWithColumns.map((s) => (
                                  <SelectItem
                                    key={s.id}
                                    value={s.id}
                                    className="text-xs"
                                  >
                                    <span className="flex items-center gap-1.5">
                                      <Sheet className="size-3 shrink-0 text-muted-foreground" />
                                      {s.title}
                                    </span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </Field>

                        {/* Save Preset Name (Optional) */}
                        {!isViewMode && (
                          <Field className="col-span-3">
                            <FieldLabel className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                              Save as Preset Name (Optional)
                            </FieldLabel>
                            <div className={presets.length > 0 ? "pt-11" : ""}>
                              <Input
                                type="text"
                                placeholder="e.g. Sub-Admin Default"
                                value={newPresetName}
                                onChange={(e) =>
                                  setNewPresetName(e.target.value)
                                }
                                className="h-9"
                              />
                            </div>
                          </Field>
                        )}

                        {/* Available & Granted Columns list spanning all 3 columns */}
                        <div className="col-span-1 md:col-span-3">
                          <Controller
                            name="perSheetPermissions"
                            control={control}
                            render={({ field }) => (
                              <PermissionSelector
                                sheets={sheetsWithColumns}
                                value={field.value}
                                onChange={(permissions) => {
                                  field.onChange(permissions)
                                  setValue("permissionPreset", "")
                                }}
                                disabled={isViewMode}
                                selectedSheet={selectedSheet}
                                onSheetChange={setSelectedSheet}
                                hideSelectors={true}
                              />
                            )}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              {isViewMode ? (
                <Button
                  variant="destructive"
                  type="button"
                  onClick={handleCloseUserModal}
                >
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    variant="destructive"
                    type="button"
                    onClick={handleCloseUserModal}
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
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* URL pattern: ?resetPassword=open&tab=direct | tab=otp */}
      <Dialog
        open={isResetPasswordOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseResetPasswordModal()
            setResetPasswordTab("direct")
          }
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
            className="m-2 w-fit"
          >
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="direct">Direct Password</TabsTrigger>
              <TabsTrigger value="otp">OTP Reset Link</TabsTrigger>
            </TabsList>

            <TabsContent value="direct">
              <Card className="border shadow-none ring-0">
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Direct Password Change
                    </h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Update the password immediately. The user will be required
                      to use this new password on their next login.
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
                            body: JSON.stringify({
                              password: values.newPassword,
                            }),
                          }
                        )
                        const result = await res.json()
                        if (!res.ok)
                          throw new Error(
                            result.error || "Failed to reset password."
                          )
                        handleCloseResetPasswordModal()
                        fetchUsers()
                        return result
                      }
                      toast.promise(promise(), {
                        loading: `Updating password for ${resetPasswordUser.username}...`,
                        success: "Password updated successfully.",
                        error: (err) =>
                          err.message || "Failed to reset password.",
                      })
                    })}
                    className="space-y-4"
                  >
                    <Controller
                      name="newPassword"
                      control={resetPasswordForm.control}
                      render={({ field }) => (
                        <Field
                          data-invalid={
                            !!resetPasswordForm.formState.errors.newPassword
                          }
                        >
                          <FieldLabel className="text-tiny font-bold tracking-wider text-muted-foreground uppercase">
                            New Secure Password *
                          </FieldLabel>
                          <PasswordInput
                            {...field}
                            placeholder="Enter new secure password"
                            autoComplete="new-password"
                            generatePassword={true}
                            onGeneratePassword={(pw) => {
                              field.onChange(pw)
                            }}
                            showStrengthIndicator={true}
                            passwordValue={field.value || ""}
                          />
                          <FieldError
                            errors={[
                              resetPasswordForm.formState.errors.newPassword,
                            ]}
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
              <Card className="border shadow-none ring-0">
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">
                      Trigger OTP Password Reset Link
                    </h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Generate a temporary OTP code and dispatch a secure reset
                      link directly to the user's registered email address.
                    </p>
                  </div>

                  {!resetPasswordUser?.email ? (
                    <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400">
                      <ShieldAlert className="size-4" />
                      <AlertTitle className="font-bold">
                        Email Not Configured
                      </AlertTitle>
                      <AlertDescription className="text-amber-600/80 dark:text-amber-400/80">
                        This account has no registered email address. Use the
                        Direct Password tab instead.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-3">
                      <Card className="border shadow-none">
                        <CardContent className="flex items-center justify-between p-3">
                          <span className="text-tiny font-bold tracking-wider text-muted-foreground uppercase">
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
              onClick={handleCloseResetPasswordModal}
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
