"use client"

import React, { useState, useEffect, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { BarChart3 } from "lucide-react"

import { PageHeader } from "@/components/page-header"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SkeletonBlock } from "@/components/ui/skeleton-block"
import { Student } from "@/types/dashboard"

import { AnalyticsTab } from "@/components/dashboard-tabs/analytics-tab"

function DashboardPageContent() {
  const { data: session, status: sessionStatus } = useSession()
  const searchParams = useSearchParams()
  const sheetParam = searchParams.get("sheet") || "Students"
  const spreadsheetIdParam = searchParams.get("spreadsheetId") || ""

  // Global State
  const [students, setStudents] = useState<Student[]>([])

  // Layer 1: Main Data Fetching via React Query
  const { data: studentData } = useQuery({
    queryKey: ["students", sheetParam, spreadsheetIdParam],
    queryFn: async () => {
      const url = `/api/students?sheet=${encodeURIComponent(sheetParam)}${spreadsheetIdParam ? `&spreadsheetId=${encodeURIComponent(spreadsheetIdParam)}` : ""}`
      const res = await fetch(url)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to load student records.")
      }
      return res.json()
    },
    enabled: sessionStatus === "authenticated",
    staleTime: 10000, // 10 seconds
  })

  // Layer 1.8: Analytics Data Fetching via React Query
  const { data: analyticsData } = useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const res = await fetch("/api/analytics")
      if (!res.ok) throw new Error("Failed to load analytics")
      return res.json()
    },
    enabled: sessionStatus === "authenticated",
    staleTime: 60000,
  })

  // Synchronize query data with local state
  useEffect(() => {
    if (studentData) {
      setStudents(studentData.data || [])
    }
  }, [studentData])

  if (sessionStatus === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4 md:p-8">
        <div className="flex w-full max-w-5xl flex-col gap-6">
          <div className="flex items-center justify-between">
            <SkeletonBlock variant="rectangular" width={250} height={40} />
            <SkeletonBlock variant="circular" width={40} height={40} />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock
                key={i}
                variant="rectangular"
                width="100%"
                height={120}
              />
            ))}
          </div>
          <SkeletonBlock
            variant="rectangular"
            width="100%"
            height={400}
            showSpinner={true}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full space-y-4">
      <PageHeader
        subtitle="Secured Sheet Database"
        title="Spreadsheet Portal Dashboard"
        pulse={true}
      />

      <Tabs value="analytics" className="w-full">
        <TabsList>
          <TabsTrigger
            value="analytics"
            className="flex items-center gap-1 text-sm"
          >
            <BarChart3 className="h-4 w-4" />
            Analytics Overview
          </TabsTrigger>
        </TabsList>

        <AnalyticsTab analyticsData={analyticsData} students={students} />
      </Tabs>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-8">
          <div className="flex items-center justify-between">
            <SkeletonBlock
              variant="rectangular"
              width={250}
              height={40}
              className="rounded-lg"
            />
            <SkeletonBlock variant="circular" width={40} height={40} />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock
                key={i}
                variant="rectangular"
                width="100%"
                height={120}
                className="rounded-xl"
              />
            ))}
          </div>
          <SkeletonBlock
            variant="rectangular"
            width="100%"
            height={500}
            className="rounded-xl"
            showSpinner={true}
          />
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  )
}
