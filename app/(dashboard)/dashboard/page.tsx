"use client"

import React, { useState, useEffect, Suspense, useRef, useMemo } from "react"
import { CalendarHeatmap } from "@/components/ui/calendar-heatmap"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
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
  Filter,
  Check,
  Eye,
  EyeOff,
  Key,
  BarChart3,
  TrendingUp,
  Activity,
  FileSpreadsheet,
} from "lucide-react"
import Icon from "@/components/icons/Icon"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  LineChart,
  Line,
  RadialBarChart,
  RadialBar,
  Legend,
  ComposedChart,
} from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

// shadcn/ui components
import { AnimatedNumber } from "@/components/ui/animated-number"
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
import { PageHeader } from "@/components/page-header"
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
import { EmptyState } from "@/components/empty-state"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { SkeletonBlock } from "@/components/ui/skeleton-block"

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
  details?: string
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
    | "analytics"
    | null
  const activeTab = tabParam || "analytics"
  const sheetParam = searchParams.get("sheet") || "Students"
  const spreadsheetIdParam = searchParams.get("spreadsheetId") || ""

  const setActiveTab = (tab: string) => {
    router.push(
      `/dashboard?tab=${tab}${spreadsheetIdParam ? `&spreadsheetId=${encodeURIComponent(spreadsheetIdParam)}` : ""}`
    )
  }

  const queryClient = useQueryClient()

  // Global State
  const [students, setStudents] = useState<Student[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [allowedColumns, setAllowedColumns] = useState<string[]>([])
  const [isSimulated, setIsSimulated] = useState<boolean>(true)
  const [isConfigured, setIsConfigured] = useState<boolean>(true)

  // Audit Logs handled by useQuery

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
  const lastHealthTimestampRef = useRef<string>("")
  const [isSubmittingStudent, setIsSubmittingStudent] = useState<boolean>(false)

  // Layer 1: Main Data Fetching via React Query
  const {
    data: studentData,
    isFetching: isQueryFetching,
    isLoading: isQueryLoading,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ["students", sheetParam, spreadsheetIdParam],
    queryFn: async () => {
      const url = `/api/students?sheet=${encodeURIComponent(sheetParam)}${spreadsheetIdParam ? `&spreadsheetId=${encodeURIComponent(spreadsheetIdParam)}` : ""}`
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to load student records.")
      }
      return res.json()
    },
    enabled: sessionStatus === "authenticated",
    staleTime: 10000, // 10 seconds
  })

  // Layer 1.5: Audit Logs Fetching via React Query (Admin only)
  const {
    data: logsData,
    isFetching: isLogsFetching,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const res = await fetch("/api/logs")
      if (!res.ok) throw new Error("Failed to load system logs")
      const data = await res.json()
      return data.logs || []
    },
    enabled:
      sessionStatus === "authenticated" && session?.user?.role === "admin",
    staleTime: 30000,
  })

  const logs = logsData || []

  // Layer 1.8: Analytics Data Fetching via React Query
  const { data: analyticsData, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics")
      if (!res.ok) throw new Error("Failed to load analytics")
      return res.json()
    },
    enabled: sessionStatus === "authenticated",
    staleTime: 60000,
  })

  // Synchronize query data with local state
  useEffect(() => {
    if (studentData) {
      setStudents(studentData.data || [])
      setColumns(studentData.columns || [])
      setAllowedColumns(studentData.allowedColumns || [])
      setIsSimulated(studentData.simulated ?? true)
      setIsConfigured(studentData.configured ?? true)
      setLastRefreshed(new Date())
    }
  }, [studentData])

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      // Data handled by useQuery
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
      "var(--color-chart-1)",
      "var(--color-chart-2)",
      "var(--color-chart-3)",
      "var(--color-chart-4)",
      "var(--color-chart-5)",
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
          queryClient.invalidateQueries({ queryKey: ["students"] })
          queryClient.invalidateQueries({ queryKey: ["logs"] })
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
            queryClient.invalidateQueries({ queryKey: ["students"] })
          }
          lastHealthTimestampRef.current = data.lastModified
        }
      } catch {}
    }, 10000)

    return () => clearInterval(pollInterval)
  }, [sessionStatus])

  // Manual refresh handler for the UI button
  const handleManualRefresh = async () => {
    const refreshPromise = Promise.all([
      refetchStudents(),
      session?.user?.role === "admin" ? refetchLogs() : Promise.resolve(),
    ])

    toast.promise(refreshPromise, {
      loading: "Fetching latest records...",
      success: "Dashboard updated!",
      error: (err) => err.message || "Failed to sync data",
    })
  }

  // Check if a cell is editable by the current logged-in user
  const isCellEditable = (columnName: string) => {
    if (["ID", "LastModifiedBy", "LastModifiedAt"].includes(columnName))
      return false

    const gradeIndex = columns.indexOf("Grade")
    const colIndex = columns.indexOf(columnName)

    const user = session?.user as any
    const hasPerSheet =
      user?.perSheetPermissions &&
      Object.keys(user.perSheetPermissions).length > 0
    const hasCustomCols = user?.allowedColumns && user?.allowedColumns !== "*"
    const isCustomizedAdmin =
      user?.role === "admin" && (hasPerSheet || hasCustomCols)

    if (isCustomizedAdmin) {
      return allowedColumns.includes(columnName)
    }

    if (gradeIndex !== -1 && colIndex !== -1) {
      if (user?.role === "admin") {
        return colIndex <= gradeIndex
      } else {
        return colIndex > gradeIndex
      }
    }

    if (user?.role === "admin") return true
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
      "var(--color-chart-1)",
      "var(--color-chart-2)",
      "var(--color-chart-3)",
      "var(--color-chart-4)",
      "var(--color-chart-5)",
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

    const updatePromise = (async () => {
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

      // Refresh student grid and audit logs dynamically
      await queryClient.invalidateQueries({ queryKey: ["students"] })
      if (session?.user?.role === "admin") {
        await queryClient.invalidateQueries({ queryKey: ["logs"] })
      }
      return result
    })()

    toast.promise(updatePromise, {
      loading: `Saving change to '${columnName}'...`,
      success: `Updated '${columnName}' for ${studentId} successfully!`,
      error: (err) => err.message || "Failed to save inline cell edit.",
    })

    try {
      await updatePromise
    } catch (err: any) {
      // Re-fetch to revert local state if failed
      await queryClient.invalidateQueries({ queryKey: ["students"] })
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

    setIsSubmittingStudent(true)
    const createPromise = (async () => {
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
      await queryClient.invalidateQueries({ queryKey: ["students"] })
      await queryClient.invalidateQueries({ queryKey: ["logs"] })
      return result
    })()

    toast.promise(createPromise, {
      loading: "Adding student to database...",
      success: `Successfully added student ${newStudent.ID}!`,
      error: (err) => err.message || "Failed to save student.",
    })

    try {
      await createPromise
    } catch (err) {
    } finally {
      setIsSubmittingStudent(false)
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
    (l: AuditLog) =>
      l.actor.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.actorDisplayName.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.targetRow.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.columnChanged.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      (l.details || "").toLowerCase().includes(logSearchQuery.toLowerCase())
  )

  const totalStudents = analyticsData?.totalStudents || 0
  const activeStudentsCount = analyticsData?.activeStudentsCount || 0
  const averageScore = analyticsData?.averageScore || 0
  const batchChartData: { name: string; count: number }[] =
    analyticsData?.batchChartData || []
  const statusChartData: { name: string; count: number }[] =
    analyticsData?.statusChartData || []
  const courseChartData: { name: string; count: number }[] =
    analyticsData?.courseChartData || []
  const scoreChartData: { range: string; count: number }[] =
    analyticsData?.scoreChartData || []
  const timelineData: { month: string; users: number; students: number }[] =
    analyticsData?.timelineData || []
  const totalSystemUsers = analyticsData?.totalUsers || 0
  const activeSystemUsers = analyticsData?.activeUsers || 0

  const chartConfig = {
    count: { label: "Count", color: "var(--color-sky)" },
    users: { label: "Users", color: "var(--color-sky)" },
    students: { label: "Students", color: "var(--color-info)" },
    score: { label: "Score", color: "var(--color-warning)" },
    course: { label: "Course", color: "var(--color-success)" },
    status: { label: "Status", color: "var(--color-primary)" },
  } satisfies ChartConfig

  const COLORS = [
    "var(--color-sky)",
    "var(--color-info)",
    "var(--color-warning)",
    "var(--color-success)",
    "var(--color-primary)",
  ]

  const weightedDates = useMemo(() => {
    return Array.from({ length: 365 }).map((_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (364 - i))
      return {
        date,
        weight: Math.floor(Math.random() * 5),
      }
    })
  }, [])

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4 md:p-8">
        <div className="flex w-full max-w-5xl flex-col gap-6">
          <div className="flex items-center justify-between">
            <SkeletonBlock variant="rectangular" width={250} height={40} />
            <SkeletonBlock variant="circular" width={40} height={40} />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock
                key={i}
                variant="rectangular"
                width="100%"
                height={120}
              />
            ))}
          </div>
          <SkeletonBlock
            variant="rectangular"
            width="100%"
            height={400}
            showSpinner={true}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full space-y-4">
      <PageHeader
        subtitle="Secured Sheet Database"
        title="Spreadsheet Portal Dashboard"
        description={
          <>
            Logged in as{" "}
            <span className="font-semibold text-foreground">
              {session?.user?.displayName || session?.user?.username}
            </span>{" "}
            ({session?.user?.role || "Sub-Admin"}). Accessing real-time database
            records with enterprise-grade synchronization.
          </>
        }
        pulse={true}
      />

      {/* Tab Selection Navigation using shadcn/ui Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val: any) => setActiveTab(val)}
        className="w-full"
      >
        <div className="mb-6 border-b border-border pb-2">
          <TabsList>
            <TabsTrigger value="analytics" className="px-4 py-2 text-sm">
              <BarChart3 className="h-4 w-4" />
              Analytics Overview
            </TabsTrigger>
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
              TAB 0: ANALYTICS OVERVIEW
              ========================================================================= */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-4 lg:grid-cols-4">
            <div className="col-span-1 md:col-span-4 grid gap-4 grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-primary bg-card hover:bg-muted/40 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Shield className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  <AnimatedNumber value={totalSystemUsers} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Registered on platform
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-success bg-card hover:bg-muted/40 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Users
                </CardTitle>
                <Activity className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  <AnimatedNumber value={activeSystemUsers} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently active accounts
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-sky bg-card hover:bg-muted/40 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Students
                </CardTitle>
                <Users className="h-4 w-4 text-sky" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-sky">
                  <AnimatedNumber value={totalStudents} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all batches
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-info bg-card hover:bg-muted/40 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Students
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-info" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-info">
                  <AnimatedNumber value={activeStudentsCount} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently enrolled
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-warning bg-card hover:bg-muted/40 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Score
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">
                  <AnimatedNumber
                    value={averageScore}
                    format={{
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Mean performance
                </p>
              </CardContent>
            </Card>

            </div>
          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4 auto-rows-min col-span-1 md:col-span-4 lg:col-span-4">
            <Card className="border-l-4 border-l-secondary bg-card hover:bg-muted/40 transition-colors shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Batches</CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-secondary-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-secondary-foreground">
                  <AnimatedNumber value={batchChartData.length} />
                </div>
                <p className="text-xs text-muted-foreground">Active cohorts</p>
              </CardContent>
            </Card>

            {/* 1. Area Chart (Timeline) */}
            <Card className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 group hover:shadow-md transition-all duration-300 border-border hover:border-sky/50 flex flex-col">
              <CardHeader>
                <CardTitle>Platform Growth Over Time</CardTitle>
                <CardDescription>
                  Historical data for students and users
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={chartConfig}
                  className="h-[350px] w-full"
                >
                  <AreaChart
                    data={timelineData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorStudents"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-info)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-info)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorUsers"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-sky)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-sky)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="students"
                      stroke="var(--color-info)"
                      fillOpacity={1}
                      fill="url(#colorStudents)"
                    />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="var(--color-sky)"
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Grid of diverse charts inspired by reference */}
              {/* 1. Bar Chart - Vertical */}
              <Card className="col-span-1 group hover:shadow-md transition-all duration-300 border-border hover:border-sky/50">
                <CardHeader>
                  <CardTitle>Score Distribution</CardTitle>
                  <CardDescription>Vertical Bar Chart</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={chartConfig}
                    className="h-[250px] w-full"
                  >
                    <BarChart
                      data={scoreChartData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="range"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <YAxis
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="count"
                        fill="var(--color-sky)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* 2. Line Chart */}
              <Card className="col-span-1 md:col-span-2 lg:col-span-2 group hover:shadow-md transition-all duration-300 border-border hover:border-sky/50">
                <CardHeader>
                  <CardTitle>Trend Analysis</CardTitle>
                  <CardDescription>Line Chart with Dots</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={chartConfig}
                    className="h-[250px] w-full"
                  >
                    <LineChart
                      data={timelineData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line
                        type="monotone"
                        dataKey="students"
                        stroke="var(--color-info)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="users"
                        stroke="var(--color-warning)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* 3. Bar Chart - Horizontal */}
              <Card className="col-span-1 md:col-span-2 lg:col-span-2 group hover:shadow-md transition-all duration-300 border-border hover:border-sky/50">
                <CardHeader>
                  <CardTitle>Batch Sizes</CardTitle>
                  <CardDescription>Horizontal Bar Chart</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={chartConfig}
                    className="h-[250px] w-full"
                  >
                    <BarChart
                      data={batchChartData}
                      layout="vertical"
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                      <XAxis type="number" tickLine={false} axisLine={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={80}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="count"
                        fill="var(--color-success)"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* 4. Donut Chart */}
              <Card className="col-span-1 group hover:shadow-md transition-all duration-300 border-border hover:border-sky/50">
                <CardHeader>
                  <CardTitle>Status Breakdown</CardTitle>
                  <CardDescription>Donut Chart</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={chartConfig}
                    className="h-[250px] w-full"
                  >
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={statusChartData}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                      >
                        {statusChartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* 5. Radar Chart */}
              <Card className="col-span-1 md:col-span-2 lg:col-span-2 group hover:shadow-md transition-all duration-300 border-border hover:border-sky/50">
                <CardHeader>
                  <CardTitle>Course Popularity</CardTitle>
                  <CardDescription>Radar Chart</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={chartConfig}
                    className="h-[250px] w-full"
                  >
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="70%"
                      data={courseChartData}
                    >
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="name"
                        tick={{ fill: "var(--foreground)", fontSize: 10 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, "auto"]}
                        tick={false}
                      />
                      <Radar
                        name="Students"
                        dataKey="count"
                        stroke="var(--color-primary)"
                        fill="var(--color-primary)"
                        fillOpacity={0.6}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RadarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* 6. Radial Bar Chart */}
              <Card className="col-span-1 group hover:shadow-md transition-all duration-300 border-border hover:border-sky/50">
                <CardHeader>
                  <CardTitle>Score Ranges</CardTitle>
                  <CardDescription>Radial Bar Chart</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={chartConfig}
                    className="flex h-[250px] w-full items-center justify-center"
                  >
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="20%"
                      outerRadius="100%"
                      barSize={10}
                      data={scoreChartData.map((d, i) => ({
                        ...d,
                        fill: COLORS[i % COLORS.length],
                      }))}
                      width={300}
                      height={250}
                    >
                      <RadialBar background dataKey="count" cornerRadius={10} />
                      <Legend
                        iconSize={10}
                        layout="vertical"
                        verticalAlign="middle"
                        wrapperStyle={{ right: 0, fontSize: "12px" }}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RadialBarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
              {/* 7. Heatmap (Activity) */}
              <Card className="col-span-1 md:col-span-4 lg:col-span-4 group hover:shadow-md transition-all duration-300 border-border hover:border-sky/50 overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-warning" />
                    Activity Heatmap
                  </CardTitle>
                  <CardDescription>System interaction frequency mapped over the year</CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center p-6 overflow-x-auto">
                  <CalendarHeatmap
                    levelClassNames={[
                      "bg-muted",
                      "bg-sky/20",
                      "bg-sky/40",
                      "bg-sky/60",
                      "bg-sky/80",
                      "bg-sky",
                    ]}
                    data={weightedDates.map((d) => ({
                      date: d.date,
                      value: d.weight,
                    }))}
                  />
                </CardContent>
              </Card>
          </div>

          </div>

          <Card className="col-span-1 md:col-span-4 lg:col-span-4 border-border hover:border-sky/50 transition-all duration-300">
            <CardHeader>
              <CardTitle>Batch Performance Breakdown</CardTitle>
              <CardDescription>Detailed metrics per batch</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Total Students</TableHead>
                    <TableHead>Average Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batchChartData.map(({ name: batch, count }) => {
                    const batchStudents = students.filter(
                      (s) => s.Batch === batch
                    )
                    const avgScore =
                      batchStudents.length > 0
                        ? batchStudents.reduce(
                            (acc, s) => acc + parseFloat(s.Score || "0"),
                            0
                          ) / batchStudents.length
                        : 0
                    return (
                      <TableRow key={batch}>
                        <TableCell className="font-medium">{batch}</TableCell>
                        <TableCell>{count as number}</TableCell>
                        <TableCell>{avgScore.toFixed(1)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* =========================================================================
              TAB 1: STUDENTS GRID (SPREADSHEET PORTAL)
              ========================================================================= */}
        <TabsContent value="students" className="space-y-6">
          {/* Filter Section */}
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center">
            <div className="relative flex min-w-[200px] flex-1 items-center lg:flex-[2]">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search student ID, name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 w-full pl-9"
              />
            </div>

            <div className="flex min-w-[150px] flex-1 items-center gap-2">
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

            <div className="flex min-w-[150px] flex-1 items-center gap-2">
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
                <span className="text-tiny font-bold tracking-widest text-muted-foreground/60 uppercase">
                  Sync Status
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {isQueryFetching || isLogsFetching
                    ? "Refreshing..."
                    : `Updated ${formatDistanceToNow(lastRefreshed, { addSuffix: true })}`}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleManualRefresh}
                disabled={isQueryFetching || isLogsFetching}
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4 text-muted-foreground",
                    (isQueryFetching || isLogsFetching) && "animate-spin"
                  )}
                />
              </Button>
            </div>

            {session?.user?.role === "admin" && (
              <div className="flex shrink-0 items-center justify-end">
                <Button
                  onClick={() => setIsAddStudentOpen(true)}
                  className="w-full lg:w-auto"
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
                <EmptyState
                  title="Google Sheets Unconfigured"
                  description={
                    <>
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
                    </>
                  }
                  icon={
                    <Icon
                      name="GoogleSheets2026"
                      className="size-7 animate-pulse text-primary"
                    />
                  }
                  className="mx-auto max-w-xl p-12"
                  action={
                    <Button
                      onClick={handleManualRefresh}
                      disabled={isQueryFetching || isLogsFetching}
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          (isQueryFetching || isLogsFetching) && "animate-spin"
                        )}
                      />
                      Retry Connection
                    </Button>
                  }
                />
              </div>
            ) : isQueryLoading && students.length === 0 ? (
              <div className="flex flex-col gap-2 py-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonBlock
                    key={i}
                    variant="rectangular"
                    width="100%"
                    height={64}
                    className="rounded-md"
                  />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-20">
                <EmptyState
                  variant="muted"
                  title="No records match your filters"
                  description="Try adjusting your search queries or category toggles."
                  icon={<Search className="size-6" />}
                  className="mx-auto max-w-md p-12"
                />
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-280px)] w-full max-w-full">
                <Table noWrapper className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      {columns.map((col) => {
                        const editable = isCellEditable(col)
                        return (
                          <TableHead
                            key={col}
                            className="font-semibold tracking-wider whitespace-nowrap"
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
                                  className="text-tiny px-1.5 uppercase"
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
                                  className="text-tiny pointer-events-none absolute -top-3 left-1 z-20 flex items-center gap-1 rounded px-1.5 py-0.5 font-bold text-white shadow-sm"
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
                                        backgroundColor: `color-mix(in srgb, ${focusInfo.color} 15%, transparent)`,
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
                {isLogsFetching && logs.length === 0 ? (
                  <div className="flex flex-col gap-1 p-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonBlock
                        key={i}
                        variant="rectangular"
                        width="100%"
                        height={48}
                        className="rounded-sm"
                      />
                    ))}
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="py-20">
                    <EmptyState
                      variant="muted"
                      title="No audit logs found"
                      description={null}
                      icon={<FileText className="size-6" />}
                      className="mx-auto max-w-md p-12"
                    />
                  </div>
                ) : (
                  <ScrollArea className="w-full">
                    <Table noWrapper className="min-w-max">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="">Timestamp</TableHead>
                          <TableHead className="">Actor</TableHead>
                          <TableHead className="">Role</TableHead>
                          <TableHead className="">Action</TableHead>
                          <TableHead className="">
                            Target Student/User
                          </TableHead>
                          <TableHead className="">Column Affected</TableHead>
                          <TableHead className="">Old Value</TableHead>
                          <TableHead className="">New Value</TableHead>
                          <TableHead className="">IP Address</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLogs.map((log: AuditLog, index: number) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium whitespace-nowrap text-muted-foreground">
                              <div className="flex flex-col">
                                <span>
                                  {formatDistanceToNow(
                                    new Date(log.timestamp),
                                    { addSuffix: true }
                                  )}
                                </span>
                                <span className="text-tiny opacity-70">
                                  {format(
                                    new Date(log.timestamp),
                                    "MMM d, yyyy HH:mm"
                                  )}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="font-bold whitespace-nowrap">
                              {log.actorDisplayName} ({log.actor})
                            </TableCell>
                            <TableCell className="font-semibold text-primary capitalize">
                              {log.actorRole}
                            </TableCell>
                            <TableCell className="">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-tiny tracking-wider uppercase",
                                  log.action.includes("CREATE") &&
                                    "border-success/20 bg-success/10 text-success",
                                  log.action.includes("UPDATE") &&
                                    "border-info/20 bg-info/10 text-info",
                                  log.action.includes("DELETE") &&
                                    "border-destructive/20 bg-destructive/10 text-destructive",
                                  log.action === "LOGIN" &&
                                    "border-primary/20 bg-primary/10 text-primary",
                                  log.action === "LOGOUT" &&
                                    "border-warning/20 bg-warning/10 text-warning",
                                  log.action.includes("CONNECT") &&
                                    "border-sky/20 bg-sky/10 text-sky"
                                )}
                              >
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold whitespace-nowrap">
                              {log.targetRow}
                            </TableCell>
                            <TableCell className="font-semibold whitespace-nowrap">
                              {log.columnChanged}
                            </TableCell>
                            <TableCell
                              className="max-w-[150px] truncate font-medium"
                              title={log.oldValue}
                            >
                              {log.oldValue || (
                                <span className="text-muted-foreground italic">
                                  None
                                </span>
                              )}
                            </TableCell>
                            <TableCell
                              className="max-w-[150px] truncate font-semibold"
                              title={log.newValue}
                            >
                              {log.newValue || (
                                <span className="text-muted-foreground italic">
                                  None
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono font-medium text-muted-foreground">
                              {log.ip}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* =========================================================================
            MODAL 1: ADD STUDENT (ADMIN ONLY) - using shadcn/ui Dialog
            ========================================================================= */}
      <Dialog
        open={isAddStudentOpen}
        onOpenChange={setIsAddStudentOpen}
        name="addStudent"
      >
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

          <form onSubmit={handleCreateStudentSubmit} className="mt-6 space-y-4">
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
              <Button type="submit" disabled={isSubmittingStudent}>
                {isSubmittingStudent && (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Student
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
          <div className="flex items-center justify-between">
            <SkeletonBlock
              variant="rectangular"
              width={250}
              height={40}
              className="rounded-lg"
            />
            <SkeletonBlock variant="circular" width={40} height={40} />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock
                key={i}
                variant="rectangular"
                width="100%"
                height={120}
                className="rounded-xl"
              />
            ))}
          </div>
          <SkeletonBlock
            variant="rectangular"
            width="100%"
            height={500}
            className="rounded-xl"
            showSpinner={true}
          />
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  )
}
