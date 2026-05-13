"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
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
} from "lucide-react";

// shadcn/ui components
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

interface Student {
  ID: string;
  Name: string;
  Email: string;
  Phone: string;
  Course: string;
  Batch: string;
  Status: string;
  Score: string;
  Remarks: string;
  Grade: string;
  Comments: string;
  Notes: string;
  LastModifiedBy?: string;
  LastModifiedAt?: string;
}

interface User {
  username: string;
  displayName: string;
  role: string;
  allowedColumns: string;
  isActive: string;
  createdAt: string;
  createdBy: string;
}

interface AuditLog {
  timestamp: string;
  actor: string;
  actorDisplayName: string;
  actorRole: string;
  action: string;
  targetRow: string;
  columnChanged: string;
  oldValue: string;
  newValue: string;
  ip: string;
}

function DashboardPageContent() {
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab") as "students" | "users" | "logs" | null;
  const activeTab = tabParam || "students";

  const setActiveTab = (tab: string) => {
    router.push(`/dashboard?tab=${tab}`);
  };

  // Global State
  const [students, setStudents] = useState<Student[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [allowedColumns, setAllowedColumns] = useState<string[]>([]);
  const [isSimulated, setIsSimulated] = useState<boolean>(true);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [loadingStudents, setLoadingStudents] = useState<boolean>(true);

  // Sub-admins list (Admin only)
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  // Audit Logs (Admin only)
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [batchFilter, setBatchFilter] = useState<string>("All");

  // Sub-admin search & Audit logs search
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [logSearchQuery, setLogSearchQuery] = useState<string>("");

  // Saving states for inline cells: studentId_columnName -> boolean
  const [savingCells, setSavingCells] = useState<Record<string, boolean>>({});

  // Modals & New Record States
  const [isAddStudentOpen, setIsAddStudentOpen] = useState<boolean>(false);
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
  });

  const [isAddUserOpen, setIsAddUserOpen] = useState<boolean>(false);
  const [newUser, setNewUser] = useState({
    username: "",
    displayName: "",
    password: "",
    allowedColumns: "Comments,Notes",
  });

  const [editingAllowedColsUser, setEditingAllowedColsUser] = useState<string | null>(null);
  const [tempAllowedColsValue, setTempAllowedColsValue] = useState<string>("");

  // Auto Refresh
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchStudents();
      if (session?.user?.role === "admin") {
        fetchUsers();
        fetchLogs();
      }
    }
  }, [sessionStatus, session]);

  const fetchStudents = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setIsRefreshing(true);
    setLoadingStudents(true);
    try {
      const res = await fetch("/api/students");
      if (!res.ok) throw new Error("Failed to load students");
      const data = await res.json();
      setStudents(data.data || []);
      setColumns(data.columns || []);
      setAllowedColumns(data.allowedColumns || []);
      setIsSimulated(data.simulated ?? true);
      setIsConfigured(data.configured ?? true);
      setLastRefreshed(new Date());
    } catch (err: any) {
      toast.error(err.message || "Could not sync student records.");
    } finally {
      setLoadingStudents(false);
      if (showRefreshIndicator) setIsRefreshing(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch users list.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/logs");
      if (!res.ok) throw new Error("Failed to load system logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch audit records.");
    } finally {
      setLoadingLogs(false);
    }
  };

  // Check if a cell is editable by the current logged-in user
  const isCellEditable = (columnName: string) => {
    if (session?.user?.role === "admin") return true;
    if (["ID", "LastModifiedBy", "LastModifiedAt"].includes(columnName)) return false;

    // Sub-admins can't edit ID, Name, Email, Phone, Course, Batch, Status, Score, Remarks, Grade (columns <= M/Grade)
    const adminOnlyCols = [
      "Name",
      "Email",
      "Phone",
      "Course",
      "Batch",
      "Status",
      "Score",
      "Remarks",
      "Grade",
    ];

    if (adminOnlyCols.includes(columnName)) return false;

    // Must be in their list of allowedColumns
    return allowedColumns.includes(columnName);
  };

  // Handles inline cell modifications
  const handleCellBlur = async (studentId: string, columnName: string, oldValue: string, newValue: string) => {
    if (oldValue === newValue) return; // No change

    if (!isCellEditable(columnName)) {
      toast.warning(`🔒 Lock: You do not have permission to edit the '${columnName}' column.`);
      return;
    }

    const cellKey = `${studentId}_${columnName}`;
    setSavingCells((prev) => ({ ...prev, [cellKey]: true }));

    try {
      const res = await fetch("/api/students", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: studentId, column: columnName, value: newValue }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to save cell change.");
      }

      toast.success(`Updated '${columnName}' for ${studentId} successfully!`, {
        icon: <CheckCircle2 className="h-5 w-5 text-emerald-500 animate-pulse" />,
      });

      // Refresh student grid and audit logs dynamically
      fetchStudents(false);
      if (session?.user?.role === "admin") {
        fetchLogs();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save inline cell edit.");
      // Reset local cell to original value by re-fetching
      fetchStudents(false);
    } finally {
      setSavingCells((prev) => ({ ...prev, [cellKey]: false }));
    }
  };

  // Handles creating a new student record (Admin only)
  const handleCreateStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.ID || !newStudent.Name || !newStudent.Email) {
      toast.error("Student ID, Name, and Email are mandatory fields.");
      return;
    }

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStudent),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to add student.");

      toast.success(`Successfully added student ${newStudent.ID}!`);
      setIsAddStudentOpen(false);
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
      });
      fetchStudents(false);
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || "Failed to save student.");
    }
  };

  // Handles creating a new sub-admin user account (Admin only)
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.displayName || !newUser.password) {
      toast.error("All user account fields are required.");
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to register sub-admin.");

      toast.success(`Successfully registered sub-admin user: ${newUser.username}`);
      setIsAddUserOpen(false);
      setNewUser({
        username: "",
        displayName: "",
        password: "",
        allowedColumns: "Comments,Notes",
      });
      fetchUsers();
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || "Failed to save sub-admin.");
    }
  };

  // Toggle user activation status (Admin only)
  const handleToggleUserActive = async (username: string, currentActive: string) => {
    const nextActive = currentActive === "TRUE" ? "FALSE" : "TRUE";
    try {
      const res = await fetch(`/api/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to change user status.");

      toast.success(`User '${username}' activation updated successfully.`);
      fetchUsers();
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle user status.");
    }
  };

  // Saves updated allowed columns for a sub-admin (Admin only)
  const handleSaveAllowedCols = async (username: string) => {
    try {
      const res = await fetch(`/api/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowedColumns: tempAllowedColsValue }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update columns.");

      toast.success(`Permissions updated successfully for user ${username}.`);
      setEditingAllowedColsUser(null);
      fetchUsers();
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || "Failed to save user columns.");
    }
  };

  // Reset Sub-admin Password
  const handleResetPassword = async (username: string) => {
    const newPass = prompt(`Enter a new secure password for sub-admin '${username}':`);
    if (newPass === null) return;
    if (newPass.trim().length < 4) {
      toast.error("Password must be at least 4 characters long.");
      return;
    }

    try {
      const res = await fetch(`/api/users/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPass.trim() }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to reset password.");

      toast.success(`Password has been reset successfully for user '${username}'.`);
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password.");
    }
  };

  // Student Batches & Status options dynamically compiled for filter lists
  const batchOptions = ["All", ...Array.from(new Set(students.map((s) => s.Batch).filter(Boolean)))];
  const statusOptions = ["All", ...Array.from(new Set(students.map((s) => s.Status).filter(Boolean)))];

  // Filter students based on query, status, and batch
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.ID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.Name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.Email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.Course || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "All" || s.Status === statusFilter;
    const matchesBatch = batchFilter === "All" || s.Batch === batchFilter;

    return matchesSearch && matchesStatus && matchesBatch;
  });

  // Filter users based on query
  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.displayName.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  // Filter audit logs based on query
  const filteredLogs = logs.filter(
    (l) =>
      l.actor.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.actorDisplayName.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.action.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.targetRow.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      l.columnChanged.toLowerCase().includes(logSearchQuery.toLowerCase())
  );

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-medium tracking-wide text-slate-400">Loading your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-16 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 h-[500px] w-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-[-30%] right-[-5%] h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-[1600px] px-4 pt-8 sm:px-6 lg:px-8 relative z-10">
        {/* Header Dashboard Banner */}
        <div className="relative mb-8 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold tracking-wider text-emerald-500 uppercase">
                  Secured Sheet Database
                </span>
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Spreadsheet Portal <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">Dashboard</span>
              </h1>
              <p className="text-sm text-slate-400 max-w-xl">
                Logged in as <span className="font-semibold text-white">{session?.user?.displayName || session?.user?.username}</span> (
                <span className="capitalize text-indigo-400 font-medium">{session?.user?.role}</span>). Perform atomic inline cell edits instantly below.
              </p>
            </div>

            {/* Config & Database Indicator Status */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 shadow-inner">
                <Database className={`h-5 w-5 ${isSimulated ? "text-amber-500" : "text-emerald-500"} animate-pulse`} />
                <div className="text-left">
                  <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Database Mode</p>
                  <p className="text-xs font-bold text-slate-300">
                    {!isConfigured ? "Unconfigured Sheet" : isSimulated ? "Simulated Backup" : "Live Google Sheets API"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => fetchStudents(true)}
                disabled={isRefreshing}
                className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 hover:bg-slate-800 active:bg-slate-900 px-4 py-3 text-xs font-semibold text-slate-300 transition-all duration-200"
              >
                <RefreshCw className={`h-4 w-4 text-indigo-400 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Syncing..." : "Sync Sheet"}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Selection Navigation using shadcn/ui Tabs */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
          <div className="mb-6 border-b border-slate-800 pb-2">
            <TabsList className="bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/80 flex gap-1 w-fit">
              <TabsTrigger value="students" className="rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-indigo-600/15 data-[state=active]:border-indigo-500/30 data-[state=active]:text-indigo-400 text-slate-400 hover:text-slate-200 transition-all">
                <Clock className="h-4 w-4 mr-2" />
                Student Records
              </TabsTrigger>

              {session?.user?.role === "admin" && (
                <>
                  <TabsTrigger value="users" className="rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-indigo-600/15 data-[state=active]:border-indigo-500/30 data-[state=active]:text-indigo-400 text-slate-400 hover:text-slate-200 transition-all">
                    <Users className="h-4 w-4 mr-2" />
                    Sub-Admin Accounts
                  </TabsTrigger>

                  <TabsTrigger value="logs" className="rounded-xl px-4 py-2 text-sm font-semibold data-[state=active]:bg-indigo-600/15 data-[state=active]:border-indigo-500/30 data-[state=active]:text-indigo-400 text-slate-400 hover:text-slate-200 transition-all">
                    <FileText className="h-4 w-4 mr-2" />
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
            <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-md md:grid-cols-4">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type="text"
                  placeholder="Search student ID, name, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-slate-800 bg-slate-950 py-2.5 pr-4 pl-10 text-xs font-medium text-slate-200 placeholder:text-slate-600 focus-visible:border-indigo-500/60 focus-visible:ring-indigo-500/40 h-10"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500 shrink-0" />
                <Select value={batchFilter} onValueChange={(val) => setBatchFilter(val)}>
                  <SelectTrigger className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 focus:border-indigo-500/60 h-10">
                    <SelectValue placeholder="All Batches" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="All">All Batches</SelectItem>
                    {batchOptions.map((b) => b !== "All" && <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-slate-500 shrink-0" />
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val)}>
                  <SelectTrigger className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 focus:border-indigo-500/60 h-10">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                    <SelectItem value="All">All Statuses</SelectItem>
                    {statusOptions.map((s) => s !== "All" && <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {session?.user?.role === "admin" && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setIsAddStudentOpen(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg transition-all duration-200 h-10"
                  >
                    <Plus className="h-4 w-4" />
                    Add Student
                  </button>
                </div>
              )}
            </div>

            {/* Spreadsheet Table Grid Wrapper */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
              {!isConfigured ? (
                <div className="py-20">
                  <Empty className="bg-slate-900/40 border-slate-800/80 p-12 max-w-xl mx-auto">
                    <EmptyMedia variant="icon" className="bg-amber-500/10 text-amber-500 size-14 mb-4">
                      <Database className="size-7 animate-pulse" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle className="text-xl font-bold text-white">Google Sheets Unconfigured</EmptyTitle>
                      <EmptyDescription className="text-sm text-slate-400 max-w-md mx-auto">
                        Please set your <code className="text-indigo-400 font-mono">GOOGLE_CLIENT_EMAIL</code> and <code className="text-indigo-400 font-mono">GOOGLE_PRIVATE_KEY</code> environment variables in your deployment or local <code className="text-indigo-400 font-mono">.env</code> to connect to a live spreadsheet.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <button
                        onClick={() => fetchStudents(true)}
                        className="mt-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition hover:from-indigo-500 hover:to-indigo-600"
                      >
                        Retry Connection
                      </button>
                    </EmptyContent>
                  </Empty>
                </div>
              ) : loadingStudents && students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
                  <p className="text-xs font-medium text-slate-500">Retrieving sheet records...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-20">
                  <Empty className="bg-slate-900/20 border-slate-800/60 p-12 max-w-md mx-auto">
                    <EmptyMedia variant="icon" className="bg-slate-800 text-slate-400 size-12 mb-4">
                      <Search className="size-6" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle className="text-lg font-bold text-slate-200">No records match your filters</EmptyTitle>
                      <EmptyDescription className="text-xs text-slate-500">
                        Try adjusting your search queries or category toggles.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="text-left text-xs text-slate-300">
                    <TableHeader>
                      <TableRow className="border-b border-slate-800 bg-slate-950/70 text-slate-400 hover:bg-transparent">
                        {columns.map((col) => {
                          const editable = isCellEditable(col);
                          return (
                            <TableHead key={col} className="px-4 py-3.5 font-semibold tracking-wider whitespace-nowrap h-auto">
                              <div className="flex items-center gap-1.5 justify-between">
                                <span>{col}</span>
                                {["ID", "LastModifiedBy", "LastModifiedAt"].includes(col) ? (
                                  <Badge variant="outline" className="text-[9px] font-bold text-slate-600 border-slate-800 px-1.5 py-0.2 uppercase">SYS</Badge>
                                ) : editable ? (
                                  <Unlock className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Lock className="h-3.5 w-3.5 text-amber-500" />
                                )}
                              </div>
                            </TableHead>
                          );
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-800">
                      {filteredStudents.map((stu) => (
                        <TableRow key={stu.ID} className="group hover:bg-slate-900/30 transition-all duration-150 border-slate-800">
                          {columns.map((col) => {
                            const val = stu[col as keyof Student] || "";
                            const editable = isCellEditable(col);
                            const cellKey = `${stu.ID}_${col}`;
                            const isSaving = savingCells[cellKey];

                            return (
                              <TableCell key={col} className="p-1 relative align-middle">
                                {isSaving && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 z-10 rounded">
                                    <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                                  </div>
                                )}
                                <Input
                                  type="text"
                                  defaultValue={val}
                                  disabled={!editable || isSaving}
                                  onBlur={(e) => handleCellBlur(stu.ID, col, val, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  className={`w-full px-3 py-2 h-8 rounded-lg bg-transparent border-transparent transition-all duration-200 text-xs font-medium focus-visible:border-indigo-500/50 focus-visible:bg-slate-950 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/20 shadow-none ${
                                    editable
                                      ? "text-slate-100 group-hover:bg-slate-900/50 cursor-text"
                                      : "text-slate-500 bg-slate-950/20 cursor-not-allowed select-none"
                                  }`}
                                  placeholder={editable ? "Empty" : "Locked"}
                                />
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* =========================================================================
              TAB 2: SUB-ADMIN USERS LIST & MANAGEMENT (ADMIN ONLY)
              ========================================================================= */}
          <TabsContent value="users" className="space-y-6">
            {session?.user?.role === "admin" && (
              <>
                {/* User Filter & Controls */}
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative max-w-sm w-full">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Search sub-admin accounts..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full rounded-xl border-slate-800 bg-slate-950 py-2.5 pr-4 pl-10 text-xs font-medium text-slate-200 placeholder:text-slate-600 focus-visible:border-indigo-500/60 focus-visible:outline-none h-10"
                    />
                  </div>

                  <button
                    onClick={() => setIsAddUserOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-xs font-bold text-white shadow-lg transition-all duration-200 h-10"
                  >
                    <UserPlus className="h-4 w-4" />
                    New Sub-Admin
                  </button>
                </div>

                {/* Users grid table */}
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
                  {loadingUsers ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
                      <p className="text-xs font-medium text-slate-500">Loading user list...</p>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="py-20">
                      <Empty className="bg-slate-900/20 border-slate-800/60 p-12 max-w-md mx-auto">
                        <EmptyMedia variant="icon" className="bg-slate-800 text-slate-400 size-12 mb-4">
                          <Users className="size-6" />
                        </EmptyMedia>
                        <EmptyHeader>
                          <EmptyTitle className="text-lg font-bold text-slate-200">No sub-admin accounts found</EmptyTitle>
                        </EmptyHeader>
                      </Empty>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="text-left text-xs text-slate-300">
                        <TableHeader>
                          <TableRow className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold tracking-wider hover:bg-transparent">
                            <TableHead className="px-6 py-4 h-auto">Username</TableHead>
                            <TableHead className="px-6 py-4 h-auto">Display Name</TableHead>
                            <TableHead className="px-6 py-4 h-auto">Allowed Edit Columns (Comma Separated)</TableHead>
                            <TableHead className="px-6 py-4 h-auto">Status</TableHead>
                            <TableHead className="px-6 py-4 text-right h-auto">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-800">
                          {filteredUsers.map((user) => (
                            <TableRow key={user.username} className="hover:bg-slate-900/25 transition duration-150 border-slate-800">
                              <TableCell className="px-6 py-4 font-bold text-white whitespace-nowrap">
                                {user.username}
                              </TableCell>
                              <TableCell className="px-6 py-4 font-medium whitespace-nowrap">
                                {user.displayName}
                              </TableCell>
                              <TableCell className="px-6 py-4">
                                {editingAllowedColsUser === user.username ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="text"
                                      value={tempAllowedColsValue}
                                      onChange={(e) => setTempAllowedColsValue(e.target.value)}
                                      className="rounded border-slate-800 bg-slate-950 px-2 py-1 text-xs text-slate-100 focus-visible:ring-1 focus-visible:ring-indigo-500 h-8 w-64"
                                    />
                                    <button
                                      onClick={() => handleSaveAllowedCols(user.username)}
                                      className="rounded bg-indigo-600 hover:bg-indigo-500 p-1.5 text-white shadow"
                                      title="Save Columns"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setEditingAllowedColsUser(null)}
                                      className="rounded bg-slate-800 hover:bg-slate-700 p-1.5 text-slate-400"
                                      title="Cancel"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className="text-indigo-300 bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-900/30 font-semibold tracking-wide">
                                      {user.allowedColumns || "None"}
                                    </span>
                                    <button
                                      onClick={() => {
                                        setEditingAllowedColsUser(user.username);
                                        setTempAllowedColsValue(user.allowedColumns);
                                      }}
                                      className="text-slate-500 hover:text-indigo-400 font-medium hover:underline text-[10px]"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => handleToggleUserActive(user.username, user.isActive)}
                                  className="transition-all duration-200"
                                >
                                  <Badge
                                    variant={user.isActive === "TRUE" ? "success" : "destructive"}
                                    className="px-2.5 py-1 font-bold tracking-wider uppercase text-[10px] rounded-full shadow-none cursor-pointer"
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${user.isActive === "TRUE" ? "bg-emerald-500" : "bg-rose-500"}`} />
                                    {user.isActive === "TRUE" ? "Active" : "Suspended"}
                                  </Badge>
                                </button>
                              </TableCell>
                              <TableCell className="px-6 py-4 text-right whitespace-nowrap">
                                <button
                                  onClick={() => handleResetPassword(user.username)}
                                  className="text-slate-400 hover:text-amber-400 font-semibold text-xs border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-xl transition duration-150"
                                >
                                  Reset Pass
                                </button>
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

          {/* =========================================================================
              TAB 3: SERVER-SIDE SYSTEM AUDIT LOGS (ADMIN ONLY)
              ========================================================================= */}
          <TabsContent value="logs" className="space-y-6">
            {session?.user?.role === "admin" && (
              <>
                {/* Audit Log Filters */}
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative max-w-sm w-full">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      type="text"
                      placeholder="Search audit log actor, action, target..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      className="w-full rounded-xl border-slate-800 bg-slate-950 py-2.5 pr-4 pl-10 text-xs font-medium text-slate-200 focus-visible:border-indigo-500/60 focus-visible:outline-none h-10"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400">Total logs:</span>
                    <Badge variant="outline" className="text-xs font-bold text-indigo-400 px-2 py-1 rounded bg-indigo-950/40 border-indigo-900/30">
                      {filteredLogs.length}
                    </Badge>
                  </div>
                </div>

                {/* Logs list table */}
                <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/20 backdrop-blur-md">
                  {loadingLogs ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
                      <p className="text-xs font-medium text-slate-500">Loading system audit records...</p>
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="py-20">
                      <Empty className="bg-slate-900/20 border-slate-800/60 p-12 max-w-md mx-auto">
                        <EmptyMedia variant="icon" className="bg-slate-800 text-slate-400 size-12 mb-4">
                          <FileText className="size-6" />
                        </EmptyMedia>
                        <EmptyHeader>
                          <EmptyTitle className="text-lg font-bold text-slate-200">No audit logs found</EmptyTitle>
                        </EmptyHeader>
                      </Empty>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table className="text-left text-xs text-slate-300">
                        <TableHeader>
                          <TableRow className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-semibold tracking-wider hover:bg-transparent">
                            <TableHead className="px-4 py-3.5 h-auto">Timestamp</TableHead>
                            <TableHead className="px-4 py-3.5 h-auto">Actor</TableHead>
                            <TableHead className="px-4 py-3.5 h-auto">Role</TableHead>
                            <TableHead className="px-4 py-3.5 h-auto">Action</TableHead>
                            <TableHead className="px-4 py-3.5 h-auto">Target Student/User</TableHead>
                            <TableHead className="px-4 py-3.5 h-auto">Column Affected</TableHead>
                            <TableHead className="px-4 py-3.5 h-auto">Old Value</TableHead>
                            <TableHead className="px-4 py-3.5 h-auto">New Value</TableHead>
                            <TableHead className="px-4 py-3.5 h-auto">IP Address</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-800">
                          {filteredLogs.map((log, index) => (
                            <TableRow key={index} className="hover:bg-slate-900/25 transition duration-150 border-slate-800">
                              <TableCell className="px-4 py-3.5 font-medium whitespace-nowrap text-slate-400">
                                {new Date(log.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell className="px-4 py-3.5 font-bold text-white whitespace-nowrap">
                                {log.actorDisplayName} ({log.actor})
                              </TableCell>
                              <TableCell className="px-4 py-3.5 font-semibold text-indigo-400 capitalize">
                                {log.actorRole}
                              </TableCell>
                              <TableCell className="px-4 py-3.5">
                                <Badge
                                  variant="outline"
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase border ${
                                    log.action === "WRITE"
                                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                      : log.action.includes("CREATE")
                                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                  }`}
                                >
                                  {log.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-3.5 font-bold whitespace-nowrap text-white">
                                {log.targetRow}
                              </TableCell>
                              <TableCell className="px-4 py-3.5 font-semibold text-slate-300 whitespace-nowrap">
                                {log.columnChanged}
                              </TableCell>
                              <TableCell className="px-4 py-3.5 max-w-[150px] truncate font-medium text-rose-400/90" title={log.oldValue}>
                                {log.oldValue || <span className="text-slate-600 italic">None</span>}
                              </TableCell>
                              <TableCell className="px-4 py-3.5 max-w-[150px] truncate font-semibold text-emerald-400/90" title={log.newValue}>
                                {log.newValue || <span className="text-slate-600 italic">None</span>}
                              </TableCell>
                              <TableCell className="px-4 py-3.5 font-medium text-slate-500 font-mono">
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
          <DialogContent className="max-w-2xl bg-slate-900 border-slate-800 text-white p-6 sm:p-8 rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-white">Add New Student Record</DialogTitle>
              <p className="text-xs text-slate-400">Enter high-fidelity student information into Google Sheets database.</p>
            </DialogHeader>

            <form onSubmit={handleCreateStudentSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student ID *</label>
                  <Input
                    type="text"
                    placeholder="e.g. STU100"
                    value={newStudent.ID}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, ID: e.target.value }))}
                    className="border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/60 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Name *</label>
                  <Input
                    type="text"
                    placeholder="e.g. Rahul Sharma"
                    value={newStudent.Name}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, Name: e.target.value }))}
                    className="border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/60 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Email Address *</label>
                  <Input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={newStudent.Email}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, Email: e.target.value }))}
                    className="border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 focus-visible:border-indigo-500/60 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phone Number</label>
                  <Input
                    type="text"
                    placeholder="e.g. 9876543210"
                    value={newStudent.Phone}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, Phone: e.target.value }))}
                    className="border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 focus-visible:border-indigo-500/60 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Course Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. Full Stack Web Development"
                    value={newStudent.Course}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, Course: e.target.value }))}
                    className="border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 focus-visible:border-indigo-500/60 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch</label>
                  <Input
                    type="text"
                    placeholder="e.g. Batch A - 2026"
                    value={newStudent.Batch}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, Batch: e.target.value }))}
                    className="border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 focus-visible:border-indigo-500/60 h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</label>
                  <Select value={newStudent.Status} onValueChange={(val) => setNewStudent((prev) => ({ ...prev, Status: val }))}>
                    <SelectTrigger className="border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500/60 h-10">
                      <SelectValue placeholder="Active" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-slate-200">
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grade (or Score)</label>
                  <Input
                    type="text"
                    placeholder="e.g. A+"
                    value={newStudent.Grade}
                    onChange={(e) => setNewStudent((prev) => ({ ...prev, Grade: e.target.value }))}
                    className="border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 focus-visible:border-indigo-500/60 h-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Internal Remarks</label>
                <textarea
                  placeholder="Provide performance feedback..."
                  value={newStudent.Remarks}
                  onChange={(e) => setNewStudent((prev) => ({ ...prev, Remarks: e.target.value }))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 focus:border-indigo-500/60 focus:outline-none min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddStudentOpen(false)}
                  className="rounded-xl border border-slate-800 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition"
                >
                  Save Student
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* =========================================================================
            MODAL 2: REGISTER SUB-ADMIN USER (ADMIN ONLY) - using shadcn/ui Dialog
            ========================================================================= */}
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white p-6 sm:p-8 rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-white">Create Sub-Admin Account</DialogTitle>
              <p className="text-xs text-slate-400">Admins can create sub-admins with uniquely assigned columns.</p>
            </DialogHeader>

            <form onSubmit={handleCreateUserSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unique Username *</label>
                <Input
                  type="text"
                  placeholder="e.g. rahul_sub"
                  value={newUser.username}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                  className="border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 focus-visible:border-indigo-500/60 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Display Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Rahul Sharma (Advisor)"
                  value={newUser.displayName}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, displayName: e.target.value }))}
                  className="border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 focus-visible:border-indigo-500/60 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Login Password *</label>
                <Input
                  type="password"
                  placeholder="Create secure password"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                  className="border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 focus-visible:border-indigo-500/60 h-10"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Allowed Columns (Comma Separated)</label>
                <Input
                  type="text"
                  placeholder="e.g. Comments,Notes"
                  value={newUser.allowedColumns}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, allowedColumns: e.target.value }))}
                  className="border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 focus-visible:border-indigo-500/60 h-10"
                />
                <p className="text-[10px] text-slate-500">Allowed Columns specify what columns to the right of Grade they are allowed to modify.</p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="rounded-xl border border-slate-800 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-slate-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg transition"
                >
                  Create Account
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-indigo-400" />
          <p className="text-sm font-medium tracking-wide text-slate-400 font-mono animate-pulse">Loading dashboard elements...</p>
        </div>
      </div>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}
