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
  MessageSquare,
  CheckCircle2
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
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
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean | null>(null)

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

  const handleConnectSheet = async (e?: React.FormEvent, customData?: { url: string, title: string }) => {
    if (e) e.preventDefault()
    setLoading(true)
    
    const urlToUse = customData?.url || sheetUrl
    const titleToUse = customData?.title || sheetTitle

    const promise = async () => {
      const res = await fetch("/api/connected-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlToUse, title: titleToUse }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to connect sheet")
      
      setSheetUrl("")
      setSheetTitle("")
      setConnectedSheets(prev => [...prev, data.newSheet])
      window.dispatchEvent(new Event("sheet_connected"))
      setIsDriveOpen(false)
      return data
    }

    toast.promise(promise(), {
      loading: "Connecting spreadsheet to sync engine...",
      success: (data) => `Successfully linked "${data.newSheet.title}"`,
      error: (err) => err.message || "Failed to connect spreadsheet",
      finally: () => setLoading(false)
    })
  }

  const handleDeleteSheet = async (spreadsheetId: string) => {
    const promise = async () => {
      const res = await fetch("/api/connected-sheets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      })
      if (!res.ok) throw new Error("Failed to remove sheet")
      setConnectedSheets(prev => prev.filter(s => s.spreadsheetId !== spreadsheetId))
      window.dispatchEvent(new Event("sheet_connected"))
    }

    toast.promise(promise(), {
      loading: "Removing spreadsheet connection...",
      success: "Spreadsheet disconnected successfully",
      error: "Could not remove spreadsheet link",
    })
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

      {isGoogleConnected === false && (
        <Alert variant="destructive" className="bg-destructive/5 border-destructive/20 rounded-2xl p-6">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg font-bold">Google Connection Required</AlertTitle>
          <AlertDescription className="text-sm mt-1">
            The account isn't connected to Google. Kindly connect and then you can choose the sheet.
          </AlertDescription>
        </Alert>
      )}

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
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      toast.promise(fetchSheets(), {
                        loading: "Refreshing connections...",
                        success: "Connection list updated.",
                        error: "Failed to refresh connections.",
                      })
                    }}
                    disabled={loading || isInitialLoading}
                    className="h-9 gap-2"
                  >
                    <Loader2
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </Button>
                  <Dialog open={isDriveOpen} onOpenChange={setIsDriveOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 gap-2">
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Add Sheet</span>
                        <span className="sm:hidden">Add</span>
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
              </div>
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
                                <span className="text-[10px] opacity-70">{sheet.createdAt ? format(new Date(sheet.createdAt), "MMM d, yyyy HH:mm") : ""}</span>
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

        <TabsContent value="integrations" className="animate-in fade-in slide-in-from-bottom-4 duration-700 focus-visible:outline-none">
          <div className="relative mb-12 p-10 rounded-[2.5rem] overflow-hidden border border-primary/10 bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10 shadow-2xl shadow-primary/5">
            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-primary/15 rounded-full blur-[120px] -mr-64 -mt-64 animate-pulse duration-[10s]" />
            <div className="absolute bottom-0 left-0 w-[30rem] h-[30rem] bg-blue-500/10 rounded-full blur-[100px] -ml-48 -mb-48 animate-pulse duration-[8s]" />
            <div className="relative z-10">
              <Badge className="mb-6 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.25em] shadow-sm backdrop-blur-md">Partner Ecosystem</Badge>
              <h2 className="text-5xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/50 sm:text-7xl leading-tight">Native<br />Integrations</h2>
              <p className="text-muted-foreground mt-6 font-medium text-xl max-w-2xl leading-relaxed opacity-80">Extend your dashboard capabilities by connecting with enterprise platforms and cloud services through our high-performance sync engines.</p>
              
              <div className="mt-10 flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50 backdrop-blur-xl text-xs font-bold tracking-wide">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  OAuth2 Secure
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50 backdrop-blur-xl text-xs font-bold tracking-wide">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Real-time Sync
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/50 border border-border/50 backdrop-blur-xl text-xs font-bold tracking-wide">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Bank-grade Privacy
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 pb-16">
            {/* Google Drive Integration */}
            <Card className="relative overflow-hidden group hover:shadow-[0_30px_70px_rgba(59,130,246,0.25)] transition-all duration-700 border-primary/10 hover:border-blue-500/50 bg-card/60 backdrop-blur-2xl rounded-[2rem]">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600 opacity-20 group-hover:opacity-100 transition-opacity duration-1000" />
              
              <CardHeader className="pb-6 relative z-10 p-8">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <div className="absolute -inset-6 bg-blue-500/30 rounded-full blur-3xl group-hover:bg-blue-500/50 transition-colors duration-700 opacity-50" />
                    <div className="relative p-5 bg-white/10 dark:bg-blue-900/30 rounded-2xl border border-blue-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-xl backdrop-blur-xl">
                      <Cloud className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-500/30 px-4 py-2 flex items-center gap-2.5 transition-all duration-500 shadow-md backdrop-blur-md rounded-full">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                      <span className="font-black tracking-tighter text-[11px] uppercase">Active & Connected</span>
                    </Badge>
                  </div>
                </div>
                <CardTitle className="mt-10 text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/60 leading-none">Google Drive</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-4 text-muted-foreground/90 font-medium line-clamp-3">
                  Securely browse and link spreadsheets from your Drive using enterprise-grade OAuth2 synchronization and automated health monitoring.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0 relative z-10 p-8 pt-2">
                <div className="space-y-8">
                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center gap-4 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10 backdrop-blur-md group-hover:bg-blue-500/15 transition-all duration-500 group/item">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 group-hover/item:scale-110 transition-transform duration-500">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-foreground/50 tracking-[0.2em] uppercase leading-none mb-1">Service Status</span>
                        <span className="text-sm font-bold text-foreground/90">Auth Engine Online</span>
                      </div>
                    </div>
                  </div>
                  
                  <Button className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white transition-all duration-500 shadow-2xl shadow-blue-600/30 group/btn rounded-2xl font-black text-[13px] uppercase tracking-wider border-t border-blue-400/30 overflow-hidden relative active:scale-95">
                    <span className="relative z-10 flex items-center justify-center gap-3">
                      Manage Sync Engine
                      <Settings2 className="h-5 w-5 transition-all duration-700 group-hover/btn:rotate-180" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[1.5s] ease-in-out" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Slack Integration */}
            <Card className="relative overflow-hidden group hover:shadow-[0_30px_70px_rgba(168,85,247,0.2)] transition-all duration-700 border-primary/10 hover:border-purple-500/40 bg-card/50 backdrop-blur-2xl rounded-[2rem]">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-600 via-pink-400 to-purple-600 opacity-10 group-hover:opacity-100 transition-opacity duration-1000" />
              
              <CardHeader className="pb-6 relative z-10 p-8">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <div className="absolute -inset-6 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/40 transition-colors duration-700 opacity-30" />
                    <div className="relative p-5 bg-white/10 rounded-2xl border border-border/40 group-hover:border-purple-500/40 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-700 shadow-xl backdrop-blur-xl">
                      <MessageSquare className="h-10 w-10 text-slate-400 group-hover:text-purple-500 transition-colors duration-500" />
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 px-5 py-2 font-black text-[11px] uppercase tracking-[0.25em] shadow-md flex items-center gap-2.5 backdrop-blur-md rounded-full">
                    <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                    Beta Access
                  </Badge>
                </div>
                <CardTitle className="mt-10 text-3xl font-black tracking-tight text-muted-foreground/80 group-hover:text-foreground transition-colors duration-500 leading-none">Slack Alerts</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-4 font-medium text-muted-foreground/70 line-clamp-3">
                  Automated channel notifications for record updates, threshold alerts, and real-time audit event streaming.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0 relative z-10 p-8 pt-2">
                <div className="space-y-8">
                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-purple-500/[0.03] border border-dashed border-purple-500/30 group-hover:bg-purple-500/[0.08] group-hover:border-purple-500/50 transition-all duration-500">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10">
                      <div className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-purple-500/60 tracking-[0.2em] uppercase leading-none mb-1">Project Milestone</span>
                      <span className="text-sm font-bold text-purple-600/80">In Development</span>
                    </div>
                  </div>
                  <Button variant="outline" disabled className="w-full h-14 rounded-2xl bg-muted/30 border-border/40 cursor-not-allowed opacity-60 font-black text-[13px] uppercase tracking-wider transition-all duration-500 group-hover:bg-purple-500/10 border-t-2 border-t-white/10">
                    Notify on Release
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* OneDrive Integration */}
            <Card className="relative overflow-hidden group hover:shadow-[0_30px_70px_rgba(14,165,233,0.2)] transition-all duration-700 border-primary/10 hover:border-sky-500/40 bg-card/50 backdrop-blur-2xl rounded-[2rem]">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-sky-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-600 via-cyan-400 to-sky-600 opacity-10 group-hover:opacity-100 transition-opacity duration-1000" />
              
              <CardHeader className="pb-6 relative z-10 p-8">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <div className="absolute -inset-6 bg-sky-500/20 rounded-full blur-3xl group-hover:bg-sky-500/40 transition-colors duration-700 opacity-30" />
                    <div className="relative p-5 bg-white/10 rounded-2xl border border-border/40 group-hover:border-sky-500/40 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-xl backdrop-blur-xl">
                      <Database className="h-10 w-10 text-slate-400 group-hover:text-sky-500 transition-colors duration-500" />
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30 px-5 py-2 font-black text-[11px] uppercase tracking-[0.25em] shadow-md backdrop-blur-md rounded-full">
                    Q4 Roadmap
                  </Badge>
                </div>
                <CardTitle className="mt-10 text-3xl font-black tracking-tight text-muted-foreground/80 group-hover:text-foreground transition-colors duration-500 leading-none">MS OneDrive</CardTitle>
                <CardDescription className="text-sm leading-relaxed mt-4 font-medium text-muted-foreground/70 line-clamp-3">
                  Full two-way synchronization for Excel Workbooks stored in Microsoft 365 and SharePoint environments.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="pt-0 relative z-10 p-8 pt-2">
                <div className="space-y-8">
                  <div className="flex items-center gap-4 p-5 rounded-2xl bg-sky-500/[0.03] border border-dashed border-sky-500/30 group-hover:bg-sky-500/[0.08] group-hover:border-sky-500/50 transition-all duration-500">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10">
                      <div className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-sky-500/60 tracking-[0.2em] uppercase leading-none mb-1">Architecture</span>
                      <span className="text-sm font-bold text-sky-600/80">Planning Phase</span>
                    </div>
                  </div>
                  <Button variant="outline" disabled className="w-full h-14 rounded-2xl bg-muted/30 border-border/40 cursor-not-allowed opacity-60 font-black text-[13px] uppercase tracking-wider transition-all duration-500 group-hover:bg-sky-500/10 border-t-2 border-t-white/10">
                    Request Integration
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
