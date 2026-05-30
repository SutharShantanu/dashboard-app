"use client"

import { useState, useEffect } from "react"
import {
  Upload,
  FileSpreadsheet,
  FileText,
  Eye,
  RefreshCw,
  Trash2,
  Info,
  HardDrive,
  Calendar,
  AlertCircle,
} from "lucide-react"
import { GoogleDriveIcon } from "@/components/icons/google-drive"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { SkeletonBlock } from "@/components/ui/skeleton-block"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useFileUpload, formatBytes } from "@/hooks/use-file-upload"
import * as XLSX from "xlsx"
import { toast } from "sonner"

interface FileDropzoneProps {
  accept?: string
  maxSize?: number
  selectedFile: File | null
  onFileSelect: (file: File | null) => void
  onGoogleDriveImport?: () => void
  title?: string
  subtitle?: string
}

export function FileDropzone({
  accept = ".csv,.xlsx,.json",
  maxSize,
  selectedFile,
  onFileSelect,
  onGoogleDriveImport,
  title = "Click to select or drag and drop a file",
  subtitle = "Supports .csv, .xlsx, and .json",
}: FileDropzoneProps) {
  const [fileState, fileActions] = useFileUpload({
    accept,
    multiple: false,
    maxSize,
  })

  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewData, setPreviewData] = useState<{
    fileName: string
    headers: string[]
    rows: string[][]
    totalRows: number
    totalColumns: number
    type: string
  } | null>(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)

  // Two-way synchronization of file state
  useEffect(() => {
    const currentFile = (fileState.files[0]?.file as File) || null
    if (currentFile !== selectedFile) {
      onFileSelect(currentFile)
    }
  }, [fileState.files, selectedFile, onFileSelect])

  useEffect(() => {
    if (selectedFile === null && fileState.files.length > 0) {
      fileActions.clearFiles()
    }
  }, [selectedFile, fileState.files.length, fileActions])

  const handlePreviewFile = async (file: File) => {
    setIsPreviewLoading(true)
    setIsPreviewOpen(true)

    const extension = file.name.split(".").pop()?.toLowerCase() || ""
    const reader = new FileReader()

    try {
      if (extension === "json") {
        reader.onload = (e) => {
          try {
            const text = e.target?.result as string
            let parsed = JSON.parse(text)

            if (!Array.isArray(parsed)) {
              if (parsed && typeof parsed === "object") {
                parsed = [parsed]
              } else {
                throw new Error("Invalid JSON structure: Expected an array of objects.")
              }
            }

            if (parsed.length === 0) {
              setPreviewData({
                fileName: file.name,
                headers: [],
                rows: [],
                totalRows: 0,
                totalColumns: 0,
                type: "JSON",
              })
              return
            }

            const allKeys = new Set<string>()
            parsed.forEach((obj: any) => {
              if (obj && typeof obj === "object") {
                Object.keys(obj).forEach((key) => allKeys.add(key))
              }
            })
            const headers = Array.from(allKeys)

            const rows = parsed.slice(0, 10).map((obj: any) =>
              headers.map((header) => String(obj[header] !== undefined ? obj[header] : ""))
            )

            setPreviewData({
              fileName: file.name,
              headers,
              rows,
              totalRows: parsed.length,
              totalColumns: headers.length,
              type: "JSON",
            })
          } catch (err: any) {
            toast.error("Failed to parse JSON: " + err.message)
            setIsPreviewOpen(false)
          } finally {
            setIsPreviewLoading(false)
          }
        }
        reader.readAsText(file)
      } else if (extension === "xlsx" || extension === "csv") {
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer)
            const workbook = XLSX.read(data, { type: "array" })
            const firstSheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[firstSheetName]

            const sheetRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 })

            if (sheetRows.length === 0) {
              setPreviewData({
                fileName: file.name,
                headers: [],
                rows: [],
                totalRows: 0,
                totalColumns: 0,
                type: extension.toUpperCase(),
              })
              return
            }

            const headers = (sheetRows[0] as any[]).map((h) => String(h || ""))
            const rawRows = sheetRows.slice(1)
            const previewRows = rawRows.slice(0, 10).map((row: any[]) => {
              const formattedRow = []
              for (let i = 0; i < headers.length; i++) {
                formattedRow.push(row[i] !== undefined ? String(row[i]) : "")
              }
              return formattedRow
            })

            setPreviewData({
              fileName: file.name,
              headers,
              rows: previewRows,
              totalRows: rawRows.length,
              totalColumns: headers.length,
              type: extension.toUpperCase(),
            })
          } catch (err: any) {
            toast.error(`Failed to parse ${extension.toUpperCase()}: ` + err.message)
            setIsPreviewOpen(false)
          } finally {
            setIsPreviewLoading(false)
          }
        }
        reader.readAsArrayBuffer(file)
      } else {
        toast.error("Unsupported file extension for preview.")
        setIsPreviewOpen(false)
        setIsPreviewLoading(false)
      }
    } catch (err: any) {
      toast.error("Error reading file: " + err.message)
      setIsPreviewOpen(false)
      setIsPreviewLoading(false)
    }
  }

  return (
    <div className="space-y-4 pt-2">
      <input className="hidden" {...fileActions.getInputProps()} />

      {fileState.files.length === 0 ? (
        <>
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
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>

          {onGoogleDriveImport && (
            <div className="flex justify-center my-4">
              <Button
                variant="secondary"
                className="w-full"
                type="button"
                onClick={onGoogleDriveImport}
              >
                <GoogleDriveIcon className="h-5 w-5 shrink-0" />
                Import from Google Drive
              </Button>
            </div>
          )}
        </>
      ) : (
        <SelectedFileCard
          fileWithPreview={fileState.files[0]}
          onPreview={() => handlePreviewFile(fileState.files[0].file as File)}
          onReplace={fileActions.openFileDialog}
          onRemove={() => fileActions.removeFile(fileState.files[0].id)}
        />
      )}

      {fileState.errors.length > 0 && (
        <div className="flex flex-col gap-1 mt-2 text-xs text-destructive">
          {fileState.errors.map((err, i) => (
            <span key={i} className="flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {err}
            </span>
          ))}
        </div>
      )}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold flex items-center gap-2 truncate">
                  File Preview:{" "}
                  <span className="font-mono text-sm text-primary font-normal truncate">
                    {previewData?.fileName}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  Previewing columns and data structure before importing.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {isPreviewLoading ? (
            <div className="flex flex-col py-8 gap-4 flex-1 w-full">
              <div className="flex flex-wrap gap-2 text-xs mb-2">
                <SkeletonBlock variant="rectangular" width={100} height={24} className="rounded-full" />
                <SkeletonBlock variant="rectangular" width={120} height={24} className="rounded-full" />
                <SkeletonBlock variant="rectangular" width={90} height={24} className="rounded-full" />
              </div>
              <SkeletonBlock showSpinner={true} variant="rectangular" width="100%" height={300} className="rounded-md border" />
            </div>
          ) : previewData ? (
            <div className="flex-1 flex flex-col overflow-hidden space-y-4 pt-4 min-h-0">
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" className="px-2.5 py-1">
                  Format: {previewData.type}
                </Badge>
                <Badge variant="secondary" className="px-2.5 py-1">
                  Total Rows: {previewData.totalRows}
                </Badge>
                <Badge variant="secondary" className="px-2.5 py-1">
                  Total Columns: {previewData.totalColumns}
                </Badge>
              </div>

              {previewData.headers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 border rounded-lg border-dashed bg-muted/10">
                  <Info className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-semibold">No Preview Available</p>
                  <p className="text-xs text-muted-foreground">
                    The file appears to contain no columns or data.
                  </p>
                </div>
              ) : (
                <div className="flex-1 overflow-auto rounded-lg border bg-card min-h-0">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b bg-muted/60 sticky top-0 backdrop-blur-sm z-10">
                        <th className="px-4 py-3 font-semibold text-muted-foreground w-12 text-center border-r">
                          #
                        </th>
                        {previewData.headers.map((header, idx) => (
                          <th
                            key={idx}
                            className="px-4 py-3 font-semibold text-muted-foreground border-r last:border-r-0 max-w-[200px] truncate"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.rows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="px-4 py-2.5 text-center text-muted-foreground font-mono bg-muted/10 border-r w-12">
                            {rowIdx + 1}
                          </td>
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-4 py-2.5 border-r last:border-r-0 max-w-[200px] truncate font-medium"
                            >
                              {cell || (
                                <span className="text-muted-foreground/45 italic">empty</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {previewData.totalRows > 10 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 dark:bg-amber-500/5 dark:text-amber-400 p-3 rounded-lg border border-amber-500/20">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Showing only the first 10 rows of <strong>{previewData.totalRows}</strong>{" "}
                    records. The full file will be processed during import.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-destructive gap-2">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-semibold">Failed to load preview</p>
            </div>
          )}

          <DialogFooter className="pt-4 border-t mt-4 flex items-center justify-end">
            <Button onClick={() => setIsPreviewOpen(false)} type="button">
              Close Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface SelectedFileCardProps {
  fileWithPreview: any
  onPreview: () => void
  onReplace: () => void
  onRemove: () => void
}

function SelectedFileCard({
  fileWithPreview,
  onPreview,
  onReplace,
  onRemove,
}: SelectedFileCardProps) {
  const file = fileWithPreview.file as File
  const [confirmDelete, setConfirmDelete] = useState(false)

  const extension = file.name?.split(".").pop()?.toLowerCase() || ""
  const formattedSize = formatBytes(file.size || 0)

  const lastModifiedStr = file.lastModified
    ? new Date(file.lastModified).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Unknown"

  const isSpreadsheet = extension === "csv" || extension === "xlsx"
  const themeAccent = isSpreadsheet
    ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40"
    : "border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/40"

  const iconBg = isSpreadsheet ? "bg-emerald-500/10 text-emerald-500" : "bg-indigo-500/10 text-indigo-500"

  const fileLabel = isSpreadsheet
    ? extension === "csv"
      ? "Comma Separated Values (.csv)"
      : "Excel Spreadsheet (.xlsx)"
    : "JSON Document (.json)"

  return (
    <div
      className={`rounded-xl border p-5 transition-all duration-300 ${themeAccent} space-y-4 shadow-sm`}
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-3 ${iconBg} transition-transform duration-200 hover:scale-105`}>
          {isSpreadsheet ? (
            <FileSpreadsheet className="h-6 w-6" />
          ) : (
            <FileText className="h-6 w-6" />
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate block" title={file.name}>
              {file.name}
            </span>
            <Badge
              variant="outline"
              className={
                isSpreadsheet
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
              }
            >
              Ready
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            {fileLabel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-lg p-3 border border-muted/20 text-xs">
        <div className="space-y-1">
          <p className="text-muted-foreground flex items-center gap-1.5 font-medium">
            <HardDrive className="h-3.5 w-3.5 text-muted-foreground/70" /> Size
          </p>
          <p className="font-semibold">{formattedSize}</p>
        </div>
        <div className="space-y-1">
          <p className="text-muted-foreground flex items-center gap-1.5 font-medium">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" /> Modified
          </p>
          <p className="font-semibold truncate" title={lastModifiedStr}>
            {lastModifiedStr}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-muted/40">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="h-9 px-3 gap-1.5 hover:bg-accent text-xs font-medium"
            type="button"
          >
            <Eye className="h-4 w-4" /> Preview Data
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onReplace}
            className="h-9 px-3 gap-1.5 hover:bg-accent text-xs font-medium text-muted-foreground hover:text-foreground"
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Replace
          </Button>
        </div>

        {confirmDelete ? (
          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
            <Button
              variant="destructive"
              size="sm"
              onClick={onRemove}
              className="h-9 px-3 gap-1 text-xs font-semibold"
              type="button"
            >
              <Trash2 className="h-4 w-4" /> Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
              className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
              type="button"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            className="h-9 px-3 gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors text-xs font-medium text-muted-foreground"
            type="button"
          >
            <Trash2 className="h-4 w-4 text-destructive" /> Remove
          </Button>
        )}
      </div>
    </div>
  )
}
