"use client"

import React, { useState, useEffect } from "react"
import { 
  Folder, 
  FileSpreadsheet, 
  ChevronRight, 
  ChevronLeft, 
  Loader2,
  ExternalLink,
  Search,
  AlertCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "./ui/spinner"

interface DriveFile {
  id: string
  name: string
  mimeType: string
  webViewLink?: string
  iconLink?: string
}

interface DriveBrowserProps {
  onSelect: (file: DriveFile) => void
  onClose: () => void
}

export function DriveBrowser({ onSelect, onClose }: DriveBrowserProps) {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined)
  const [history, setHistory] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFiles(currentFolderId)
  }, [currentFolderId])

  const fetchFiles = async (folderId?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = folderId ? `/api/drive/list?folderId=${folderId}` : "/api/drive/list"
      const res = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch files")
      setFiles(data.files || [])
    } catch (err: any) {
      setError("The account isn't connected to Google. Kindly connect and then you can choose the sheet.")
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

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col h-[500px] border rounded-lg bg-card text-card-foreground">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <h3 className="font-semibold">Google Drive</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search sheets..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-10">
            <Spinner className="h-6 w-6 text-primary" />
            <p className="text-sm text-muted-foreground">Loading files...</p>
          </div>
        ) : error ? (
          <div className="p-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Required</AlertTitle>
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-10">
            <p className="text-sm text-muted-foreground">No matching files found.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredFiles.map((file) => (
              <div 
                key={file.id}
                className="flex items-center justify-between p-2 rounded-md hover:bg-accent group cursor-pointer"
                onClick={() => {
                  if (file.mimeType === "application/vnd.google-apps.folder") {
                    handleFolderClick(file.id)
                  } else {
                    onSelect(file)
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  {file.mimeType === "application/vnd.google-apps.folder" ? (
                    <Folder className="h-4 w-4 text-blue-500 fill-blue-500/10" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 text-green-600 fill-green-600/10" />
                  )}
                  <span className="text-sm font-medium truncate max-w-[200px]">{file.name}</span>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        <a href={file.webViewLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                      <Button size="sm" className="h-8 px-2 text-xs">Select</Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      <div className="p-3 border-t bg-muted/30 text-[10px] text-muted-foreground">
        Note: You only see files shared with the system service account.
      </div>
    </div>
  )
}
