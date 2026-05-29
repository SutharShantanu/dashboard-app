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
} from "lucide-react"
import { GoogleSheets2026 } from "@thesvg/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DataTable } from "@/components/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { useFileUpload } from "@/hooks/use-file-upload"
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

export default function StudentsDirectoryPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const user = session?.user as any

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [importTab, setImportTab] = useState("file")
  const [googleUrl, setGoogleUrl] = useState("")
  const [progress, setProgress] = useState(0)

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

  const [fileState, fileActions] = useFileUpload({
    accept: ".csv,.xlsx,.json",
    multiple: false,
  })

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
      if (importTab === "file" && fileState.files.length > 0) {
        formData.append("file", fileState.files[0].file as File)
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
      toast.success(data.message || "Students imported successfully!")
      setIsImportDialogOpen(false)
      fileActions.clearFiles()
      setGoogleUrl("")
      queryClient.invalidateQueries({ queryKey: ["allStudentsData"] })
    },
    onError: (err: any) => {
      toast.error(err.message)
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
    return columns.map((col: string, index: number) => {
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
                <GoogleSheets2026 className="h-4 w-4" />
                Upload File
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setImportTab("link")
                  setIsImportDialogOpen(true)
                }}
              >
                <LinkIcon className="h-4 w-4" />
                Google Sheet Link
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Import Students</DialogTitle>
            <DialogDescription>
              Upload a file or provide a Google Sheet link to import students.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={importTab} onValueChange={setImportTab} className="m-2">
            <TabsList className="w-fit">
              <TabsTrigger value="file">
                <GoogleSheets2026 className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="link">
                <LinkIcon className="h-4 w-4" />
                Link
              </TabsTrigger>
            </TabsList>

            <TabsContent value="file" className="space-y-4 pt-4">
              <div
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
                  fileState.isDragging
                    ? "border-primary bg-primary/10"
                    : "border-muted hover:bg-muted/50"
                }`}
                onClick={fileActions.openFileDialog}
                onDragEnter={fileActions.handleDragEnter}
                onDragLeave={fileActions.handleDragLeave}
                onDragOver={fileActions.handleDragOver}
                onDrop={fileActions.handleDrop}
              >
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Click to select or drag and drop a file
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports .csv, .xlsx, and .json
                </p>
                <input className="hidden" {...fileActions.getInputProps()} />
              </div>

              {fileState.errors.length > 0 && (
                <div className="flex flex-col gap-1 text-xs text-destructive">
                  {fileState.errors.map((err, i) => (
                    <span key={i}>{err}</span>
                  ))}
                </div>
              )}

              {fileState.files.length > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="rounded-full bg-primary/10 p-3">
                    <GoogleSheets2026 className="h-4 w-4" />
                  </div>
                  <span className="font-medium">
                    {fileState.files[0].file.name}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="ml-auto text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      fileActions.removeFile(fileState.files[0].id)
                    }
                  >
                    ×
                  </Button>
                </div>
              )}
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
              onClick={() => importMutation.mutate()}
              disabled={
                importMutation.isPending ||
                (importTab === "file" && fileState.files.length === 0) ||
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
    </div>
  )
}
