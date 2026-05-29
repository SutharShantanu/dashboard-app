"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSession } from "next-auth/react"
import {
  Upload,
  Link as LinkIcon,
  AlertCircle,
  Users,
  Search,
  Filter,
  ChevronDown,
  Share2,
  FileSpreadsheet,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
} from "lucide-react"
import { GoogleDrive2026, GoogleSheets2026 } from "@thesvg/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { ExportDropdown } from "@/components/export-dropdown"
import { EmptyState } from "@/components/empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { FileDropzone } from "@/components/file-dropzone"



export default function StudentsDirectoryPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const user = session?.user as any

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importTab, setImportTab] = useState("file")
  const [googleUrl, setGoogleUrl] = useState("")
  const [progress, setProgress] = useState(0)

  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      alert("Link copied to clipboard!")
    }
  }

  const {
    data: sheetData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["allStudentsData"],
    queryFn: async () => {
      const res = await fetch("/api/students?spreadsheetId=directory")
      if (!res.ok) throw new Error("Failed to fetch students data")
      return res.json()
    },
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData()
      if (importTab === "file" && uploadedFile) {
        formData.append("file", uploadedFile)
      } else if (importTab === "link" && googleUrl) {
        formData.append("googleUrl", googleUrl)
      } else {
        throw new Error("Please select a file or enter a valid URL.")
      }

      formData.append("sheetId", "directory")

      const res = await fetch("/api/students/import", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to import")
      return data
    },
    onSuccess: (data) => {
      setIsImportDialogOpen(false)
      setUploadedFile(null)
      setGoogleUrl("")
      queryClient.invalidateQueries({ queryKey: ["allStudentsData"] })
    },
    onError: (err: any) => {
      // Error handled by toast.promise
    },
  })

  // Simulate progress
  useEffect(() => {
    if (isImportDialogOpen && importMutation.isPending) {
      setProgress(0)
      const interval = setInterval(() => {
        setProgress((prev) =>
          prev < 90 ? prev + Math.floor(Math.random() * 15) : prev
        )
      }, 400)
      return () => clearInterval(interval)
    } else if (!importMutation.isPending && progress > 0) {
      setProgress(100)
      const timeout = setTimeout(() => setProgress(0), 1000)
      return () => clearTimeout(timeout)
    }
  }, [importMutation.isPending, isImportDialogOpen])

  const columns = sheetData?.columns || []
  const data = sheetData?.data || []

  const tableColumns = useMemo<ColumnDef<any>[]>(() => {
    const baseColumns = columns.map((col: string, index: number) => {
      const maxCharLength = Math.max(
        col ? col.length : 0,
        ...data.map((row: any) => String(row[col] || "").length)
      )
      const minWidthCh = `${Math.max(maxCharLength + 4, 12)}ch`

      return {
        id: col || `col_${index}`,
        accessorFn: (row: any) => row[col],
        header: col || `Column ${index + 1}`,
        cell: (info: any) => (
          <div
            className="truncate"
            style={{ minWidth: minWidthCh, maxWidth: "400px" }}
          >
            {String(info.getValue() || "")}
          </div>
        ),
      }
    })

    return [
      ...baseColumns,
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }: any) => {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedStudent(row.original)
                    setIsSheetOpen(true)
                  }}
                >
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      }
    ]
  }, [columns, data])

  const filteredAndSortedData = useMemo(() => {
    let result = [...data]

    if (statusFilter) {
      result = result.filter((row: any) => row.Status === statusFilter)
    }

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
            Loading students directory...
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
          <p className="text-sm font-semibold">Error loading directory</p>
          <p className="text-xs text-muted-foreground">
            {(error as Error).message}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full min-w-0 space-y-6">
      <PageHeader
        subtitle="Global Directory"
        title="Students Directory"
        description="View all students across the system and import new records."
      >
        {user?.role === "admin" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2">
                <Upload className="h-4 w-4" />
                Import Students
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-fit">
              <DropdownMenuLabel>Import Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setImportTab("file")
                  setIsImportDialogOpen(true)
                }}
              >
                <FileSpreadsheet className="h-4 w-4" />
                Upload File
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setImportTab("link")
                  setIsImportDialogOpen(true)
                }}
              >
                <LinkIcon className="h-4 w-4" />
                Add from Link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </PageHeader>

      <div className="max-w-full" style={{ width: 0, minWidth: "100%" }}>
        {data.length === 0 ? (
          <EmptyState
            title="No students found"
            description="Your student directory is currently empty. Import a CSV or Google Sheet to get started."
            useIllustration={true}
            className="rounded-lg border border-dashed"
          />
        ) : (
          <Card className="max-w-full overflow-hidden">
            <CardHeader>
              <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <CardTitle>All Students</CardTitle>
                  <CardDescription>
                    Showing {filteredAndSortedData.length} of {data.length}{" "}
                    records
                  </CardDescription>
                </div>

                <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
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

                  <ExportDropdown
                    data={filteredAndSortedData}
                    filename="Students_Directory"
                  />
                  <Button variant="outline" onClick={handleShare}>
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="w-full max-w-full">
              {filteredAndSortedData.length > 0 ? (
                <div className="overflow-auto rounded-md border">
                  <DataTable
                    columns={tableColumns}
                    data={filteredAndSortedData}
                  />
                </div>
              ) : (
                <EmptyState
                  title="No Student Found."
                  description="No students match your current filters."
                  icon={<Users className="h-4 w-4" />}
                  className="border-none"
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
            <DialogDescription>
              Upload a file or provide a Google Sheet link to import students.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={importTab} onValueChange={setImportTab} className="m-2">
            <TabsList className="w-fit">
              <TabsTrigger value="file">
                <FileSpreadsheet className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="link">
                <LinkIcon className="h-4 w-4" />
                Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="pt-2">
              <FileDropzone
                selectedFile={uploadedFile}
                onFileSelect={setUploadedFile}
                onGoogleDriveImport={() => {
                  toast.info("Google Drive import functionality goes here!")
                }}
              />
            </TabsContent>

            <TabsContent value="link" className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Google Sheet Link</label>
                <Input
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ensure the sheet is accessible or shared with the service
                  account.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {importMutation.isPending || progress > 0 ? (
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">
                  {progress === 100
                    ? "Complete!"
                    : "Fetching and importing data..."}
                </span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          ) : null}

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setIsImportDialogOpen(false)}
              disabled={importMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                toast.promise(importMutation.mutateAsync(), {
                  loading: "Importing students...",
                  success: (data: any) => data.message || "Students imported successfully!",
                  error: (err: any) => err.message || "Failed to import students.",
                })
              }}
              disabled={
                importMutation.isPending ||
                (importTab === "file" && !uploadedFile) ||
                (importTab === "link" && !googleUrl)
              }
            >
              {importMutation.isPending ? (
                <Spinner className="h-4 w-4" />
              ) : null}
              {importMutation.isPending ? "Processing..." : "Start Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Student Details</SheetTitle>
            <SheetDescription>
              View detailed information and recent activity for this student.
            </SheetDescription>
          </SheetHeader>
          
          {selectedStudent && (
            <Tabs defaultValue="details" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="activity">Recent Activity</TabsTrigger>
              </TabsList>
              
              <TabsContent value="details" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(selectedStudent).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{key}</p>
                      <p className="text-sm font-medium">{String(value || "N/A")}</p>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="activity" className="mt-4">
                <Timeline>
                  <TimelineItem step={1}>
                    <TimelineIndicator />
                    <TimelineSeparator />
                    <TimelineHeader>
                      <TimelineDate>Today</TimelineDate>
                      <TimelineTitle>Record Updated</TimelineTitle>
                    </TimelineHeader>
                    <TimelineContent>Status changed to active.</TimelineContent>
                  </TimelineItem>
                  <TimelineItem step={2}>
                    <TimelineIndicator />
                    <TimelineSeparator />
                    <TimelineHeader>
                      <TimelineDate>Last Week</TimelineDate>
                      <TimelineTitle>Enrolled in Course</TimelineTitle>
                    </TimelineHeader>
                    <TimelineContent>Enrolled in GATE CS Booster.</TimelineContent>
                  </TimelineItem>
                  <TimelineItem step={3}>
                    <TimelineIndicator />
                    <TimelineHeader>
                      <TimelineDate>Last Month</TimelineDate>
                      <TimelineTitle>Record Created</TimelineTitle>
                    </TimelineHeader>
                    <TimelineContent>Imported from CSV.</TimelineContent>
                  </TimelineItem>
                </Timeline>
              </TabsContent>
            </Tabs>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

