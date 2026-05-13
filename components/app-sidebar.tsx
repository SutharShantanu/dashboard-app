"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  GraduationCap,
  Users,
  History,
  Plus,
  Loader2,
  Database,
} from "lucide-react";
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
} from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { NavUser } from "@/components/nav-user";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppSidebarProps {
  user: {
    displayName?: string | null;
    role: string;
    username: string;
  };
  initials: string;
  avatarColor: string;
}

export function AppSidebar({ user }: AppSidebarProps) {
  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab") || "students";
  const activeSheet = searchParams?.get("sheet") || "Students";
  const activeSpreadsheetId = searchParams?.get("spreadsheetId") || "";

  const [connectedSheets, setConnectedSheets] = useState<any[]>([]);

  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [connectUrl, setConnectUrl] = useState("");
  const [connectTitle, setConnectTitle] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const resConnected = await fetch("/api/connected-sheets");
        if (resConnected.ok) {
          const data = await resConnected.json();
          if (data.connectedSheets) setConnectedSheets(data.connectedSheets);
        }
      } catch {}
    }
    loadData();
  }, []);

  const handleConnectSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectUrl.trim()) return;

    setIsConnecting(true);
    try {
      const res = await fetch("/api/connected-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: connectUrl.trim(), title: connectTitle.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect Google Sheet");

      toast.success(`Google Sheet "${data.newSheet?.title || connectTitle}" connected successfully!`);
      setConnectedSheets((prev) => [...prev, data.newSheet]);
      setConnectUrl("");
      setConnectTitle("");
      setIsConnectOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to connect Google Sheet");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon">
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
          {/* CONNECTED EXTERNAL SPREADSHEETS SECTION */}
          <SidebarGroup>
            <div className="flex items-center justify-between px-2 py-1.5 group-data-[collapsible=icon]:hidden">
              <SidebarGroupLabel className="p-0">Connected Sheets</SidebarGroupLabel>
              {user.role === "admin" && (
                <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-muted">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </DialogTrigger>
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
                        <label className="text-sm font-medium">Title / Alias (Optional)</label>
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
                          onClick={() => setIsConnectOpen(false)}
                          disabled={isConnecting}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isConnecting}>
                          {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            <SidebarGroupContent>
              <SidebarMenu>
                {connectedSheets.map((s: any, index: number) => (
                  <SidebarMenuItem key={s.spreadsheetId}>
                    <SidebarMenuButton
                      asChild
                      isActive={tab === "students" && (activeSpreadsheetId === s.spreadsheetId || (!activeSpreadsheetId && index === 0))}
                      tooltip={s.title}
                    >
                      <Link href={`/dashboard?tab=students&sheet=${encodeURIComponent(s.sheetName || "Students")}${index === 0 ? "" : `&spreadsheetId=${encodeURIComponent(s.spreadsheetId)}`}`}>
                        <Database className="h-4 w-4" />
                        <span>{s.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* SYSTEM NAVIGATION SECTION */}
          <SidebarGroup>
            <SidebarGroupLabel>System Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={tab === "students"}
                    tooltip="Student Records Overview"
                  >
                    <Link href={`/dashboard?tab=students&sheet=${encodeURIComponent(activeSheet)}${activeSpreadsheetId ? `&spreadsheetId=${encodeURIComponent(activeSpreadsheetId)}` : ""}`}>
                      <GraduationCap />
                      <span>Student Records</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {user.role === "admin" && (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={tab === "users"}
                        tooltip="Sub-Admins Directory"
                      >
                        <Link href={`/dashboard?tab=users${activeSpreadsheetId ? `&spreadsheetId=${encodeURIComponent(activeSpreadsheetId)}` : ""}`}>
                          <Users />
                          <span>Sub-Admins Directory</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={tab === "logs"}
                        tooltip="Audit Logs"
                      >
                        <Link href={`/dashboard?tab=logs${activeSpreadsheetId ? `&spreadsheetId=${encodeURIComponent(activeSpreadsheetId)}` : ""}`}>
                          <History />
                          <span>Audit Logs</span>
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
    </TooltipProvider>
  );
}
