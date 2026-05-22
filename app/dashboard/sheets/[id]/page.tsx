"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  Database,
  Search,
  ArrowUpDown,
  ChevronDown,
  Filter,
  Download,
  Share2,
  MoreHorizontal,
  AlertCircle,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BadgeDot } from "@/components/ui/badge-dot"
import { ExportDropdown } from "@/components/export-dropdown"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Spinner } from "@/components/ui/spinner"

export default function SheetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [editingCell, setEditingCell] = useState<{
    rowId: string
    col: string
  } | null>(null)
  const [editValue, setEditValue] = useState("")

  const { data: sheetsList } = useQuery({
    queryKey: ["connectedSheets"],
    queryFn: async () => {
      const res = await fetch("/api/connected-sheets")
      if (!res.ok) throw new Error("Failed to fetch sheets list")
      return res.json()
    },
  })

  const sheetInfo = sheetsList?.connectedSheets?.find(
    (s: any) => s.spreadsheetId === id
  )
  const sheetTitle = sheetInfo?.title || `Sheet: ${id.substring(0, 8)}...`

  const {
    data: sheetData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sheetData", id],
    queryFn: async () => {
      const res = await fetch(`/api/students?spreadsheetId=${id}`)
      if (!res.ok) throw new Error("Failed to fetch sheet data")
      return res.json()
    },
    enabled: !!id,
  })

  const queryClient = useQueryClient()

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/students?spreadsheetId=${id}`, {
        method: "PUT",
      })
      if (!res.ok) throw new Error("Failed to sync sheet data")
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sheetData", id] })
    },
  })

  const handleFocus = async (studentId: string, col: string) => {
    try {
      await fetch("/api/presence/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ focusedCell: `${studentId}:${col}` }),
      })
    } catch (err) {
      console.error("Failed to send focus event:", err)
    }
  }

  const handleSave = async (studentId: string, col: string, value: string) => {
    try {
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: studentId, column: col, value }),
      })
      if (!res.ok) throw new Error("Failed to save data")
      queryClient.invalidateQueries({ queryKey: ["sheetData", id] })
    } catch (err) {
      console.error("Failed to save data:", err)
    }
  }

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  const [realActiveUsers, setRealActiveUsers] = useState<
    { username: string; focusedCell: string | null }[]
  >([])
  const [allUsers, setAllUsers] = useState<any[]>([])

  useEffect(() => {
    const eventSource = new EventSource("/api/stream")
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === "presence") {
        setRealActiveUsers(data.activeUsers)
      }
    }

    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (data.users) setAllUsers(data.users)
      })
      .catch((err) => console.error("Failed to fetch users:", err))

    return () => eventSource.close()
  }, [])

  const activeUsersToRender = useMemo(() => {
    const renderedUsers = allUsers.map((u, index) => {
      const isActive = realActiveUsers.some((ra) => ra.username === u.username)
      return {
        id: index,
        name: u.displayName || u.username,
        fallback: (u.displayName || u.username).substring(0, 2).toUpperCase(),
        color: isActive
          ? "bg-green-500"
          : "bg-gray-300 dark:bg-gray-700 text-muted-foreground",
        avatar: getAvatarUrl(u.username, u.role),
        isActive,
        role: u.role,
      }
    })

    // Add current user if not in allUsers
    if (session?.user) {
      const currentUsername = (session.user as any).username || session.user.email?.split("@")[0] || "user"
      const alreadyIncluded = allUsers.some(
        (u) => u.username === currentUsername
      )

      if (!alreadyIncluded) {
        renderedUsers.push({
          id: renderedUsers.length,
          name: session.user.name || currentUsername,
          fallback: (session.user.name || currentUsername)
            .substring(0, 2)
            .toUpperCase(),
          color: "bg-green-500", // Current user is active
          avatar: getAvatarUrl(currentUsername, (session.user as any).role),
          isActive: true,
          role: (session.user as any).role,
        })
      } else {
        // If already included, make sure they are marked as active
        const userIndex = renderedUsers.findIndex(
          (u) =>
            u.name === (session.user.name || currentUsername) ||
            u.name === currentUsername
        )
        if (userIndex !== -1) {
          renderedUsers[userIndex].isActive = true
          renderedUsers[userIndex].color = "bg-green-500"
          renderedUsers[userIndex].avatar = getAvatarUrl(currentUsername, (session.user as any).role)
        }
      }
    }

    return renderedUsers
  }, [allUsers, realActiveUsers, session])

  const columns = sheetData?.columns || []
  const data = sheetData?.data || []

  const allowedColumns = sheetData?.allowedColumns || []

  const tableColumns = useMemo<ColumnDef<any>[]>(() => {
    return columns.map((col: string, index: number) => {
      const colId = col || `col_${index}`
      return {
        id: colId,
        accessorFn: (row: any) => row[col],
        header: col || `Column ${index + 1}`,
        cell: (info: any) => {
          const value = info.getValue()
          const studentId = info.row.original._id
          const colName = col // Use original key for saving!
          const isSystemColumn =
            colName === "ID" ||
            colName === "LastModifiedBy" ||
            colName === "LastModifiedAt"
          const isLocked = !allowedColumns.includes(colName) || isSystemColumn

          // Check if another user is focusing this cell
          const focusingUser = realActiveUsers.find(
            (u) => u.focusedCell === `${studentId}:${colName}`
          )

          // Find user details for tooltip/color
          const userDetails = allUsers.find(
            (u) => u.username === focusingUser?.username
          )
          const userColor = focusingUser
            ? userDetails?.role === "admin"
              ? "ring-2 ring-red-500"
              : "ring-2 ring-blue-500"
            : ""

          return (
            <div className="group relative">
              <Input
                key={`${studentId}:${colId}:${value}`}
                defaultValue={value || ""}
                size={Math.max(value?.toString().length || 0, 5)}
                onBlur={(e) => {
                  if (!isLocked && e.target.value !== value) {
                    handleSave(studentId, colName, e.target.value)
                  }
                }}
                onFocus={() => {
                  if (!isLocked) {
                    handleFocus(studentId, colName)
                  }
                }}
                disabled={isLocked}
                className={`h-8 w-auto border-transparent bg-transparent transition-colors hover:border-input focus:border-primary focus:bg-background ${userColor} ${isLocked ? "cursor-not-allowed opacity-70" : "cursor-text"}`}
              />
              {isLocked && (
                <div className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Read-only field</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
          )
        },
      }
    })
  }, [
    columns,
    editingCell,
    editValue,
    allowedColumns,
    realActiveUsers,
    allUsers,
  ])

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "asc"
    ) {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    // Filter by status (assuming "Status" column exists)
    if (statusFilter) {
      result = result.filter((row: any) => row.Status === statusFilter)
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key]
        const bVal = b[sortConfig.key]

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }

    return result
  }, [data, searchQuery, sortConfig, statusFilter])

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set<string>()
    data.forEach((row: any) => {
      if (row.Status) statuses.add(row.Status)
    })
    return Array.from(statuses)
  }, [data])

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Spinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading sheet content...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-destructive">
          <AlertCircle className="h-8 w-8" />
          <p className="text-sm font-semibold">Error loading sheet</p>
          <p className="text-xs text-muted-foreground">
            {(error as Error).message}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.back()}
          >
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full min-w-0 space-y-6">
      <PageHeader
        subtitle="Connected Sheet"
        title={sheetTitle}
        description="View and manage live data from your connected Google Sheet."
      >
        <Button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          {syncMutation.isPending ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Sync Now
        </Button>

        <TooltipProvider>
          <div className="flex -space-x-2">
            {activeUsersToRender.map((user) => (
              <Tooltip key={user.id}>
                <TooltipTrigger asChild>
                  <Avatar
                    className={`h-8 w-8 border-2 border-background ${user.isActive ? "ring-2 ring-emerald-500" : "opacity-50 grayscale"}`}
                  >
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback
                      className={`${user.color} text-xs text-white`}
                    >
                      {user.fallback}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-semibold">{user.name}</p>
                  <p className="text-tiny text-muted-foreground capitalize">
                    {user.role}
                  </p>
                  <p className="text-tiny text-muted-foreground">
                    {user.isActive ? "Active now" : "Offline"}
                  </p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
        <Badge variant="secondary" className="gap-1 text-xs">
          <BadgeDot variant="success" pulse />
          {activeUsersToRender.length} Active
        </Badge>
      </PageHeader>

      <div className="max-w-full" style={{ width: 0, minWidth: "100%" }}>
        <Card className="max-w-full">
          <CardHeader>
            <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
              <div>
                <CardTitle>Sheet Data</CardTitle>
                <CardDescription>
                  Showing {filteredAndSortedData.length} of {data.length}{" "}
                  records
                </CardDescription>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                {/* FILTERS */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Filter className="h-4 w-4" />
                      Status
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-fit">
                    <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                      All Statuses
                    </DropdownMenuItem>
                    {uniqueStatuses.map((status) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => setStatusFilter(status)}
                      >
                        {status}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* ACTIONS */}
                <ExportDropdown
                  data={filteredAndSortedData}
                  filename={sheetTitle}
                />
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="w-full max-w-full">
            <DataTable columns={tableColumns} data={filteredAndSortedData} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
