"use client"

import React, { useState, useEffect } from "react"
import {
  Folder,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Search,
  AlertCircle,
  Plus,
} from "lucide-react"
import { GoogleSheets2026 } from "@thesvg/react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "./ui/spinner"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldSet,
} from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"

interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  iconLink?: string
}

interface DriveBrowserProps {
  onSelect?: (file: DriveFile) => void
  onClose: () => void
  isConnecting?: boolean
  progress?: number
  submitError?: string | null
}

const connectSheetSchema = z.object({
  url: z
    .string()
    .min(1, "Google Sheet URL is required")
    .url("Please enter a valid Google Sheet URL"),
  title: z.string().optional(),
})

type FormValues = z.infer<typeof connectSheetSchema>

const extractIdFromUrl = (url: string) => {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : null
}

// Inline useDebounce Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function DriveBrowser({
  onSelect,
  onClose,
}: DriveBrowserProps) {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(
    undefined
  )
  const [history, setHistory] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null)

  // Local connection states for form submission inside DriveBrowser
  const [isConnecting, setIsConnecting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(connectSheetSchema),
    defaultValues: {
      url: "",
      title: "",
    },
    mode: "onTouched",
  })

  useEffect(() => {
    fetchFiles(currentFolderId)
  }, [currentFolderId])

  useEffect(() => {
    if (selectedFile) {
      reset({
        url: `https://docs.google.com/spreadsheets/d/${selectedFile.id}/edit`,
        title: selectedFile.name,
      })
    }
  }, [selectedFile, reset])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isConnecting) {
      setProgress(10)
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + 5
        })
      }, 300)
    } else {
      setProgress(0)
    }
    return () => clearInterval(interval)
  }, [isConnecting])

  const fetchFiles = async (folderId?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = folderId
        ? `/api/drive/list?folderId=${folderId}`
        : "/api/drive/list"
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch files")
      setFiles(data.files || [])
    } catch (err: any) {
      setError(
        "The account isn't connected to Google. Kindly connect and then you can choose the sheet."
      )
      toast.error("Could not load Google Drive files")
    } finally {
      setLoading(false)
    }
  }

  const handleFolderClick = (folderId: string) => {
    setHistory([...history, currentFolderId || "root"])
    setCurrentFolderId(folderId)
  }

  const handleBack = () => {
    const newHistory = [...history]
    const lastFolder = newHistory.pop()
    setHistory(newHistory)
    setCurrentFolderId(lastFolder === "root" ? undefined : lastFolder)
  }

  const handleBackClick = () => {
    if (selectedFile) {
      setSelectedFile(null)
    } else {
      handleBack()
    }
  }

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const connectSheetPromise = async (url: string, title: string) => {
    setSubmitError(null)
    setIsConnecting(true)
    try {
      const res = await fetch("/api/connected-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect Google Sheet")
      }
      return data
    } catch (err: any) {
      const errMsg = err.message || "Failed to connect Google Sheet"
      setSubmitError(errMsg)
      throw err
    } finally {
      setIsConnecting(false)
    }
  }

  const onSubmit = async (values: FormValues) => {
    const promise = connectSheetPromise(values.url, values.title || "")
    toast.promise(promise, {
      loading: "Syncing data to Database...",
      success: (data: any) => {
        onClose()
        // Dispatch event so sidebar instantly updates
        window.dispatchEvent(new Event("sheet_connected"))
        return `Google Sheet "${data.newSheet?.title || values.title || "Untitled"}" connected successfully!`
      },
      error: (err: any) => {
        return err.message || "Failed to connect Google Sheet"
      },
    })
  }

  return (
    <div className="flex h-[500px] flex-col rounded-lg border bg-card text-card-foreground">
      <div className="space-y-4 border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(history.length > 0 || selectedFile) && (
              <Button variant="ghost" size="icon" onClick={handleBackClick}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <h3 className="font-semibold">
              {selectedFile ? "Confirm Connection" : "Google Drive"}
            </h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        {!selectedFile && (
          <InputGroup>
            <InputGroupAddon>
              <Search className="h-4 w-4 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search sheets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </InputGroup>
        )}
      </div>

      {selectedFile ? (
        <ScrollArea className="flex-1 p-4">
          <Card className="border shadow-none ring-0">
            <CardContent className="space-y-4 pt-4">
              <form
                id="connect-sheet-form"
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                {submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="size-4" />
                    <AlertTitle>Connection Failed</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                <FieldSet>
                  <FieldGroup>
                    <Controller
                      control={control}
                      name="url"
                      render={({ field }) => (
                        <Field data-invalid={!!errors.url}>
                          <FieldLabel htmlFor="sheet-url">
                            Google Sheet URL
                          </FieldLabel>
                          <Input
                            {...field}
                            id="sheet-url"
                            placeholder="https://docs.google.com/spreadsheets/d/..."
                            disabled={isConnecting}
                          />
                          <FieldError errors={[errors.url]} />
                        </Field>
                      )}
                    />

                    <Controller
                      control={control}
                      name="title"
                      render={({ field }) => (
                        <Field data-invalid={!!errors.title}>
                          <FieldLabel htmlFor="sheet-title">
                            Title / Alias (Optional)
                          </FieldLabel>
                          <Input
                            {...field}
                            id="sheet-title"
                            placeholder="e.g., Department Roster"
                            disabled={isConnecting}
                          />
                          <FieldError errors={[errors.title]} />
                        </Field>
                      )}
                    />
                  </FieldGroup>
                </FieldSet>

                {isConnecting && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Syncing data to Database...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectedFile(null)}
                    disabled={isConnecting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isConnecting}>
                    {isConnecting ? (
                      <Spinner className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Connect
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1 p-2">
          {loading ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-10">
              <Spinner className="h-6 w-6 text-primary" />
              <p className="text-sm text-muted-foreground">Loading files...</p>
            </div>
          ) : error ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Connection Required</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-10">
              <p className="text-sm text-muted-foreground">
                No matching files found.
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className="group flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-accent"
                  onClick={() => {
                    if (file.mimeType === "application/vnd.google-apps.folder") {
                      handleFolderClick(file.id)
                    } else {
                      setSelectedFile(file)
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    {file.mimeType === "application/vnd.google-apps.folder" ? (
                      <Folder className="h-4 w-4 fill-blue-500/10 text-blue-500" />
                    ) : (
                      <GoogleSheets2026 className="h-4 w-4" />
                    )}
                    <span className="max-w-[200px] truncate text-sm font-medium">
                      {file.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {file.mimeType === "application/vnd.google-apps.folder" ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button size="sm" className="h-8 px-2 text-xs">
                          Select
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      )}

      <div className="border-t bg-muted/30 p-3 text-tiny text-muted-foreground">
        Note: You only see files shared with the system service account.
      </div>
    </div>
  )
}
