"use client"

import { useQueryClient, useIsFetching, useQuery } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { RefreshCw } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BadgeDot } from "@/components/ui/badge-dot"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function SyncIndicator() {
  const queryClient = useQueryClient()
  const isFetching = useIsFetching()
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const [syncLabel, setSyncLabel] = useState("Just synced")
  const { data: dbModeData } = useQuery({
    queryKey: ["dbMode"],
    queryFn: async () => {
      const res = await fetch("/api/students")
      if (!res.ok) throw new Error("Failed to fetch DB mode")
      const json = await res.json()
      return json.configured
        ? "Connected"
        : json.simulated
          ? "Simulated"
          : "Disconnected"
    },
    staleTime: 60000, // 1 minute
  })

  const dbMode = dbModeData || null

  // Set initial sync time on query success
  useEffect(() => {
    if (isFetching === 0) {
      const timer = setTimeout(() => setLastSynced(new Date()), 0)
      return () => clearTimeout(timer)
    }
  }, [isFetching])

  // Update human readable relative time
  useEffect(() => {
    if (!lastSynced) return

    const updateLabel = () => {
      setSyncLabel(
        `Synced ${formatDistanceToNow(lastSynced, { addSuffix: true })}`
      )
    }

    updateLabel()
    const interval = setInterval(updateLabel, 30000) // Update every 30s

    return () => clearInterval(interval)
  }, [lastSynced])

  const handleManualSync = async () => {
    toast.promise(queryClient.invalidateQueries(), {
      loading: "Synchronizing database structures...",
      success: () => {
        setLastSynced(new Date())
        return "Database synchronized successfully!"
      },
      error: "Synchronization failed.",
    })
  }

  return (
    <div className="flex items-center gap-4">
      {/* DB MODE PILL */}
      <Badge
        variant="secondary"
        className="flex items-center text-xs uppercase"
      >
        <BadgeDot
          variant={
            dbMode === "Connected"
              ? "success"
              : dbMode === "Simulated"
                ? "warning"
                : "destructive"
          }
          pulse={dbMode === "Connected"}
        />
        {dbMode || "Checking..."}
      </Badge>

      {/* SYNC TIME */}
      <div className="flex items-center">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={handleManualSync}
                disabled={isFetching > 0}
                className="group flex h-8 w-8 items-center justify-center"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ease-in-out transition-transform group-hover:rotate-45 ${
                    isFetching > 0 ? "animate-spin" : ""
                  }`}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFetching > 0 ? "Syncing..." : syncLabel}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
