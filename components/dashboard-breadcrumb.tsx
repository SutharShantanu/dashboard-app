"use client";

import React, { Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import Link from "next/link";

function BreadcrumbContent() {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab");

  // Query to get connected sheets list for dynamic spreadsheet title matching
  const { data: sheetsList } = useQuery({
    queryKey: ["connectedSheets"],
    queryFn: async () => {
      const res = await fetch("/api/connected-sheets");
      if (!res.ok) throw new Error("Failed to fetch sheets list");
      return res.json();
    },
    staleTime: 60000,
  });

  const connectedSheets = sheetsList?.connectedSheets || [];

  // Helper to format settings tab parameter into user friendly string
  const getSettingsTabLabel = (t: string | null) => {
    switch (t) {
      case "profile":
        return "Profile";
      case "notifications":
        return "Notifications";
      case "integrations":
        return "Integrations";
      case "logs":
        return "Logs";
      case "security":
        return "Admin Security";
      default:
        return "Profile";
    }
  };

  // Helper to format sheets tab parameter into user friendly string
  const getSheetsTabLabel = (t: string | null) => {
    switch (t) {
      case "connections":
        return "Connections";
      case "integrations":
        return "Integrations";
      default:
        return "Connections";
    }
  };

  // Build the breadcrumb elements based on the pathname
  const renderBreadcrumbs = () => {
    // 1. Settings Route
    if (pathname === "/settings") {
      const activeTabLabel = getSettingsTabLabel(tab);
      return (
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/settings?tab=profile">Settings</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{activeTabLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      );
    }

    // 2. Sheet Detail Route (/sheets/[id])
    if (pathname.startsWith("/sheets/") && pathname !== "/sheets") {
      const pathParts = pathname.split("/");
      const sheetId = pathParts[pathParts.length - 1];
      const matchedSheet = connectedSheets.find((s: any) => s.spreadsheetId === sheetId);
      const sheetTitle = matchedSheet?.title || "Sheet Detail";

      return (
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/sheets?tab=connections">Sheet Management</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{sheetTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      );
    }

    // 3. Sheet Management Page
    if (pathname === "/sheets") {
      const activeTabLabel = getSheetsTabLabel(tab);
      return (
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/sheets?tab=connections">Sheet Management</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{activeTabLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      );
    }

    // 4. Users Directory Page
    if (pathname === "/users") {
      return (
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Users Directory</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      );
    }

    // 5. Activity Logs Page
    if (pathname === "/logs") {
      return (
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Activity Logs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      );
    }

    // 6. Default / Fallback: Main Dashboard Page
    const activeTab = tab || "analytics";
    const sheetName = searchParams?.get("sheet") || "Students";

    if (activeTab === "students") {
      return (
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/dashboard?tab=students&sheet=${encodeURIComponent(sheetName)}`}>Student Records</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{sheetName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      );
    } else if (activeTab === "logs") {
      return (
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>System Audit Logs</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      );
    } else {
      // activeTab === "analytics" or default
      return (
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">Dashboard</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Analytics Overview</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      );
    }
  };

  return <Breadcrumb>{renderBreadcrumbs()}</Breadcrumb>;
}

export function DashboardBreadcrumb() {
  return (
    <Suspense fallback={<div className="h-4 w-24 bg-muted animate-pulse" />}>
      <BreadcrumbContent />
    </Suspense>
  );
}
