"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/page-header"
import { Spinner } from "@/components/ui/spinner"
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

  if (status === "unauthenticated") {
    router.push("/login")
  }

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
      <div className="flex h-full items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  return (
    <div className="py-10 space-y-8 w-full">
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
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center border-2 border-dashed rounded-lg">
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
