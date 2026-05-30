import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ModeToggle } from "@/components/theme-toggle"
import { SyncIndicator } from "@/components/sync-indicator"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/app-sidebar"
import { ConnectSheetNavbarButton } from "@/components/connect-sheet-navbar-button"
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb"
import { ScrollArea } from "@/components/ui/scroll-area"

import { DashboardHeader } from "@/components/dashboard-header"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user) {
    redirect("/login")
  }

  const { displayName, role, username, gender } = session.user as any
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : username.slice(0, 2).toUpperCase()

  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-fuchsia-500",
    "bg-rose-500",
  ]
  const colorIndex = initials.charCodeAt(0) % colors.length
  const avatarColor = colors[colorIndex]

  return (
    <SidebarProvider
      className="h-svh overflow-hidden"
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        user={{ displayName, role, username, gender }}
        initials={initials}
        avatarColor={avatarColor}
        variant="inset"
      />
      <SidebarInset className="h-full min-h-0 min-w-0">
        <DashboardHeader role={role} />

        <ScrollArea className="min-h-0 flex-1 min-w-0">
          <main className="flex max-w-full min-w-0 flex-col p-4">
            <div className="min-w-0 flex-1">{children}</div>
          </main>
        </ScrollArea>
      </SidebarInset>
    </SidebarProvider>
  )
}
