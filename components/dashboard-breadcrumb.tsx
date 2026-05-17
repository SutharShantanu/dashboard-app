"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const tab = searchParams?.get("tab") || "students";
  const sheet = searchParams?.get("sheet") || "Students";

  const tabLabel =
    tab === "users" ? "Sub-Admin Accounts" : tab === "logs" ? "System Audit Logs" : "Student Records";

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Dashboard</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={`/dashboard?tab=${tab}&sheet=${encodeURIComponent(sheet)}`}>{tabLabel}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {tab === "students" && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{sheet}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export function DashboardBreadcrumb() {
  return (
    <Suspense fallback={<div className="h-4 w-24 bg-muted animate-pulse" />}>
      <BreadcrumbContent />
    </Suspense>
  );
}
