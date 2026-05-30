/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useMemo, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  ChevronDown,
  Filter,
  Share2,
  AlertCircle,
  Users,
  RefreshCw,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  History,
  X,
  Check,
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SkeletonBlock } from "@/components/ui/skeleton-block"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { BadgeDot } from "@/components/ui/badge-dot"
import { ExportDropdown } from "@/components/export-dropdown"
import { EmptyState } from "@/components/empty-state"
import { AdvancedDataGrid } from "@/components/ui/advanced-data-grid"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
} from "@/components/ui/input-group"
import type { ColumnDef } from "@tanstack/react-table"
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
  SheetTrigger,
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
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar"
import { getAvatarUrl } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Spinner } from "@/components/ui/spinner"

function CellTooltip({
  rowId,
  colName,
  isLocked,
  isEditing,
  children,
}: {
  rowId: string
  colName: string
  isLocked: boolean
  isEditing?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (isEditing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false)
    }
  }, [isEditing])

  const { data, isLoading } = useQuery({
    queryKey: ["cellHistory", rowId, colName],
    queryFn: async () => {
      const res = await fetch(
        `/api/students/history?rowId=${rowId}&column=${encodeURIComponent(colName)}`
      )
      if (!res.ok) throw new Error("Failed to fetch history")
      return res.json()
    },
    enabled: open && !isLocked && !isEditing,
  })

  const hasHistory = data?.logs && data.logs.length > 0
  const shouldShowTooltip = isLocked || isLoading || hasHistory

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip
        open={open && !isEditing}
        onOpenChange={(v) => {
          if (!isEditing) setOpen(v)
        }}
      >
        <TooltipTrigger asChild>
          <div className="relative h-full w-full">{children}</div>
        </TooltipTrigger>
        {shouldShowTooltip &&
          (isLocked ? (
            <TooltipContent className="z-60" sideOffset={8}>
              <p className="text-xs">Read-only field</p>
            </TooltipContent>
          ) : (
            <TooltipContent className="z-60 max-w-xs p-2" sideOffset={8}>
              <div className="flex flex-col gap-1.5">
                <p className="mb-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Last Activity
                </p>
                {isLoading ? (
                  <div className="flex items-center gap-2 py-1">
                    <Spinner className="h-3 w-3" />
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs font-medium text-foreground">
                        {data.logs[0].actorDisplayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(data.logs[0].timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-xs">
                      <span
                        className="max-w-[120px] truncate rounded-sm bg-destructive/15 px-1.5 py-0.5 text-destructive line-through"
                        title={data.logs[0].oldValue || '""'}
                      >
                        {data.logs[0].oldValue || '""'}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span
                        className="max-w-[120px] truncate rounded-sm bg-success/15 px-1.5 py-0.5 text-success"
                        title={data.logs[0].newValue || '""'}
                      >
                        {data.logs[0].newValue || '""'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </TooltipContent>
          ))}
      </Tooltip>
    </TooltipProvider>
  )
}

function SheetActivityDrawer({ sheetId }: { sheetId: string }) {
  const { status: sessionStatus } = useSession()
  const { data: logsData, isFetching: isLogsFetching } = useQuery({
    queryKey: ["sheet_logs", sheetId],
    queryFn: async () => {
      const res = await fetch("/api/logs")
      if (!res.ok) throw new Error("Failed to load logs")
      const data = await res.json()
      return data.logs || []
    },
    enabled: sessionStatus === "authenticated",
  })

  const displayLogs = logsData?.slice(0, 50) || []

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Activity className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Activity</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0 border-l border-border/40 shadow-2xl">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Sheet Activity</SheetTitle>
          <SheetDescription>
            Recent changes and events.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLogsFetching ? (
            <div className="flex items-center justify-center h-32">
              <Spinner className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : displayLogs.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Changes to this sheet will appear here."
              icon={<History className="h-10 w-10 text-muted-foreground" />}
            />
          ) : (
            <Timeline>
              {displayLogs.map((log: any, i: number) => (
                <TimelineItem key={i} step={i + 1} className="pb-6">
                  <TimelineSeparator />
                  <TimelineIndicator>
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </TimelineIndicator>
                  <TimelineContent>
                    <div className="flex flex-col gap-1 -mt-1.5">
                      <div className="flex items-center justify-between gap-4">
                        <TimelineTitle className="text-sm font-medium">
                          {log.actorDisplayName || log.actor}
                        </TimelineTitle>
                        <TimelineDate className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </TimelineDate>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {log.action === "STUDENT_UPDATE" ? (
                          <span>
                            Updated <span className="font-medium text-foreground">{log.columnChanged}</span> for row <span className="font-medium text-foreground">{log.targetRow}</span>
                          </span>
                        ) : log.action === "SHEET_CONNECT" ? (
                          <span>Connected sheet <span className="font-medium text-foreground">{log.targetRow}</span></span>
                        ) : (
                          <span>{log.details || log.action}</span>
                        )}
                      </div>
                      {(log.oldValue || log.newValue) && (
                        <div className="mt-2 flex items-center gap-1.5 font-mono text-xs p-2 rounded-md bg-muted/50 border max-w-full overflow-hidden">
                          <span className="flex-1 truncate text-destructive line-through" title={log.oldValue || '""'}>
                            {log.oldValue || '""'}
                          </span>
                          <span className="text-muted-foreground shrink-0">→</span>
                          <span className="flex-1 truncate text-success" title={log.newValue || '""'}>
                            {log.newValue || '""'}
                          </span>
                        </div>
                      )}
                    </div>
                  </TimelineContent>
                </TimelineItem>
              ))}
            </Timeline>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

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
  const [savingCell, setSavingCell] = useState<{
    rowId: string
    col: string
    status: "idle" | "saving" | "success" | "error"
  } | null>(null)
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
      const res = await fetch(
        `/api/students/history?rowId=${historyCell.rowId}&column=${historyCell.col}&spreadsheetId=${id}`
      )
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
    setSavingCell({ rowId: studentId, col, status: "saving" })
    try {
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: studentId,
          column: col,
          value,
          spreadsheetId: id,
        }),
      })
      if (!res.ok) throw new Error("Failed to save data")

      setSavingCell({ rowId: studentId, col, status: "success" })
      queryClient.invalidateQueries({ queryKey: ["sheetData", id] })

      // Wait for success micro-animation before closing
      await new Promise((resolve) => setTimeout(resolve, 800))
      setEditingCell(null)
      setSavingCell(null)
    } catch (err) {
      console.error("Failed to save data:", err)
      setSavingCell({ rowId: studentId, col, status: "error" })

      // Wait to display error before letting them retry
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setSavingCell(null)
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
        avatar: getAvatarUrl(u.username, u.role, u.gender),
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
          avatar: getAvatarUrl(
            currentUsername,
            (session.user as any).role,
            (session.user as any).gender
          ),
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
            (session.user as any).role,
            (session.user as any).gender
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

          const isEditingCell =
            editingCell?.rowId === studentId && editingCell?.col === colName

          return (
            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div
                  className="group relative w-full"
                  style={{ minWidth: minWidthCh }}
                >
                  <CellTooltip
                    rowId={studentId}
                    colName={colName}
                    isLocked={isLocked}
                    isEditing={isEditingCell}
                  >
                    {isEditingCell ? (
                      <InputGroup
                        className={`h-8 w-full ${userColor} focus-within:border-primary focus-within:ring-1 focus-within:ring-primary`}
                      >
                        <InputGroupInput
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          style={{ minWidth: minWidthCh }}
                          disabled={
                            savingCell?.rowId === studentId &&
                            savingCell?.col === colName &&
                            savingCell.status === "saving"
                          }
                          onBlur={() => {
                            if (
                              savingCell?.rowId === studentId &&
                              savingCell?.col === colName
                            )
                              return
                            if (!isLocked && editValue !== value) {
                              handleSave(studentId, colName, editValue)
                            } else {
                              setEditingCell(null)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (
                                savingCell?.rowId === studentId &&
                                savingCell?.col === colName
                              )
                                return
                              if (!isLocked && editValue !== value) {
                                handleSave(studentId, colName, editValue)
                              } else {
                                setEditingCell(null)
                              }
                            } else if (e.key === "Escape") {
                              if (
                                savingCell?.rowId === studentId &&
                                savingCell?.col === colName
                              )
                                return
                              setEditingCell(null)
                            }
                          }}
                        />

                        {savingCell?.rowId === studentId &&
                        savingCell?.col === colName ? (
                          <InputGroupAddon
                            align="inline-end"
                            className="flex items-center pr-1.5"
                          >
                            {savingCell.status === "saving" && (
                              <Spinner className="h-3 w-3 text-muted-foreground" />
                            )}
                            {savingCell.status === "success" && (
                              <Check className="h-3.5 w-3.5 animate-bounce text-success" />
                            )}
                            {savingCell.status === "error" && (
                              <X className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </InputGroupAddon>
                        ) : (
                          <InputGroupAddon
                            align="inline-end"
                            className="flex items-center gap-1"
                          >
                            <InputGroupButton
                              size="icon-xs"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (!isLocked && editValue !== value) {
                                  handleSave(studentId, colName, editValue)
                                } else {
                                  setEditingCell(null)
                                }
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </InputGroupButton>
                            <InputGroupButton
                              size="icon-xs"
                              variant="destructive"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setEditingCell(null)
                              }}
                            >
                              <X className="h-3.5 w-3.5" />
                            </InputGroupButton>
                          </InputGroupAddon>
                        )}
                      </InputGroup>
                    ) : (
                      <InputGroup
                        className={`h-8 w-full border-transparent bg-transparent transition-colors focus-within:border-transparent focus-within:bg-background hover:border-input ${userColor} ${isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                      >
                        <InputGroupInput
                          readOnly
                          value={value || ""}
                          style={{ minWidth: minWidthCh }}
                          onClick={() => {
                            if (!isLocked) {
                              setEditingCell({ rowId: studentId, col: colName })
                              setEditValue(value || "")
                              handleFocus(studentId, colName)
                            }
                          }}
                          disabled={isLocked}
                          className="truncate border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                        {isLocked && (
                          <InputGroupAddon
                            align="inline-end"
                            className="pointer-events-none flex items-center pr-2 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          </InputGroupAddon>
                        )}
                      </InputGroup>
                    )}
                  </CellTooltip>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="w-64">
                <ContextMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(String(value || ""))
                  }}
                  disabled={!value}
                >
                  <Copy className="h-4 w-4" />
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
                  <Scissors className="h-4 w-4" />
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
                  <Clipboard className="h-4 w-4" />
                  Paste
                  <ContextMenuShortcut>⌘V</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={() => {
                    if (!isLocked) {
                      handleSave(studentId, colName, "")
                    }
                  }}
                  variant="destructive"
                  disabled={isLocked || !value}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear
                  <ContextMenuShortcut>⌫</ContextMenuShortcut>
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onClick={() =>
                    setHistoryCell({
                      rowId: studentId,
                      col: colName,
                      value: String(value || ""),
                    })
                  }
                >
                  <History className="h-4 w-4" />
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
      <div className="flex h-[calc(100vh-4rem)] w-full flex-1 flex-col gap-6 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <SkeletonBlock
            variant="rectangular"
            width={300}
            height={40}
            className="rounded-lg"
          />
          <SkeletonBlock
            variant="rectangular"
            width={100}
            height={36}
            className="rounded-md"
          />
        </div>
        <div className="flex gap-4">
          <SkeletonBlock
            variant="rectangular"
            width="100%"
            height={36}
            className="max-w-sm rounded-md"
          />
          <SkeletonBlock
            variant="rectangular"
            width={120}
            height={36}
            className="rounded-md"
          />
        </div>
        <SkeletonBlock
          variant="rectangular"
          width="100%"
          height="100%"
          className="flex-1 rounded-xl"
          showSpinner={true}
        />
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
                <TooltipContent className="flex flex-col items-start gap-1 px-3 py-2 border-border/40 shadow-xl">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-none">{user.name}</span>
                    <span className="text-[10px] text-muted-foreground capitalize mt-1.5">
                      {user.role}
                    </span>
                  </div>
                  <Badge variant={user.isActive ? "success-light" : "secondary"} className="mt-1 h-5 px-1.5 text-[10px] w-fit">
                    <BadgeDot variant={user.isActive ? "success" : "outline"} className="mr-1" pulse={user.isActive} />
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
        <SheetActivityDrawer sheetId={id} />
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

              {data.length > 0 && (
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
              )}
            </div>
          </CardHeader>
          <CardContent className="w-full max-w-full">
            {filteredAndSortedData.length > 0 ? (
              <div className="overflow-auto">
                <AdvancedDataGrid
                  columns={tableColumns}
                  data={filteredAndSortedData}
                />
              </div>
            ) : (
              <EmptyState
                title="No results."
                description={
                  data.length === 0
                    ? "This sheet is currently empty."
                    : "No records match your current filters."
                }
                useIllustration={true}
                className="rounded-lg border border-dashed"
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={!!historyCell}
        onOpenChange={(open) => !open && setHistoryCell(null)}
      >
        <SheetContent className="overflow-y-auto sm:max-w-[425px]">
          <SheetHeader>
            <SheetTitle>Edit History</SheetTitle>
            <SheetDescription>
              Changes made to {historyCell?.col}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-2 py-6">
            {isHistoryLoading ? (
              <div className="flex flex-col gap-4 p-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <SkeletonBlock variant="circular" width={24} height={24} />
                    <SkeletonBlock
                      variant="rectangular"
                      width="100%"
                      height={80}
                      className="rounded-md"
                    />
                  </div>
                ))}
              </div>
            ) : cellHistory?.logs?.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No edit history found for this cell.
              </div>
            ) : (
              <Timeline defaultValue={1} className="w-full">
                {cellHistory?.logs?.map((log: any, i: number) => (
                  <TimelineItem key={i} step={i + 1}>
                    <TimelineIndicator />
                    <TimelineSeparator />
                    <TimelineHeader>
                      <TimelineDate>
                        {new Date(log.timestamp).toLocaleString()}
                      </TimelineDate>
                      <TimelineTitle>{log.actorDisplayName}</TimelineTitle>
                    </TimelineHeader>
                    <TimelineContent>
                      Changed from{" "}
                      <span className="font-semibold line-through decoration-destructive/50">
                        {log.oldValue || '""'}
                      </span>{" "}
                      to{" "}
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {log.newValue || '""'}
                      </span>
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
