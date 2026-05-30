"use client"

import React, { useState, useEffect } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb"
import { SyncIndicator } from "@/components/sync-indicator"
import { ConnectSheetNavbarButton } from "@/components/connect-sheet-navbar-button"
import { ModeToggle } from "@/components/theme-toggle"
import { SkeletonBlock } from "@/components/ui/skeleton-block"

export function DashboardHeader({ role }: { role: string }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    return (
      <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/75 px-4 backdrop-blur-xl transition-colors duration-300">
        <div className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden">
          <SkeletonBlock width={28} height={28} variant="rectangular" />
          <Separator orientation="vertical" className="h-8" />
          <div className="flex items-center gap-2 truncate overflow-hidden">
            <SkeletonBlock width={75} height={16} variant="rectangular" />
            <Separator
              orientation="vertical"
              className="h-4 rotate-30 mx-4"
            />
            <SkeletonBlock width={75} height={16} variant="rectangular" />
          </div>
        </div>

        <div className="flex min-w-[300px] shrink-0 items-center justify-end gap-2">
          {/* SyncIndicator Skeleton */}
          <div className="flex items-center gap-4">
            <SkeletonBlock
              width={100}
              height={24}
              variant="rectangular"
              className="rounded-full"
            />
            <SkeletonBlock width={32} height={32} variant="rectangular" />
          </div>
          {/* ConnectSheetNavbarButton Skeleton */}
          <SkeletonBlock width={32} height={32} variant="rectangular" />
          {/* ModeToggle Skeleton */}
          <SkeletonBlock width={100} height={32} variant="rectangular" />
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/75 px-4 backdrop-blur-xl transition-colors duration-300">
      <div className="flex min-w-0 flex-1 items-center gap-4 overflow-hidden">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-8" />
        <div className="truncate overflow-hidden">
          <DashboardBreadcrumb />
        </div>
      </div>

      <div className="flex min-w-[300px] shrink-0 items-center justify-end gap-2">
        <SyncIndicator />
        <ConnectSheetNavbarButton isAdmin={role === "admin"} />
        <ModeToggle />
      </div>
    </header>
  )
}
