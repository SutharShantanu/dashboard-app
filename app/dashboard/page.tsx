"use client"

import React, { useState, useEffect, Suspense, useRef } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Search,
  Plus,
  Lock,
  Unlock,
  Settings,
  RefreshCw,
  UserPlus,
  Users,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  Shield,
  Clock,
  Sparkles,
  Database,
  Filter,
  Check,
  Eye,
  EyeOff,
  Key,
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
  CardContent,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { format, formatDistanceToNow } from "date-fns"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

interface Student {
  ID: string
  Name: string
  Email: string
  Phone: string
  Course: string
  Batch: string
  Status: string
  Score: string
  Remarks: string
  Grade: string
  Comments: string
  Notes: string
  LastModifiedBy?: string
  LastModifiedAt?: string
}

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

interface AuditLog {
  timestamp: string
  actor: string
  actorDisplayName: string
  actorRole: string
  action: string
  targetRow: string
  columnChanged: string
  oldValue: string
  newValue: string
  ip: string
}

interface ActiveUser {
  username: string
  displayName: string
  avatar: string
  color: string
  lastAction: string
  lastSeen: number
}

function DashboardPageContent() {
  const { data: session, status: sessionStatus } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = searchParams.get("tab") as
    | "students"
    | "logs"
    | null
  const activeTab = tabParam || "students"
  const sheetParam = searchParams.get("sheet") || "Students"
  const spreadsheetIdParam = searchParams.get("spreadsheetId") || ""

  const setActiveTab = (tab: string) => {
    router.push(
      `/dashboard?tab=${tab}${spreadsheetIdParam ? `&spreadsheetId=${encodeURIComponent(spreadsheetIdParam)}` : ""}`
    )
  }

  // Global State
  const [students, setStudents] = useState<Student[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [allowedColumns, setAllowedColumns] = useState<string[]>([])
  const [isSimulated, setIsSimulated] = useState<boolean>(true)
  const [isConfigured, setIsConfigured] = useState<boolean>(true)
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true)

  // Audit Logs (Admin only)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false)

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [batchFilter, setBatchFilter] = useState<string>("All")

  // Audit logs search
  const [logSearchQuery, setLogSearchQuery] = useState<string>("")

  // Saving states for inline cells: studentId_columnName -> boolean
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({})

  // Real-Time Collaborative Presence States
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([])
  const [focusedCells, setFocusedCells] = useState<
    Record<string, { user: string; color: string }>
  >({})

  // Modals & New Record States
  const [isAddStudentOpen, setIsAddStudentOpen] = useState<boolean>(false)
  const [newStudent, setNewStudent] = useState<Partial<Student>>({
    ID: "",
    Name: "",
    Email: "",
    Phone: "",
    Course: "",
    Batch: "",
    Status: "Active",
    Score: "",
    Remarks: "",
    Grade: "",
    Comments: "",
    Notes: "",
  })

  // Auto Refresh & Smart Polling Fallback
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const lastHealthTimestampRef = useRef<string>("")

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchStudents()
      if (session?.user?.role === "admin") {
        fetchLogs()
      }
    }
  }, [sessionStatus, session, sheetParam, spreadsheetIdParam])



  // Layer 2: Real-time SSE Connection for Push Sync & Collaborative Cursors
  useEffect(() => {
    if (sessionStatus !== "authenticated" || !session?.user) return

    const username = session.user.username || "Anonymous"
    const displayName = session.user.displayName || username
    // Assign a unique color based on username hash
    let hash = 0
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colors = [
      "#ef4444",
      "#f97316",
      "#10b981",
      "#06b6d4",
      "#3b82f6",
      "#8b5cf6",
      "#ec4899",
    ]
    const color = colors[Math.abs(hash) % colors.length]

    const sseUrl = `/api/stream?username=${encodeURIComponent(username)}&displayName=${encodeURIComponent(
      displayName
    )}&color=${encodeURIComponent(color)}`

    const eventSource = new EventSource(sseUrl)

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "presence") {
          setActiveUsers(data.activeUsers || [])
        } else if (data.type === "cell_focus") {
          const key = `${data.studentId}_${data.col}`
          setFocusedCells((prev) => ({
            ...prev,
            [key]: { user: data.user, color: data.color },
          }))
        } else if (data.type === "cell_blur") {
          const key = `${data.studentId}_${data.col}`
          setFocusedCells((prev) => {
            const next = { ...prev }
            delete next[key]
            return next
          })
        } else if (
          data.type === "cell_update" ||
          data.type === "full_sync_required"
        ) {
          // Push update received -> Refresh data instantly
          fetchStudents(false)
          if (session?.user?.role === "admin") {
            fetchLogs()
          }
        }
      } catch {}
    }

    return () => {
      eventSource.close()
    }
  }, [sessionStatus, session])

  // Layer 3: Fallback Smart Polling (Checks lightweight health endpoint every 10s)
  useEffect(() => {
    if (sessionStatus !== "authenticated") return

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("/api/sheet-health")
        if (res.ok) {
          const data = await res.json()
          if (
            lastHealthTimestampRef.current &&
            lastHealthTimestampRef.current !== data.lastModified
          ) {
            // Timestamp differed -> trigger background refresh
            fetchStudents(false)
          }
          lastHealthTimestampRef.current = data.lastModified
        }
      } catch {}
    }, 10000)

    return () => clearInterval(pollInterval)
  }, [sessionStatus])

  const fetchStudents = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true)
    setLoadingStudents(true)
    try {
      const url = `/api/students?sheet=${encodeURIComponent(sheetParam)}${spreadsheetIdParam ? `&spreadsheetId=${encodeURIComponent(spreadsheetIdParam)}` : ""}`
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to load students")
      const data = await res.json()
      setStudents(data.data || [])
      setColumns(data.columns || [])
      setAllowedColumns(data.allowedColumns || [])
      setIsSimulated(data.simulated ?? true)
      setIsConfigured(data.configured ?? true)
      setLastRefreshed(new Date())
    } catch (err: any) {
      toast.error(err.message || "Could not sync student records.")
    } finally {
      setLoadingStudents(false)
      if (showRefreshIndicator) setIsRefreshing(false)
    }
  }

  const fetchLogs = async () => {
    setLoadingLogs(true)
    try {
      const res = await fetch("/api/logs")
      if (!res.ok) throw new Error("Failed to load system logs")
      const data = await res.json()
      setLogs(data.logs || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch audit records.")
    } finally {
      setLoadingLogs(false)
    }
  }

  // Check if a cell is editable by the current logged-in user
  const isCellEditable = (columnName: string) => {
    if (["ID", "LastModifiedBy", "LastModifiedAt"].includes(columnName))
      return false

    const gradeIndex = columns.indexOf("Grade")
    const colIndex = columns.indexOf(columnName)

    if (gradeIndex !== -1 && colIndex !== -1) {
      if (session?.user?.role === "admin") {
        return colIndex <= gradeIndex
      } else {
        return colIndex > gradeIndex
      }
    }

    if (session?.user?.role === "admin") return true
    return allowedColumns.includes(columnName)
  }

  // Handles presence focus broadcast
  const handleCellFocus = async (studentId: string, col: string) => {
    if (!session?.user) return
    const username = session.user.username || "Anonymous"
    const displayName = session.user.displayName || username
    let hash = 0
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colors = [
      "#ef4444",
      "#f97316",
      "#10b981",
      "#06b6d4",
      "#3b82f6",
      "#8b5cf6",
      "#ec4899",
    ]
    const color = colors[Math.abs(hash) % colors.length]

    try {
      await fetch("/api/presence/focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, col, user: displayName, color }),
      })
    } catch {}
  }

  // Handles presence blur broadcast
  const handleCellFocusBlur = async (studentId: string, col: string) => {
    if (!session?.user) return
    const displayName =
      session.user.displayName || session.user.username || "Anonymous"
    try {
      await fetch("/api/presence/blur", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, col, user: displayName }),
      })
    } catch {}
  }

  // Handles inline cell modifications
  const handleCellBlur = async (
    studentId: string,
    columnName: string,
    oldValue: string,
    newValue: string
  ) => {
    if (oldValue === newValue) return // No change

    if (!isCellEditable(columnName)) {
      toast.warning(
        `🔒 Lock: You do not have permission to edit the '${columnName}' column.`
      )
      return
    }

    const cellKey = `${studentId}_${columnName}`
    setSavingCells((prev) => ({ ...prev, [cellKey]: true }))

    try {
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: studentId,
          column: columnName,
          value: newValue,
          sheet: sheetParam,
          spreadsheetId: spreadsheetIdParam,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.error || "Failed to save cell change.")
      }

      toast.success(`Updated '${columnName}' for ${studentId} successfully!`)

      // Refresh student grid and audit logs dynamically
      fetchStudents(false)
      if (session?.user?.role === "admin") {
        fetchLogs()
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save inline cell edit.")
      // Reset local cell to original value by re-fetching
      fetchStudents(false)
    } finally {
      setSavingCells((prev) => ({ ...prev, [cellKey]: false }))
    }
  }

  // Handles creating a new student record (Admin only)
  const handleCreateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStudent.ID || !newStudent.Name || !newStudent.Email) {
      toast.error("Student ID, Name, and Email are mandatory fields.")
      return
    }

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newStudent,
          sheet: sheetParam,
          spreadsheetId: spreadsheetIdParam,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to add student.")

      toast.success(`Successfully added student ${newStudent.ID}!`)
      setIsAddStudentOpen(false)
      setNewStudent({
        ID: "",
        Name: "",
        Email: "",
        Phone: "",
        Course: "",
        Batch: "",
        Status: "Active",
        Score: "",
        Remarks: "",
        Grade: "",
        Comments: "",
        Notes: "",
      })
      fetchStudents(false)
      fetchLogs()
    } catch (err: any) {
      toast.error(err.message || "Failed to save student.")
    }
  }

  // Student Batches & Status options dynamically compiled for filter lists
  const batchOptions = [
    "All",
    ...Array.from(new Set(students.map((s) => s.Batch).filter(Boolean))),
  ]
  const statusOptions = [
    "All",
    ...Array.from(new Set(students.map((s) => s.Status).filter(Boolean))),
  ]

  // Filter students based on query, status, and batch
  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase()
    const matchesSearch =
      !query ||
      Object.values(s).some((val) =>
        String(val || "")
          .toLowerCase()
          .includes(query)
      )

    const matchesStatus = statusFilter === "All" || s.Status === statusFilter
    const matchesBatch = batchFilter === "All" || s.Batch === batchFilter

    return matchesSearch && matchesStatus && matchesBatch
  })

  // Filter audit logs based on query
  const filteredLogs = logs.filter(
    (l) =>
      l.actor.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.actorDisplayName.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.targetRow.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.columnChanged.toLowerCase().includes(logSearchQuery.toLowerCase())
  )

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium tracking-wide text-muted-foreground">
            Loading your session...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-svh w-full max-w-full overflow-x-hidden bg-background p-6 text-foreground">
      <div className="mx-auto w-full max-w-[1600px] space-y-8">
        {/* Header Dashboard Banner */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 animate-pulse rounded-full bg-primary" />
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Secured Sheet Database
                  </span>
                </div>
                <CardTitle className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  Spreadsheet Portal Dashboard
                </CardTitle>
                <CardDescription className="max-w-xl">
                  Logged in as{" "}
                  <span className="font-semibold text-foreground">
                    {session?.user?.displayName || session?.user?.username}
                  </span>{" "}
                  (
                  <span className="font-medium text-primary capitalize">
                    {session?.user?.role}
                  </span>
                  ). Perform atomic inline cell edits instantly below.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Collaborative Presence Indicator Bar */}
        {activeUsers.length > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
              </div>
              <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Collaborative Presence ({activeUsers.length} active)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeUsers.map((u) => (
                <div
                  key={u.username}
                  className="group/avatar relative flex items-center gap-2 rounded-full border border-border bg-muted/50 py-1 pr-3 pl-1 transition-all hover:bg-muted"
                >
                  <img
                    src={u.avatar}
                    alt={u.displayName}
                    className="h-6 w-6 rounded-full bg-background"
                  />
                  <span className="text-xs font-semibold text-foreground">
                    {u.displayName}
                  </span>
                  <span className="absolute bottom-full left-1/2 z-30 mb-1 hidden -translate-x-1/2 rounded bg-foreground px-2 py-1 text-[10px] whitespace-nowrap text-background group-hover/avatar:block">
                    {u.lastAction || "Active now"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Selection Navigation using shadcn/ui Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val: any) => setActiveTab(val)}
          className="w-full"
        >
          <div className="mb-6 border-b border-border pb-2">
            <TabsList>
              <TabsTrigger value="students" className="px-4 py-2 text-sm">
                <Clock className="h-4 w-4" />
                Student Records
              </TabsTrigger>

              {session?.user?.role === "admin" && (
                <>
                  <TabsTrigger value="logs" className="px-4 py-2 text-sm">
                    <FileText className="h-4 w-4" />
                    System Audit Logs
                  </TabsTrigger>
                </>
              )}
            </TabsList>
          </div>

          {/* =========================================================================
              TAB 1: STUDENTS GRID (SPREADSHEET PORTAL)
              ========================================================================= */}
          <TabsContent value="students" className="space-y-6">
            {/* Filter Section */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center">
              <div className="relative flex flex-1 items-center min-w-[200px] lg:flex-[2]">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search student ID, name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full pl-9"
                />
              </div>

              <div className="flex flex-1 items-center gap-2 min-w-[150px]">
                <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Select
                  value={batchFilter}
                  onValueChange={(val) => setBatchFilter(val)}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="All Batches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Batches</SelectItem>
                    {batchOptions.map(
                      (b) =>
                        b !== "All" && (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-1 items-center gap-2 min-w-[150px]">
                <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onValueChange={(val) => setStatusFilter(val)}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    {statusOptions.map(
                      (s) =>
                        s !== "All" && (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-4 px-2">
                 <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                      Sync Status
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      {isRefreshing ? "Refreshing..." : `Updated ${formatDistanceToNow(lastRefreshed, { addSuffix: true })}`}
                    </span>
                 </div>
              </div>

              {session?.user?.role === "admin" && (
                <div className="flex shrink-0 items-center justify-end">
                  <Button
                    onClick={() => setIsAddStudentOpen(true)}
                    className="h-10 w-full lg:w-auto"
                  >
                    <Plus className="h-4 w-4" />
                    Add Student
                  </Button>
                </div>
              )}
            </div>

            {/* Spreadsheet Table Grid Wrapper */}
            <div className="relative w-full max-w-full overflow-hidden rounded-xl border border-border bg-card">
              {!isConfigured ? (
                <div className="py-20">
                  <Empty className="mx-auto max-w-xl p-12">
                    <EmptyMedia variant="icon" className="mb-4 size-14">
                      <Database className="size-7 animate-pulse text-primary" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle className="text-xl font-bold">
                        Google Sheets Unconfigured
                      </EmptyTitle>
                      <EmptyDescription className="mx-auto max-w-md">
                        Please set your{" "}
                        <code className="font-mono text-primary">
                          GOOGLE_CLIENT_EMAIL
                        </code>{" "}
                        and{" "}
                        <code className="font-mono text-primary">
                          GOOGLE_PRIVATE_KEY
                        </code>{" "}
                        environment variables in your deployment or local{" "}
                        <code className="font-mono text-primary">.env</code> to
                        connect to a live spreadsheet.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button
                        onClick={() => fetchStudents(true)}
                        className="mt-4"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Retry Connection
                      </Button>
                    </EmptyContent>
                  </Empty>
                </div>
              ) : loadingStudents && students.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">
                    Retrieving sheet records...
                  </p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-20">
                  <Empty className="mx-auto max-w-md p-12">
                    <EmptyMedia variant="icon" className="mb-4 size-12">
                      <Search className="size-6 text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle className="text-lg font-bold">
                        No records match your filters
                      </EmptyTitle>
                      <EmptyDescription>
                        Try adjusting your search queries or category toggles.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <ScrollArea className="h-[calc(100vh-280px)] w-full max-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {columns.map((col) => {
                          const editable = isCellEditable(col)
                          return (
                            <TableHead
                              key={col}
                              className="px-4 py-3.5 font-semibold tracking-wider whitespace-nowrap"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span>{col}</span>
                                {[
                                  "ID",
                                  "LastModifiedBy",
                                  "LastModifiedAt",
                                ].includes(col) ? (
                                  <Badge
                                    variant="outline"
                                    className="px-1.5 text-[9px] uppercase"
                                  >
                                    SYS
                                  </Badge>
                                ) : editable ? (
                                  <Unlock className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                                )}
                              </div>
                            </TableHead>
                          )
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((stu) => (
                        <TableRow
                          key={stu.ID}
                          className="group transition-all duration-150"
                        >
                          {columns.map((col) => {
                            const val = stu[col as keyof Student] || ""
                            const editable = isCellEditable(col)
                            const cellKey = `${stu.ID}_${col}`
                            const isSaving = savingCells[cellKey]
                            const focusInfo = focusedCells[cellKey]

                            return (
                              <TableCell
                                key={col}
                                className="relative p-1 align-middle"
                              >
                                {isSaving && (
                                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded bg-background/60">
                                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                                  </div>
                                )}
                                {focusInfo && (
                                  <div
                                    className="pointer-events-none absolute -top-3 left-1 z-20 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm"
                                    style={{ backgroundColor: focusInfo.color }}
                                  >
                                    <span>👤 {focusInfo.user}</span>
                                  </div>
                                )}
                                <Input
                                  type="text"
                                  defaultValue={val}
                                  disabled={!editable || isSaving}
                                  onFocus={() => handleCellFocus(stu.ID, col)}
                                  onBlur={(e) => {
                                    handleCellFocusBlur(stu.ID, col)
                                    handleCellBlur(
                                      stu.ID,
                                      col,
                                      val,
                                      e.target.value
                                    )
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur()
                                    }
                                  }}
                                  style={
                                    focusInfo
                                      ? {
                                          borderColor: focusInfo.color,
                                          borderWidth: 2,
                                          backgroundColor: `${focusInfo.color}15`,
                                        }
                                      : {}
                                  }
                                  className={`h-8 w-full rounded-md border-transparent bg-transparent px-3 py-2 text-xs font-medium shadow-none transition-all focus-visible:border-input focus-visible:bg-background ${
                                    editable
                                      ? "cursor-text text-foreground group-hover:bg-muted/50"
                                      : "cursor-not-allowed bg-muted/20 text-muted-foreground select-none"
                                  }`}
                                  placeholder={editable ? "Empty" : "Locked"}
                                />
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              )}
            </div>
          </TabsContent>



          {/* =========================================================================
              TAB 3: SERVER-SIDE SYSTEM AUDIT LOGS (ADMIN ONLY)
              ========================================================================= */}
          <TabsContent value="logs" className="space-y-6">
            {session?.user?.role === "admin" && (
              <>
                {/* Audit Log Filters */}
                <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex w-full max-w-sm items-center">
                    <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search audit log actor, action, target..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="h-10 w-full pl-9"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Total logs:
                    </span>
                    <Badge
                      variant="outline"
                      className="px-2 py-1 text-xs font-bold"
                    >
                      {filteredLogs.length}
                    </Badge>
                  </div>
                </div>

                {/* Logs list table */}
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  {loadingLogs ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-xs font-medium text-muted-foreground">
                        Loading system audit records...
                      </p>
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="py-20">
                      <Empty className="mx-auto max-w-md p-12">
                        <EmptyMedia variant="icon" className="mb-4 size-12">
                          <FileText className="size-6 text-muted-foreground" />
                        </EmptyMedia>
                        <EmptyHeader>
                          <EmptyTitle className="text-lg font-bold">
                            No audit logs found
                          </EmptyTitle>
                        </EmptyHeader>
                      </Empty>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="px-4 py-3.5">
                              Timestamp
                            </TableHead>
                            <TableHead className="px-4 py-3.5">Actor</TableHead>
                            <TableHead className="px-4 py-3.5">Role</TableHead>
                            <TableHead className="px-4 py-3.5">
                              Action
                            </TableHead>
                            <TableHead className="px-4 py-3.5">
                              Target Student/User
                            </TableHead>
                            <TableHead className="px-4 py-3.5">
                              Column Affected
                            </TableHead>
                            <TableHead className="px-4 py-3.5">
                              Old Value
                            </TableHead>
                            <TableHead className="px-4 py-3.5">
                              New Value
                            </TableHead>
                            <TableHead className="px-4 py-3.5">
                              IP Address
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredLogs.map((log, index) => (
                            <TableRow key={index}>
                              <TableCell className="px-4 py-3.5 font-medium whitespace-nowrap text-muted-foreground">
                                <div className="flex flex-col">
                                  <span>{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</span>
                                  <span className="text-[10px] opacity-70">{format(new Date(log.timestamp), "MMM d, HH:mm")}</span>
                                </div>
                              </TableCell>
                              <TableCell className="px-4 py-3.5 font-bold whitespace-nowrap">
                                {log.actorDisplayName} ({log.actor})
                              </TableCell>
                              <TableCell className="px-4 py-3.5 font-semibold text-primary capitalize">
                                {log.actorRole}
                              </TableCell>
                              <TableCell className="px-4 py-3.5">
                                <Badge
                                  variant="outline"
                                  className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                                >
                                  {log.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-3.5 font-bold whitespace-nowrap">
                                {log.targetRow}
                              </TableCell>
                              <TableCell className="px-4 py-3.5 font-semibold whitespace-nowrap">
                                {log.columnChanged}
                              </TableCell>
                              <TableCell
                                className="max-w-[150px] truncate px-4 py-3.5 font-medium"
                                title={log.oldValue}
                              >
                                {log.oldValue || (
                                  <span className="text-muted-foreground italic">
                                    None
                                  </span>
                                )}
                              </TableCell>
                              <TableCell
                                className="max-w-[150px] truncate px-4 py-3.5 font-semibold"
                                title={log.newValue}
                              >
                                {log.newValue || (
                                  <span className="text-muted-foreground italic">
                                    None
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="px-4 py-3.5 font-mono font-medium text-muted-foreground">
                                {log.ip}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* =========================================================================
            MODAL 1: ADD STUDENT (ADMIN ONLY) - using shadcn/ui Dialog
            ========================================================================= */}
        <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
          <DialogContent className="max-w-2xl rounded-3xl p-6 sm:p-8">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold">
                Add New Student Record
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Enter high-fidelity student information into Google Sheets
                database.
              </p>
            </DialogHeader>

            <form
              onSubmit={handleCreateStudentSubmit}
              className="mt-6 space-y-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Student ID *
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. STU100"
                    value={newStudent.ID}
                    onChange={(e) =>
                      setNewStudent((prev) => ({ ...prev, ID: e.target.value }))
                    }
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Full Name *
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={newStudent.Name}
                    onChange={(e) =>
                      setNewStudent((prev) => ({
                        ...prev,
                        Name: e.target.value,
                      }))
                    }
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={newStudent.Email}
                    onChange={(e) =>
                      setNewStudent((prev) => ({
                        ...prev,
                        Email: e.target.value,
                      }))
                    }
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Phone Number
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={newStudent.Phone}
                    onChange={(e) =>
                      setNewStudent((prev) => ({
                        ...prev,
                        Phone: e.target.value,
                      }))
                    }
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Course Name
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Full Stack Web Development"
                    value={newStudent.Course}
                    onChange={(e) =>
                      setNewStudent((prev) => ({
                        ...prev,
                        Course: e.target.value,
                      }))
                    }
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Batch
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Batch A - 2026"
                    value={newStudent.Batch}
                    onChange={(e) =>
                      setNewStudent((prev) => ({
                        ...prev,
                        Batch: e.target.value,
                      }))
                    }
                    className="h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Status
                  </label>
                  <Select
                    value={newStudent.Status}
                    onValueChange={(val) =>
                      setNewStudent((prev) => ({ ...prev, Status: val }))
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Active" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Grade (or Score)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. A+"
                    value={newStudent.Grade}
                    onChange={(e) =>
                      setNewStudent((prev) => ({
                        ...prev,
                        Grade: e.target.value,
                      }))
                    }
                    className="h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  Internal Remarks
                </label>
                <textarea
                  placeholder="Provide performance feedback..."
                  value={newStudent.Remarks}
                  onChange={(e) =>
                    setNewStudent((prev) => ({
                      ...prev,
                      Remarks: e.target.value,
                    }))
                  }
                  className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs focus:border-ring focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border pt-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Student</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>


      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-10 w-10 animate-spin text-primary" />
            <p className="animate-pulse text-sm font-medium tracking-wide text-muted-foreground">
              Loading dashboard elements...
            </p>
          </div>
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  )
}
