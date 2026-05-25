"use client"

import React, { useState, useEffect } from "react"
import Link from "next/link"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import {
  Sparkles,
  GraduationCap,
  Users,
  UserPlus,
  History,
  LayoutDashboard,
  Plus,
  Database,
  ExternalLink,
  RefreshCw,
  Trash2,
  Globe,
  Settings2,
  Search,
} from "lucide-react"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Card } from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"
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
import { Spinner } from "./ui/spinner"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: {
    displayName?: string | null
    role: string
    username: string
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
  const router = useRouter()
  const pathname = usePathname()
  const tab = searchParams?.get("tab") || "students"
  const activeSheet = searchParams?.get("sheet") || "Students"
  const activeSpreadsheetId = searchParams?.get("spreadsheetId") || ""

  const [connectedSheets, setConnectedSheets] = useState<any[]>([])
  const [isLoadingSheets, setIsLoadingSheets] = useState(true)

  const [sheetToDelete, setSheetToDelete] = useState<{
    spreadsheetId: string
    title: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedTerm, setDebouncedTerm] = useState("")

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  const inputRef = React.useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const allNavItems = React.useMemo(() => {
    const items: { title: string; url: string; icon?: any }[] = [
      { title: "Dashboard Home", url: "/dashboard", icon: LayoutDashboard },
    ]

    connectedSheets.forEach((s) => {
      items.push({
        title: s.title,
        url: `/dashboard/sheets/${s.spreadsheetId}`,
        icon: Database,
      })
    })

    if (user.role === "admin") {
      items.push(
        {
          title: "Manage Sheets",
          url: "/dashboard/sheets?tab=connections",
          icon: Database,
        },
        {
          title: "Integrations",
          url: "/dashboard/sheets?tab=integrations",
          icon: Globe,
        }
      )
    }

    if (user.username === "SabaAdmin") {
      items.push({
        title: "Users Directory",
        url: "/dashboard/users",
        icon: Users,
      })
    }

    items.push({
      title: "Activity Logs",
      url: "/dashboard/logs",
      icon: History,
    })

    return items
  }, [connectedSheets, user.role, user.username])

  const searchResults = React.useMemo(() => {
    if (!debouncedTerm) return []
    return allNavItems.filter((item) =>
      item.title.toLowerCase().includes(debouncedTerm.toLowerCase())
    )
  }, [debouncedTerm, allNavItems])

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoadingSheets(true)
        const resConnected = await fetch("/api/connected-sheets")
        if (resConnected.ok) {
          const data = await resConnected.json()
          if (data.connectedSheets) setConnectedSheets(data.connectedSheets)
        }
      } catch {
      } finally {
        setIsLoadingSheets(false)
      }
    }
    loadData()

    const handleSheetConnected = () => {
      loadData()
    }
    window.addEventListener("sheet_connected", handleSheetConnected)
    return () =>
      window.removeEventListener("sheet_connected", handleSheetConnected)
  }, [])

  const handleDeleteSheet = (spreadsheetId: string, title: string) => {
    setSheetToDelete({ spreadsheetId, title })
  }

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
      setConnectedSheets((prev) =>
        prev.filter((s) => s.spreadsheetId !== sheetToDelete.spreadsheetId)
      )
      window.dispatchEvent(new Event("sheet_connected"))
      setSheetToDelete(null)
    } catch (err: any) {
      toast.error(err.message || "Failed to remove sheet")
    } finally {
      setIsDeleting(false)
    }
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

          <div className="relative group-data-[collapsible=icon]:hidden">
            <InputGroup className="w-full min-w-0">
              <InputGroupAddon>
                <Search className="size-3.5" />
              </InputGroupAddon>
              <InputGroupInput
                ref={inputRef}
                placeholder="Search sheets or config..."
                className="min-w-0 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <InputGroupAddon align="inline-end">
                {searchTerm !== debouncedTerm && searchTerm.length > 0 ? (
                  <Spinner className="size-3.5 text-muted-foreground" />
                ) : (
                  <Kbd className="text-xs">CTRL + K</Kbd>
                )}
              </InputGroupAddon>
            </InputGroup>

            {searchTerm.length > 0 && (
              <div className="absolute top-full right-0 left-0 z-50 mt-1">
                <Card className="overflow-hidden p-0 shadow-lg">
                  <Command className="h-auto max-h-75">
                    <CommandList className="max-h-75">
                      <CommandEmpty>
                        No results found for &quot;{searchTerm}&quot;
                      </CommandEmpty>

                      {searchResults.length > 0 && (
                        <CommandGroup heading="Results">
                          {searchResults.map((item) => (
                            <CommandItem
                              key={item.url}
                              onSelect={() => {
                                router.push(item.url)
                                setSearchTerm("")
                              }}
                              className="flex cursor-pointer items-center gap-3 px-3 py-2.5 sm:gap-2 sm:py-1.5"
                            >
                              {item.icon && (
                                <item.icon className="size-4 text-muted-foreground sm:size-3.5" />
                              )}
                              <span className="text-sm sm:text-xs">
                                {item.title}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </Card>
              </div>
            )}
          </div>
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
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                      </SidebarMenuItem>
                    ))
                  : connectedSheets.length > 0
                    ? connectedSheets.map((s: any, index: number) => (
                        <ContextMenu key={s.spreadsheetId}>
                          <ContextMenuTrigger asChild>
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                asChild
                                isActive={
                                  pathname ===
                                    `/dashboard/sheets/${s.spreadsheetId}` ||
                                  (pathname === "/dashboard" &&
                                    activeSpreadsheetId === s.spreadsheetId)
                                }
                                tooltip={s.title}
                              >
                                <Link
                                  href={`/dashboard/sheets/${s.spreadsheetId}`}
                                >
                                  <Database className="h-3.5 w-3.5 text-primary" />
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
                                    handleDeleteSheet(s.spreadsheetId, s.title)
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
                {/* Manage Sheets moved to Configuration section */}
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
                          pathname === "/dashboard/sheets" &&
                          (tab === "connections" || !tab)
                        }
                        tooltip="Manage Sheets"
                      >
                        <Link href="/dashboard/sheets?tab=connections">
                          <Database className="h-4 w-4" />
                          <span>Manage Sheets</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          pathname === "/dashboard/sheets" &&
                          tab === "integrations"
                        }
                        tooltip="Integrations"
                      >
                        <Link href="/dashboard/sheets?tab=integrations">
                          <Globe className="h-4 w-4" />
                          <span>Integrations</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/dashboard/users"}
                        tooltip="Users Directory"
                      >
                        <Link
                          href={`/dashboard/users${activeSpreadsheetId ? `?spreadsheetId=${encodeURIComponent(activeSpreadsheetId)}` : ""}`}
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
                    isActive={pathname === "/dashboard/logs"}
                    tooltip="Activity Logs"
                  >
                    <Link href="/dashboard/logs">
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
              avatar: getAvatarUrl(user.username, user.role),
              role: user.role,
              username: user.username,
            }}
          />
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      <AlertDialog
        open={sheetToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setSheetToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Are you sure you want to remove &quot;{sheetToDelete?.title}
              &quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action will unbind the Google Sheet from the dashboard. Your
              underlying spreadsheet data in Google Sheets will remain intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Remove
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  )
}
