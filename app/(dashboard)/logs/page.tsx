"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { Spinner } from "@/components/ui/spinner"
import { LogsDataTable } from "@/components/logs-data-table"

export default function LogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const user = session?.user as any

  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/logs")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch logs")
      setLogs(data.logs || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated") {
      fetchLogs()
    } else if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  if (status === "loading" || loading) {
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
          <Button variant="outline" size="sm" onClick={fetchLogs}>
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
