import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ModeToggle } from "@/components/theme-toggle";
import { SyncIndicator } from "@/components/sync-indicator";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AppSidebar } from "@/components/app-sidebar";
import { ConnectSheetNavbarButton } from "@/components/connect-sheet-navbar-button";
import { DashboardBreadcrumb } from "@/components/dashboard-breadcrumb";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  const { displayName, role, username } = session.user;
  const initials = displayName
    ? displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : username.slice(0, 2).toUpperCase();

  // Deterministic avatar color based on initials
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
  ];
  const colorIndex = initials.charCodeAt(0) % colors.length;
  const avatarColor = colors[colorIndex];

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
        user={{ displayName, role, username }}
        initials={initials}
        avatarColor={avatarColor}
        variant="inset"
      />
      <SidebarInset className="h-full min-h-0">
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b border-border bg-background/75 px-6 md:px-8 backdrop-blur-xl transition-colors duration-300">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <DashboardBreadcrumb />
          </div>

          <div className="flex items-center gap-3.5">
            <SyncIndicator />
            <ConnectSheetNavbarButton isAdmin={role === "admin"} />
            <ModeToggle />
          </div>
        </header>

        <main className="flex min-h-0 max-w-full min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="min-h-full min-w-0 flex-1">{children}</div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
