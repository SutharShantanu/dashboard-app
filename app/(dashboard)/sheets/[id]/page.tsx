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
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  History,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BadgeDot } from "@/components/ui/badge-dot"
import { ExportDropdown } from "@/components/export-dropdown"
import { DataTable } from "@/components/ui/data-table"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/ui/timeline"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/page-header"
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
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
  const [historyCell, setHistoryCell] = useState<{
    rowId: string
    col: string
    value: string
  } | null>(null)

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

  const { data: cellHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ["cellHistory", historyCell?.rowId, historyCell?.col],
    queryFn: async () => {
      if (!historyCell) return null
      const res = await fetch(`/api/students/history?rowId=${historyCell.rowId}&column=${historyCell.col}`)
      if (!res.ok) throw new Error("Failed to fetch history")
      return res.json()
    },
    enabled: !!historyCell,
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
      const currentUsername =
        (session.user as any).username ||
        session.user.email?.split("@")[0] ||
        "user"
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
          renderedUsers[userIndex].avatar = getAvatarUrl(
            currentUsername,
            (session.user as any).role
          )
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

      // Calculate max length of values in this column dynamically based on content
      const maxCharLength = Math.max(
        col ? col.length : 0,
        ...data.map((row: any) => String(row[col] || "").length)
      )
      // Allow a minimum of 8ch and add 4ch for safety (input padding, read-only icons, font variations)
      const minWidthCh = `${Math.max(maxCharLength + 4, 8)}ch`

      return {
        id: colId,
        accessorFn: (row: any) => row[col],
        header: col || `Column ${index + 1}`,
        cell: (info: any) => {
          const value = info.getValue()
          const studentId = info.row.original.ID || info.row.original._id
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
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className="group relative w-full"
                  style={{ minWidth: minWidthCh }}
                >
                  <Input
                    key={`${studentId}:${colId}:${value}`}
                    defaultValue={value || ""}
                    style={{ minWidth: minWidthCh }}
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
                    className={`h-8 w-full border-transparent bg-transparent transition-colors hover:border-input focus:border-primary focus:bg-background ${userColor} ${isLocked ? "cursor-not-allowed opacity-70" : "cursor-text"}`}
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
              </ContextMenuTrigger>
              <ContextMenuContent className="w-64">
                <ContextMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(String(value || ""))
                  }}
                  disabled={!value}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                  <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(String(value || ""))
                    if (!isLocked) {
                      handleSave(studentId, colName, "")
                    }
                  }}
                  disabled={!value || isLocked}
                >
                  <Scissors className="mr-2 h-4 w-4" />
                  Cut
                  <ContextMenuShortcut>⌘X</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={async () => {
                    if (!isLocked) {
                      try {
                        const text = await navigator.clipboard.readText()
                        handleSave(studentId, colName, text)
                      } catch (err) {
                        console.error("Failed to read clipboard")
                      }
                    }
                  }}
                  disabled={isLocked}
                >
                  <Clipboard className="mr-2 h-4 w-4" />
                  Paste
                  <ContextMenuShortcut>⌘V</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    if (!isLocked) {
                      handleSave(studentId, colName, "")
                    }
                  }}
                  disabled={isLocked || !value}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear
                  <ContextMenuShortcut>⌫</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() => setHistoryCell({ rowId: studentId, col: colName, value: String(value || "") })}
                >
                  <History className="mr-2 h-4 w-4" />
                  Show edit history
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          )
        },
      }
    })
  }, [
    columns,
    data,
    editingCell,
    editValue,
    allowedColumns,
    realActiveUsers,
    allUsers,
  ])

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
          <AvatarGroup className="backdrop-blur-sm">
            {activeUsersToRender.map((user) => (
              <Tooltip key={user.id}>
                <TooltipTrigger asChild>
                  <Avatar
                    className={`h-8 w-8 ${user.isActive ? "ring-2 ring-success" : "opacity-50 grayscale"}`}
                  >
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback className={`${user.color} text-xs`}>
                      {user.fallback}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent className="flex flex-col gap-0 items-start">
                  <p className="text-xs font-semibold">{user.name}</p>
                  <p className="text-tiny p-0 text-muted-foreground capitalize">
                    {user.role}
                  </p>
                  <Badge variant={"secondary"}>
                    <BadgeDot variant="success" />
                    {user.isActive ? "Active now" : "Offline"}
                  </Badge>
                </TooltipContent>
              </Tooltip>
            ))}
          </AvatarGroup>
        </TooltipProvider>
        <Badge variant="secondary" className="gap-1 text-xs">
          <Users className="h-3 w-3" />
          {activeUsersToRender.length} Users
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

      <Sheet open={!!historyCell} onOpenChange={(open) => !open && setHistoryCell(null)}>
        <SheetContent className="sm:max-w-[425px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit History</SheetTitle>
            <SheetDescription>
              Changes made to {historyCell?.col}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 py-6 px-2">
            {isHistoryLoading ? (
              <div className="flex items-center justify-center p-4">
                <Spinner className="h-6 w-6 text-primary" />
              </div>
            ) : cellHistory?.logs?.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground p-4">
                No edit history found for this cell.
              </div>
            ) : (
              <Timeline defaultValue={1} className="w-full">
                {cellHistory?.logs?.map((log: any, i: number) => (
                  <TimelineItem key={i} step={i + 1}>
                    <TimelineIndicator />
                    <TimelineSeparator />
                    <TimelineHeader>
                      <TimelineDate>{new Date(log.timestamp).toLocaleString()}</TimelineDate>
                      <TimelineTitle>{log.actorDisplayName}</TimelineTitle>
                    </TimelineHeader>
                    <TimelineContent>
                      Changed from <span className="font-semibold line-through decoration-destructive/50">{log.oldValue || '""'}</span> to <span className="font-semibold text-green-600 dark:text-green-400">{log.newValue || '""'}</span>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

