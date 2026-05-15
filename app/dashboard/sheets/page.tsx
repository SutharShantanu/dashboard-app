"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Database, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Loader2,
  AlertCircle,
  Link as LinkIcon,
  Globe,
  Settings2,
  Cloud,
  Slack,
  CheckCircle2
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
import { DriveBrowser } from "@/components/drive-browser"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export default function SheetsManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get("tab") || "connections"
  const user = session?.user as any

  const [loading, setLoading] = useState(false)
  const [connectedSheets, setConnectedSheets] = useState<any[]>([])
  const [sheetUrl, setSheetUrl] = useState("")
  const [sheetTitle, setSheetTitle] = useState("")
  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isDriveOpen, setIsDriveOpen] = useState(false)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  useEffect(() => {
    async function fetchSheets() {
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
    if (user?.role === "admin") {
      fetchSheets()
    } else if (user) {
      setIsInitialLoading(false)
    }
  }, [user])

  const handleConnectSheet = async (e?: React.FormEvent, customData?: { url: string, title: string }) => {
    if (e) e.preventDefault()
    setLoading(true)
    
    const urlToUse = customData?.url || sheetUrl
    const titleToUse = customData?.title || sheetTitle

    try {
      const res = await fetch("/api/connected-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToUse, title: titleToUse }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to connect sheet")
      toast.success("Sheet connected successfully")
      setSheetUrl("")
      setSheetTitle("")
      setConnectedSheets([...connectedSheets, data.newSheet])
      window.dispatchEvent(new Event("sheet_connected"))
      setIsDriveOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSheet = async (spreadsheetId: string) => {
    try {
      const res = await fetch("/api/connected-sheets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      })
      if (!res.ok) throw new Error("Failed to remove sheet")
      toast.success("Sheet removed successfully")
      setConnectedSheets(connectedSheets.filter(s => s.spreadsheetId !== spreadsheetId))
      window.dispatchEvent(new Event("sheet_connected"))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleDriveSelect = (file: any) => {
    const url = `https://docs.google.com/spreadsheets/d/${file.id}/edit`
    handleConnectSheet(undefined, { url, title: file.name })
  }

  if (status === "loading" || isInitialLoading) {
    return <div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="animate-spin" /></div>
  }

  if (user?.role !== "admin") {
    return (
      <div className="container mx-auto py-10">
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
    <div className="container mx-auto py-10 space-y-8 max-w-7xl">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Sheet Management</h1>
        <p className="text-muted-foreground">
          Connect and manage Google Sheets to sync data with your dashboard.
        </p>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={(val) => {
          router.push(`/dashboard/sheets?tab=${val}`)
        }} 
        className="space-y-6"
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
          <div className="grid gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Connected Sheets</CardTitle>
                  <CardDescription>View and manage all external spreadsheets currently linked to your account.</CardDescription>
                </div>
                <Dialog open={isDriveOpen} onOpenChange={setIsDriveOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Sheet
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Spreadsheet</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="url" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="url">Via URL</TabsTrigger>
                        <TabsTrigger value="drive">Browse Drive</TabsTrigger>
                      </TabsList>
                      <TabsContent value="url" className="py-4 space-y-4">
                        <form onSubmit={handleConnectSheet} className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="sheetUrl">Google Sheet URL</Label>
                            <Input 
                              id="sheetUrl" 
                              placeholder="https://docs.google.com/spreadsheets/d/..." 
                              value={sheetUrl} 
                              onChange={e => setSheetUrl(e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="sheetTitle">Display Name (Optional)</Label>
                            <Input 
                              id="sheetTitle" 
                              placeholder="e.g. 2024 Admissions Data" 
                              value={sheetTitle} 
                              onChange={e => setSheetTitle(e.target.value)} 
                            />
                          </div>
                          <Button type="submit" disabled={loading} className="w-full">
                            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                            Connect Spreadsheet
                          </Button>
                        </form>
                      </TabsContent>
                      <TabsContent value="drive" className="py-4">
                        <DriveBrowser 
                          onSelect={handleDriveSelect}
                          onClose={() => setIsDriveOpen(false)}
                        />
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {connectedSheets.length === 0 ? (
                  <Empty className="border-dashed border-2 rounded-lg py-12">
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
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Display Name</TableHead>
                          <TableHead className="hidden md:table-cell">Spreadsheet ID</TableHead>
                          <TableHead>Added At</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {connectedSheets.map((sheet) => (
                          <TableRow key={sheet.spreadsheetId}>
                            <TableCell className="font-medium">{sheet.title}</TableCell>
                            <TableCell className="hidden md:table-cell font-mono text-xs text-muted-foreground">
                              {sheet.spreadsheetId}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              <div className="flex flex-col">
                                <span>{sheet.createdAt ? formatDistanceToNow(new Date(sheet.createdAt), { addSuffix: true }) : "-"}</span>
                                <span className="text-[10px] opacity-70">{sheet.createdAt ? format(new Date(sheet.createdAt), "MMM d, HH:mm") : ""}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
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
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will disconnect the spreadsheet "{sheet.title}" from the dashboard. 
                                        The data in Google Sheets will not be affected.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction 
                                        onClick={() => handleDeleteSheet(sheet.spreadsheetId)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 border-primary/10 hover:border-blue-500/30 bg-gradient-to-br from-card to-blue-50/10">
              <div className="absolute top-0 left-0 w-1 bg-blue-500 h-full group-hover:w-1.5 transition-all" />
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-blue-50 rounded-xl group-hover:scale-110 transition-transform duration-300">
                    <Cloud className="h-6 w-6 text-blue-600" />
                  </div>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200/50 animate-in fade-in zoom-in duration-500">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                </div>
                <CardTitle className="mt-4 text-xl">Google Drive</CardTitle>
                <CardDescription className="line-clamp-2">Directly browse and select spreadsheets from your Google Drive storage with secure OAuth2.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Service Account Active
                  </div>
                  <Button variant="outline" className="w-full group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all duration-300 shadow-sm">
                    Configure Integration
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden opacity-80 grayscale-[0.5] group hover:grayscale-0 hover:opacity-100 hover:shadow-xl transition-all duration-500 border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-purple-50 transition-colors duration-300">
                    <Slack className="h-6 w-6 text-slate-600 group-hover:text-purple-600" />
                  </div>
                  <Badge variant="outline" className="bg-amber-50/50 text-amber-700 border-amber-200/50">
                    Coming Soon
                  </Badge>
                </div>
                <CardTitle className="mt-4 text-xl">Slack Integration</CardTitle>
                <CardDescription className="line-clamp-2">Receive real-time notifications for data changes and system alerts in your Slack channels.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                    In Development
                  </div>
                  <Button variant="ghost" disabled className="w-full bg-muted/30">
                    Notify Me
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden opacity-80 grayscale-[0.5] group hover:grayscale-0 hover:opacity-100 hover:shadow-xl transition-all duration-500 border-dashed">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-slate-100 rounded-xl group-hover:bg-blue-50 transition-colors duration-300">
                    <Database className="h-6 w-6 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <Badge variant="outline" className="bg-amber-50/50 text-amber-700 border-amber-200/50">
                    Coming Soon
                  </Badge>
                </div>
                <CardTitle className="mt-4 text-xl">Microsoft OneDrive</CardTitle>
                <CardDescription className="line-clamp-2">Sync data with Excel spreadsheets stored in your OneDrive or SharePoint folders.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                    Planned Feature
                  </div>
                  <Button variant="ghost" disabled className="w-full bg-muted/30">
                    View Roadmap
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
