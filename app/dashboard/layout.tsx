import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ModeToggle } from "@/components/theme-toggle";
import { SyncIndicator } from "@/components/sync-indicator";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

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
    <SidebarProvider>
      <AppSidebar
        user={{ displayName, role, username }}
        initials={initials}
        avatarColor={avatarColor}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/75 px-8 backdrop-blur-xl transition-colors duration-300">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <SyncIndicator />
          </div>

          <div className="flex items-center gap-3.5">
            <ModeToggle />
          </div>
        </header>

        <main className="flex-1 p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
