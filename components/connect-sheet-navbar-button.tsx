"use client"

import React, { useState } from "react"
import { Plus, Loader2, X, Link as LinkIcon } from "lucide-react"
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

export function ConnectSheetNavbarButton({ isAdmin }: { isAdmin: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const [connectUrl, setConnectUrl] = useState("")
  const [connectTitle, setConnectTitle] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)

  if (!isAdmin) return null

  const handleConnectSheet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connectUrl.trim()) return

    setIsConnecting(true)
    try {
      const res = await fetch("/api/connected-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: connectUrl.trim(),
          title: connectTitle.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(data.error || "Failed to connect Google Sheet")

      toast.success(
        `Google Sheet "${data.newSheet?.title || connectTitle}" connected successfully!`
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

  return (
    <TooltipProvider delayDuration={0}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Plus className="h-4 w-4" />
                <span className="sr-only">Connect Sheet URL</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-semibold">Connect Sheet URL</p>
          </TooltipContent>
        </Tooltip>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect External Google Sheet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConnectSheet} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Google Sheet URL</label>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={connectUrl}
                onChange={(e) => setConnectUrl(e.target.value)}
                disabled={isConnecting}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Title / Alias (Optional)
              </label>
              <Input
                placeholder="e.g., Department Roster"
                value={connectTitle}
                onChange={(e) => setConnectTitle(e.target.value)}
                disabled={isConnecting}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isConnecting}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isConnecting}>
                {isConnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LinkIcon className="h-4 w-4" />
                )}
                Connect
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
