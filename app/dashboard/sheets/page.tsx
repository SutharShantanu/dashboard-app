"use client"

import { useState, useEffect, useMemo } from "react"
import { useSession, signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/ui/data-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Database,
  Plus,
  Trash2,
  ExternalLink,
  AlertCircle,
  Link as LinkIcon,
  Globe,
  Settings2,
  Cloud,
  MessageSquare,
  CheckCircle2,
  RefreshCcw,
  Eye,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { BadgeDot } from "@/components/ui/badge-dot"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, formatDistanceToNow } from "date-fns"
import { Spinner } from "@/components/ui/spinner"

export default function SheetsManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get("tab") || "connections"
  const user = session?.user as any

  const [connectedSheets, setConnectedSheets] = useState<any[]>([])
  const [isInitialLoading, setIsInitialLoading] = useState(true)

  useEffect(() => {
    const handleSheetConnected = () => {
      fetchSheets()
    }
    window.addEventListener("sheet_connected", handleSheetConnected)
    return () => {
      window.removeEventListener("sheet_connected", handleSheetConnected)
    }
  }, [])
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean | null>(
    null
  )
  const [googleResponse, setGoogleResponse] = useState<any>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    async function checkGoogleConnection() {
      try {
        const res = await fetch("/api/drive/list")
        setIsGoogleConnected(res.ok)
        if (res.ok) {
          const data = await res.json()
          setGoogleResponse(data)
        }
      } catch (err) {
        setIsGoogleConnected(false)
      }
    }
    if (user?.role === "admin") {
      checkGoogleConnection()
      fetchSheets()
    } else if (user) {
      setIsInitialLoading(false)
    }
  }, [user])

  const fetchSheets = async () => {
    try {
      const res = await fetch("/api/connected-sheets")
      if (res.ok) {
        const data = await res.json()
        setConnectedSheets(data.connectedSheets || [])
      }
    } catch (err) {
      console.error("Failed to fetch sheets", err)
      toast.error("Failed to load connected sheets")
    } finally {
      setIsInitialLoading(false)
    }
  }



  const handleDeleteSheet = async (spreadsheetId: string) => {
    const promise = async () => {
      const res = await fetch("/api/connected-sheets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      })
      if (!res.ok) throw new Error("Failed to remove sheet")
      setConnectedSheets((prev) =>
        prev.filter((s) => s.spreadsheetId !== spreadsheetId)
      )
      window.dispatchEvent(new Event("sheet_connected"))
    }

    toast.promise(promise(), {
      loading: "Removing spreadsheet connection...",
      success: "Spreadsheet disconnected successfully",
      error: "Could not remove spreadsheet link",
    })
  }

  const columns = useMemo<ColumnDef<any>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Display Name",
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("title")}</div>
        ),
      },
      {
        accessorKey: "spreadsheetId",
        header: "Spreadsheet ID",
        cell: ({ row }) => (
          <div className="hidden font-mono text-xs text-muted-foreground md:table-cell">
            {row.getValue("spreadsheetId")}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Added At",
        cell: ({ row }) => {
          const createdAt = row.getValue("createdAt") as string | undefined
          return (
            <div className="flex flex-col text-sm text-muted-foreground">
              <span>
                {createdAt
                  ? formatDistanceToNow(new Date(createdAt), {
                      addSuffix: true,
                    })
                  : "-"}
              </span>
              <span className="text-tiny opacity-70">
                {createdAt
                  ? format(new Date(createdAt), "MMM d, yyyy HH:mm")
                  : ""}
              </span>
            </div>
          )
        },
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant="secondary" className="gap-1 text-xs">
            <BadgeDot variant="success" pulse />
            Connected
          </Badge>
        ),
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const sheet = row.original

          const handleSync = async () => {
            const promise = async () => {
              const res = await fetch(
                `/api/students?spreadsheetId=${sheet.spreadsheetId}`,
                {
                  method: "PUT",
                }
              )
              if (!res.ok) throw new Error("Failed to sync sheet data")
              return res.json()
            }

            toast.promise(promise(), {
              loading: "Syncing sheet data...",
              success: "Sheet data synced successfully",
              error: "Could not sync sheet data",
            })
          }

          return (
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" size="icon" asChild title="View Data">
                <Link href={`/dashboard/sheets/${sheet.spreadsheetId}`}>
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Sync Data"
                onClick={handleSync}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
                title="Open in Google Sheets"
              >
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheet.spreadsheetId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    title="Delete Connection"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disconnect the spreadsheet "{sheet.title}" from
                      the dashboard. The data in Google Sheets will not be
                      affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDeleteSheet(sheet.spreadsheetId)}
                      variant="destructive"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )
        },
      },
    ],
    [handleDeleteSheet]
  )



  if (status === "loading" || isInitialLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (user?.role !== "admin") {
    return (
      <div className="w-full py-10">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircle className="text-destructive" />
            </EmptyMedia>
            <EmptyTitle>Access Denied</EmptyTitle>
            <EmptyDescription>
              Only administrators can manage connected Google Sheets.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="mx-auto space-y-8">
      <PageHeader
        subtitle="Workspace Setup"
        title="Sheet Management"
        description="Connect and manage Google Sheets to sync data with your dashboard."
      />

      {isGoogleConnected === false && (
        <Alert variant="destructive">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">
            Google Connection Required
          </AlertTitle>
          <AlertDescription className="mt-1">
            The account isn't connected to Google. Kindly connect and then you
            can choose the sheet.
          </AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          router.push(`/dashboard/sheets?tab=${val}`)
        }}
      >
        <TabsList>
          <TabsTrigger value="connections" className="gap-2">
            <Database className="h-4 w-4" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Globe className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Connected Sheets</CardTitle>
                <CardDescription>
                  View and manage all external spreadsheets currently linked to
                  your account.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.promise(fetchSheets(), {
                      loading: "Refreshing connections...",
                      success: "Connection list updated.",
                      error: "Failed to refresh connections.",
                    })
                  }}
                  disabled={isInitialLoading}
                >
                  <RefreshCcw
                    className="h-4 w-4"
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search)
                    params.set("addSheet", "open")
                    params.set("addSheetTab", "url")
                    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false })
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Sheet</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {connectedSheets.length === 0 ? (
                <Empty className="rounded-lg border-2 border-dashed py-12">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Database className="text-muted-foreground" />
                    </EmptyMedia>
                    <EmptyTitle>No sheets connected</EmptyTitle>
                    <EmptyDescription>
                      Connect your first Google Sheet to start managing data.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <DataTable columns={columns} data={connectedSheets} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Integrations</CardTitle>
              <CardDescription>
                Only Google integration is allowed for now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-muted p-3">
                        <Cloud className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          Google Drive
                          {isGoogleConnected ? (
                            <Badge variant="secondary" className="gap-1.5">
                              <BadgeDot variant="success" pulse />
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1.5">
                              <BadgeDot variant="destructive" pulse />
                              Not Connected
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>
                          Browse and link spreadsheets from your Drive.
                        </CardDescription>
                      </div>
                    </div>
                    <div>
                      {!isGoogleConnected && (
                        <Button
                          onClick={() =>
                            signIn("google", {
                              callbackUrl: "/dashboard/sheets",
                            })
                          }
                        >
                          <Plus className="h-4 w-4" />
                          <span className="hidden sm:inline">Connect Now</span>
                          <span className="sm:hidden">Connect</span>
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              </div>

              {isGoogleConnected && googleResponse && (
                <div className="mt-6 space-y-4">
                  <div className="text-sm font-bold text-foreground/80">
                    Response Details:
                  </div>
                  <pre className="max-h-60 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs">
                    {JSON.stringify(googleResponse, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
