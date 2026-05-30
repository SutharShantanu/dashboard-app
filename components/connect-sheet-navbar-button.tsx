"use client"

import React, { useState } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { Plus, X, Link as LinkIcon, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DriveBrowser } from "@/components/drive-browser"
import { Progress } from "@/components/ui/progress"
import { Spinner } from "./ui/spinner"

// Form libraries
import { z } from "zod"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
  FieldSet,
} from "@/components/ui/field"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "./ui/card"
import { GoogleDriveIcon } from "./icons/google-drive"

// Zod Validation Schema
const connectSheetSchema = z.object({
  url: z
    .string()
    .min(1, "Google Sheet URL is required")
    .url("Please enter a valid Google Sheet URL"),
  title: z.string().optional(),
})

type FormValues = z.infer<typeof connectSheetSchema>

export function ConnectSheetNavbarButton({ isAdmin }: { isAdmin: boolean }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const { update: updateSession } = useSession()

  const isOpen = searchParams?.get("addSheet") === "open"
  const activeTab = searchParams?.get("addSheetTab") || "url"

  const [isConnecting, setIsConnecting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // React Hook Form
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(connectSheetSchema),
    defaultValues: {
      url: "",
      title: "",
    },
    mode: "onTouched",
  })

  const setIsOpen = React.useCallback(
    (open: boolean) => {
      const params = new URLSearchParams(window.location.search)
      if (open) {
        params.set("addSheet", "open")
        if (!params.get("addSheetTab")) {
          params.set("addSheetTab", "url")
        }
        router.push(`${window.location.pathname}?${params.toString()}`, {
          scroll: false,
        })
      } else {
        params.delete("addSheet")
        params.delete("addSheetTab")
        router.push(`${window.location.pathname}?${params.toString()}`, {
          scroll: false,
        })
        reset()
        setSubmitError(null)
      }
    },
    [router, reset]
  )

  React.useEffect(() => {
    let interval: NodeJS.Timeout
    if (isConnecting) {
      setProgress(10)
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev
          return prev + 5
        })
      }, 300)
    } else {
      setProgress(0)
    }
    return () => clearInterval(interval)
  }, [isConnecting])

  React.useEffect(() => {
    const handleOpen = () => setIsOpen(true)
    window.addEventListener("open_connect_sheet_dialog", handleOpen)
    return () =>
      window.removeEventListener("open_connect_sheet_dialog", handleOpen)
  }, [setIsOpen])

  if (!isAdmin) return null

  // Connection implementation returning a Promise for toast.promise
  const connectSheetPromise = async (url: string, title: string) => {
    setSubmitError(null)
    setIsConnecting(true)
    try {
      const res = await fetch("/api/connected-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Failed to connect Google Sheet")
      }
      return data
    } catch (err: any) {
      const errMsg = err.message || "Failed to connect Google Sheet"
      setSubmitError(errMsg)
      throw err
    } finally {
      setIsConnecting(false)
    }
  }

  // Submission handler for URL form
  const onSubmit = async (values: FormValues) => {
    const promise = connectSheetPromise(values.url, values.title || "")
    toast.promise(promise, {
      loading: "Syncing data to Database...",
      success: (data: any) => {
        reset()
        setIsOpen(false)
        // Refresh the session so perSheetPermissions is updated in the JWT
        updateSession()
        // Dispatch event so sidebar instantly updates
        window.dispatchEvent(new Event("sheet_connected"))
        return `Google Sheet "${data.newSheet?.title || values.title || "Untitled"}" connected successfully!`
      },
      error: (err: any) => {
        return err.message || "Failed to connect Google Sheet"
      },
    })
  }

  // Drive selection handler
  const handleDriveSelect = (file: any) => {
    const url = `https://docs.google.com/spreadsheets/d/${file.id}/edit`
    const promise = connectSheetPromise(url, file.name)
    toast.promise(promise, {
      loading: "Syncing data to Database...",
      success: (data: any) => {
        setIsOpen(false)
        // Refresh the session so perSheetPermissions is updated in the JWT
        updateSession()
        window.dispatchEvent(new Event("sheet_connected"))
        return `Google Sheet "${data.newSheet?.title || file.name}" connected successfully!`
      },
      error: (err: any) => {
        return err.message || "Failed to connect Google Sheet"
      },
    })
  }

  return (
    <TooltipProvider delayDuration={0}>
      <Dialog open={isOpen} onOpenChange={setIsOpen} name="addSheet">
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
                <span className="sr-only">Connect Sheet</span>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs font-semibold">Connect Google Sheet</p>
          </TooltipContent>
        </Tooltip>

        <DialogContent className="flex max-h-[85vh] flex-col">
          <DialogHeader className="flex-none">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              Add New Spreadsheet
            </DialogTitle>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              const params = new URLSearchParams(window.location.search)
              params.set("addSheetTab", val)
              router.replace(
                `${window.location.pathname}?${params.toString()}`,
                { scroll: false }
              )
            }}
            className="m-2 flex flex-1 flex-col"
          >
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="url">
                <LinkIcon className="h-3.5 w-3.5" />
                Via URL
              </TabsTrigger>
              <TabsTrigger value="drive">
                <GoogleDriveIcon className="h-3.5 w-3.5" />
                Browse Drive
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url">
              <Card className="border shadow-none ring-0">
                <CardContent className="space-y-4">
                  <form
                    id="connect-sheet-form"
                    onSubmit={handleSubmit(onSubmit)}
                    className="space-y-4"
                    noValidate
                  >
                    {submitError && (
                      <Alert variant="destructive">
                        <AlertCircle className="size-4" />
                        <AlertTitle>Connection Failed</AlertTitle>
                        <AlertDescription>{submitError}</AlertDescription>
                      </Alert>
                    )}

                    <FieldSet>
                      <FieldGroup>
                        <Controller
                          control={control}
                          name="url"
                          render={({ field }) => (
                            <Field data-invalid={!!errors.url}>
                              <FieldLabel htmlFor="sheet-url">
                                Google Sheet URL
                              </FieldLabel>
                              <Input
                                {...field}
                                id="sheet-url"
                                placeholder="https://docs.google.com/spreadsheets/d/..."
                                disabled={isConnecting}
                              />
                              <FieldError errors={[errors.url]} />
                            </Field>
                          )}
                        />

                        <Controller
                          control={control}
                          name="title"
                          render={({ field }) => (
                            <Field data-invalid={!!errors.title}>
                              <FieldLabel htmlFor="sheet-title">
                                Title / Alias (Optional)
                              </FieldLabel>
                              <Input
                                {...field}
                                id="sheet-title"
                                placeholder="e.g., Department Roster"
                                disabled={isConnecting}
                              />
                              <FieldError errors={[errors.title]} />
                            </Field>
                          )}
                        />
                      </FieldGroup>
                    </FieldSet>

                    {isConnecting && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Syncing data to Database...</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drive">
              <DriveBrowser
                onSelect={handleDriveSelect}
                onClose={() => setIsOpen(false)}
                isConnecting={isConnecting}
                progress={progress}
                submitError={submitError}
              />
            </TabsContent>
          </Tabs>

          {activeTab === "url" && (
            <DialogFooter>
              <Button
                type="button"
                variant="destructive"
                onClick={() => setIsOpen(false)}
                disabled={isConnecting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="connect-sheet-form"
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Connect
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
