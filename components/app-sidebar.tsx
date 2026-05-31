"use client"

import React, { useState, useEffect } from "react"
import { useConnectedSheets } from "@/hooks/useConnectedSheets"
import Link from "next/link"
import { useSearchParams, usePathname } from "next/navigation"
import {
  Sparkles,
  GraduationCap,
  Users,
  History,
  LayoutDashboard,
  Plus,
  ExternalLink,
  RefreshCw,
  Trash2,
  Globe,
  FileSpreadsheet,
} from "lucide-react"
import { GoogleSheetsIcon } from "@/components/icons/google-sheets"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { NavUser } from "@/components/nav-user"
import { getAvatarUrl } from "@/lib/utils"
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip"
import { SkeletonBlock } from "@/components/ui/skeleton-block"
import { SidebarSkeleton } from "./sidebar/sidebar-skeleton"
import { SidebarSearch } from "./sidebar/sidebar-search"
import { SidebarDeleteDialog } from "./sidebar/sidebar-delete-dialog"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    displayName?: string | null
    role: string
    username: string
    gender?: string
  }
  initials: string
  avatarColor: string
}

export function AppSidebar({
  user,
  initials,
  avatarColor,
  ...props
}: AppSidebarProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const tab = searchParams?.get("tab") || "students"
  const activeSpreadsheetId = searchParams?.get("spreadsheetId") || ""

  const { data: connectedSheets = [], isLoading: isLoadingSheets } =
    useConnectedSheets()

  const [sheetToDelete, setSheetToDelete] = useState<{
    spreadsheetId: string
    title: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  const handleSync = async (spreadsheetId: string, title: string) => {
    const toastId = toast.loading(`Syncing "${title}"...`)
    try {
      const res = await fetch(`/api/students?spreadsheetId=${spreadsheetId}`, {
        method: "PUT",
      })
      if (!res.ok) throw new Error("Failed to sync")
      toast.success(`Synced "${title}" successfully`, { id: toastId })
      window.dispatchEvent(new Event("sheet_connected"))
    } catch (err) {
      toast.error(`Failed to sync "${title}"`, { id: toastId })
    }
  }

  const allNavItems = React.useMemo(() => {
    const items: { title: string; url: string; icon?: any }[] = [
      { title: "Dashboard Home", url: "/dashboard", icon: LayoutDashboard },
      { title: "Students Directory", url: "/students", icon: GraduationCap },
    ]

    connectedSheets.forEach((s) => {
      items.push({
        title: s.title,
        url: `/sheets/${s.spreadsheetId}`,
        icon: GoogleSheetsIcon,
      })
    })

    if (user.role === "admin") {
      items.push(
        {
          title: "Manage Sheets",
          url: "/sheets?tab=connections",
          icon: FileSpreadsheet,
        },
        {
          title: "Integrations",
          url: "/sheets?tab=integrations",
          icon: Globe,
        }
      )
    }

    if (user.username === "SabaAdmin") {
      items.push({
        title: "Users Directory",
        url: "/users",
        icon: Users,
      })
    }

    items.push({
      title: "Activity Logs",
      url: "/logs",
      icon: History,
    })

    return items
  }, [connectedSheets, user.role, user.username])

  const handleConfirmDelete = async () => {
    if (!sheetToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch("/api/connected-sheets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: sheetToDelete.spreadsheetId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to remove sheet")
      toast.success(`Removed "${sheetToDelete.title}" successfully`)
      window.dispatchEvent(new Event("sheet_connected"))
      setSheetToDelete(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to remove sheet")
    } finally {
      setIsDeleting(false)
    }
  }

  if (!mounted) {
    return <SidebarSkeleton user={user} {...props} />
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader className="gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/10">
              <Sparkles className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <span className="font-bold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
              Aegis Sheet DB
            </span>
          </div>

          <SidebarSearch allNavItems={allNavItems} />
        </SidebarHeader>

        <SidebarContent>
          {/* SHEETS SECTION */}
          <SidebarGroup>
            <div className="flex items-center justify-between px-2 py-1.5 group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className="px-0 text-muted-foreground uppercase">
                Connected Sheets
              </SidebarGroupLabel>
              {user.role === "admin" && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      onClick={() =>
                        window.dispatchEvent(
                          new Event("open_connect_sheet_dialog")
                        )
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Connect New Sheet</TooltipContent>
                </Tooltip>
              )}
            </div>

            <SidebarGroupContent>
              <SidebarMenu>
                {isLoadingSheets
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <SidebarMenuItem key={i}>
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <SkeletonBlock variant="circular" width={16} height={16} />
                          <SkeletonBlock variant="rectangular" width={96} height={16} className="rounded-md" />
                        </div>
                      </SidebarMenuItem>
                    ))
                  : connectedSheets.length > 0
                    ? connectedSheets.map((s: any) => (
                        <ContextMenu key={s.spreadsheetId}>
                          <ContextMenuTrigger asChild>
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                isActive={
                                  pathname === `/sheets/${s.spreadsheetId}` ||
                                  (pathname === "/dashboard" &&
                                    activeSpreadsheetId === s.spreadsheetId)
                                }
                                tooltip={s.title}
                              >
                                <Link href={`/sheets/${s.spreadsheetId}`}>
                                  <GoogleSheetsIcon className="h-3.5 w-3.5 text-primary" />
                                  <span className="truncate">{s.title}</span>
                                </Link>
                              </SidebarMenuButton>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <SidebarMenuAction
                                    onClick={() =>
                                      handleSync(s.spreadsheetId, s.title)
                                    }
                                  >
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </SidebarMenuAction>
                                </TooltipTrigger>
                                <TooltipContent>Sync Sheet</TooltipContent>
                              </Tooltip>
                            </SidebarMenuItem>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-fit">
                            <ContextMenuItem
                              onClick={() =>
                                window.open(
                                  `https://docs.google.com/spreadsheets/d/${s.spreadsheetId}/edit`,
                                  "_blank"
                                )
                              }
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>Open in Google Sheets</span>
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() => {
                                window.dispatchEvent(
                                  new Event("sheet_connected")
                                )
                                toast.success(`Refreshed "${s.title}" data`)
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                              <span>Sync Data</span>
                            </ContextMenuItem>
                            {user.role === "admin" && (
                              <>
                                <ContextMenuSeparator />
                                <ContextMenuItem
                                  variant="destructive"
                                  onClick={() =>
                                    setSheetToDelete({ spreadsheetId: s.spreadsheetId, title: s.title })
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span>Remove Sheet</span>
                                </ContextMenuItem>
                              </>
                            )}
                          </ContextMenuContent>
                        </ContextMenu>
                      ))
                    : null}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* CONFIGURATION SECTION */}
          <SidebarGroup>
            <SidebarGroupLabel className="px-0 text-muted-foreground uppercase">
              Configuration
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/dashboard" && !activeSpreadsheetId}
                    tooltip="Dashboard Home"
                  >
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard Home</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {user.role === "admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          pathname === "/sheets" &&
                          (tab === "connections" || !tab)
                        }
                        tooltip="Manage Sheets"
                      >
                        <Link href="/sheets?tab=connections">
                          <FileSpreadsheet className="h-4 w-4" />
                          <span>Manage Sheets</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          pathname === "/sheets" && tab === "integrations"
                        }
                        tooltip="Integrations"
                      >
                        <Link href="/sheets?tab=integrations">
                          <Globe className="h-4 w-4" />
                          <span>Integrations</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/users"}
                        tooltip="Users Directory"
                      >
                        <Link
                          href={`/users${activeSpreadsheetId ? `?spreadsheetId=${encodeURIComponent(activeSpreadsheetId)}` : ""}`}
                        >
                          <Users className="h-4 w-4" />
                          <span>Users Directory</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/students"}
                    tooltip="Students Directory"
                  >
                    <Link href="/students">
                      <GraduationCap className="h-4 w-4" />
                      <span>Students Directory</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/logs"}
                    tooltip="Activity Logs"
                  >
                    <Link href="/logs">
                      <History className="h-4 w-4" />
                      <span>Activity Logs</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser
            user={{
              name: user.displayName || user.username,
              email: `${user.username}@aegis.local`,
              avatar: getAvatarUrl(user.username, user.role, user.gender),
              role: user.role,
              username: user.username,
            }}
          />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <SidebarDeleteDialog
        sheetToDelete={sheetToDelete}
        isDeleting={isDeleting}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setSheetToDelete(null)
        }}
        onConfirm={handleConfirmDelete}
      />
    </TooltipProvider>
  )
}
