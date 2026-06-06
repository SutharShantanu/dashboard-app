"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Spinner } from "@/components/ui/spinner"
import { SkeletonBlock } from "@/components/ui/skeleton-block"
import { LogsDataTable } from "@/components/logs-data-table"

async function fetchLogs() {
  const res = await fetch("/api/logs")
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Failed to fetch logs")
  return data.logs ?? []
}

export default function LogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const user = session?.user as { role?: string } | undefined

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  const {
    data: logs = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["logs"],
    queryFn: fetchLogs,
    enabled: status === "authenticated",
  })

  if (status === "loading" || isLoading) {
    return (
      <div className="w-full space-y-8 py-10">
        <div className="space-y-2">
          <SkeletonBlock
            variant="rectangular"
            width={200}
            height={32}
            className="rounded-lg"
          />
          <SkeletonBlock
            variant="rectangular"
            width={300}
            height={20}
            className="rounded-lg"
          />
        </div>
        <SkeletonBlock
          variant="rectangular"
          width="100%"
          height={500}
          className="rounded-xl"
          showSpinner={true}
        />
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      <PageHeader
        subtitle="System Audit"
        title="Activity Logs"
        description="View system activity and access logs."
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Logs</CardTitle>
            <CardDescription>
              {user?.role === "admin"
                ? "Showing all activity logs for all users."
                : "Showing your activity logs."}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="rounded-lg border-2 border-dashed py-10 text-center text-sm text-muted-foreground">
              No logs found.
            </p>
          ) : (
            <LogsDataTable logs={logs} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
