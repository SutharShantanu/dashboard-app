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
  Plus,
  Loader2,
  Database,
  ExternalLink,
  RefreshCw,
  Trash2,
  Globe,
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
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { NavUser } from "@/components/nav-user"
import { TooltipProvider } from "@/components/ui/tooltip"

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

  const [isConnectOpen, setIsConnectOpen] = useState(false)
  const [connectUrl, setConnectUrl] = useState("")
  const [connectTitle, setConnectTitle] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)

  const [sheetToDelete, setSheetToDelete] = useState<{
    spreadsheetId: string
    title: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const resConnected = await fetch("/api/connected-sheets")
        if (resConnected.ok) {
          const data = await resConnected.json()
          if (data.connectedSheets) setConnectedSheets(data.connectedSheets)
        }
      } catch {}
    }
    loadData()

    const handleSheetConnected = () => {
      loadData()
    }
    window.addEventListener("sheet_connected", handleSheetConnected)
    return () =>
      window.removeEventListener("sheet_connected", handleSheetConnected)
  }, [])

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
      setConnectedSheets((prev) => [...prev, data.newSheet])
      setConnectUrl("")
      setConnectTitle("")
      setIsConnectOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to connect Google Sheet")
    } finally {
      setIsConnecting(false)
    }
  }

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
        <SidebarHeader>
          <div className="flex h-16 items-center gap-3 px-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/10">
              <Sparkles className="h-4.5 w-4.5 animate-pulse" />
            </div>
            <span className="font-bold tracking-tight text-foreground group-data-[collapsible=icon]:hidden">
              Aegis Sheet DB
            </span>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {/* SHEETS SECTION */}
          <SidebarGroup>
            <div className="flex items-center justify-between px-2 py-1.5 group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className="p-0 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
                Connected Sheets
              </SidebarGroupLabel>
              {user.role === "admin" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:bg-muted"
                  onClick={() => setIsConnectOpen(true)}
                  title="Connect New Sheet"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <SidebarGroupContent>
              <SidebarMenu>
                {connectedSheets.length > 0 ? (
                  connectedSheets.map((s: any, index: number) => (
                    <ContextMenu key={s.spreadsheetId}>
                      <ContextMenuTrigger asChild>
                        <SidebarMenuItem>
                          <SidebarMenuButton
                            asChild
                            isActive={
                              pathname === `/dashboard/sheets/${s.spreadsheetId}` ||
                              (pathname === "/dashboard" && activeSpreadsheetId === s.spreadsheetId)
                            }
                            tooltip={s.title}
                          >
                            <Link
                              href={`/dashboard/sheets/${s.spreadsheetId}`}
                            >
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background shadow-sm">
                                <Database className="h-3.5 w-3.5 text-primary" />
                              </div>
                              <span className="truncate">{s.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-56">
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
                            window.dispatchEvent(new Event("sheet_connected"))
                            toast.success(`Refreshed "${s.title}" data`)
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Reload / Sync Data</span>
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
                ) : (
                  <div className="px-4 py-6 text-center group-data-[collapsible=icon]:hidden">
                    <Database className="mx-auto h-8 w-8 text-muted-foreground/20 mb-2" />
                    <p className="text-[10px] text-muted-foreground font-medium">No sheets connected</p>
                    {user.role === "admin" && (
                      <Button 
                        variant="link" 
                        className="h-auto p-0 text-[10px] text-primary"
                        onClick={() => setIsConnectOpen(true)}
                      >
                        Connect one now
                      </Button>
                    )}
                  </div>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* CONFIGURATION SECTION */}
          <SidebarGroup>
            <SidebarGroupLabel>Configuration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {user.role === "admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/dashboard/sheets" && tab === "connections"}
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
                        isActive={pathname === "/dashboard/sheets" && tab === "integrations"}
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
                        isActive={pathname === "/dashboard/users" || tab === "users"}
                        tooltip="Users Directory"
                      >
                        <Link
                          href={`/dashboard/users${activeSpreadsheetId ? `?spreadsheetId=${encodeURIComponent(activeSpreadsheetId)}` : ""}`}
                        >
                          <Users />
                          <span>Users Directory</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser
            user={{
              name: user.displayName || user.username,
              email: `${user.username}@aegis.local`,
              avatar: "",
              role: user.role,
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
                  <Loader2 className="h-4 w-4 animate-spin" />
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
