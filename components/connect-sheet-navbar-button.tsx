"use client"

import React, { useState } from "react"
import { Plus, Loader2, X, Link as LinkIcon, Database } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DriveBrowser } from "@/components/drive-browser"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

export function ConnectSheetNavbarButton({ isAdmin }: { isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [connectUrl, setConnectUrl] = useState("")
  const [connectTitle, setConnectTitle] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [progress, setProgress] = useState(0)

  React.useEffect(() => {
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

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener("open_connect_sheet_dialog", handleOpen)
    return () =>
      window.removeEventListener("open_connect_sheet_dialog", handleOpen)
  }, [])

  if (!isAdmin) return null

  const handleConnectSheet = async (
    e?: React.FormEvent,
    customData?: { url: string; title: string }
  ) => {
    if (e) e.preventDefault()

    const urlToUse = customData?.url || connectUrl
    const titleToUse = customData?.title || connectTitle

    if (!urlToUse.trim()) return

    setIsConnecting(true)
    try {
      const res = await fetch("/api/connected-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: urlToUse.trim(),
          title: titleToUse.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(data.error || "Failed to connect Google Sheet")

      toast.success(
        `Google Sheet "${data.newSheet?.title || titleToUse}" connected successfully!`
      )
      setConnectUrl("")
      setConnectTitle("")
      setIsOpen(false)

      // Dispatch event so sidebar instantly updates
      window.dispatchEvent(new Event("sheet_connected"))
    } catch (err: any) {
      toast.error(err.message || "Failed to connect Google Sheet")
    } finally {
      setIsConnecting(false)
    }
  }

  const handleDriveSelect = (file: any) => {
    const url = `https://docs.google.com/spreadsheets/d/${file.id}/edit`
    handleConnectSheet(undefined, { url, title: file.name })
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
                <span className="sr-only">Connect Sheet</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-semibold">Connect Google Sheet</p>
          </TooltipContent>
        </Tooltip>

        <DialogContent className="sm:max-w-">
          <DialogHeader>
            <DialogTitle>Add New Spreadsheet</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="url" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="gap-2">
                <LinkIcon className="h-3.5 w-3.5" />
                Via URL
              </TabsTrigger>
              <TabsTrigger value="drive" className="gap-2">
                <Database className="h-3.5 w-3.5" />
                Browse Drive
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="url"
              className="animate-in space-y-4 pt-4 duration-300 fade-in-50"
            >
              <form onSubmit={handleConnectSheet} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sheet-url">Google Sheet URL</Label>
                  <Input
                    id="sheet-url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={connectUrl}
                    onChange={(e) => setConnectUrl(e.target.value)}
                    disabled={isConnecting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sheet-title">Title / Alias (Optional)</Label>
                  <Input
                    id="sheet-title"
                    placeholder="e.g., Department Roster"
                    value={connectTitle}
                    onChange={(e) => setConnectTitle(e.target.value)}
                    disabled={isConnecting}
                  />
                </div>
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
                    onClick={() => setIsOpen(false)}
                    disabled={isConnecting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isConnecting}>
                    {isConnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Connect
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent
              value="drive"
              className="animate-in pt-4 duration-300 fade-in-50"
            >
              <DriveBrowser
                onSelect={handleDriveSelect}
                onClose={() => setIsOpen(false)}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
