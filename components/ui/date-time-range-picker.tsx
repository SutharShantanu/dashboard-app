"use client"

import { useEffect, useId, useState } from "react"
import { format } from "date-fns"
import { type DateRange } from "react-day-picker"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CalendarIcon, ClockIcon, ChevronLeft, ChevronRight, X } from "lucide-react"

export interface DateTimeRangePickerProps {
  className?: string
  placeholder?: string
  showTime?: boolean // Defaults to false
}

export function DateTimeRangePicker({
  className,
  placeholder = "Pick date range...",
  showTime = false, // Pure Date Range Picker by default!
}: DateTimeRangePickerProps) {
  const id = useId()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("dates")

  // ─── 1. Lazy Initialization (Only once on mount) ─────────────────────────
  const [date, setDate] = useState<DateRange | undefined>(() => {
    if (!searchParams) return undefined
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    return from || to
      ? {
          from: from ? new Date(from) : undefined,
          to: to ? new Date(to) : undefined,
        }
      : undefined
  })

  const [startTime, setStartTime] = useState(() => (searchParams ? searchParams.get("startTime") || "09:00" : "09:00"))
  const [endTime, setEndTime] = useState(() => (searchParams ? searchParams.get("endTime") || "18:00" : "18:00"))

  // Hydrate local state if URL changes externally (but doesn't trigger write-back loops)
  useEffect(() => {
    if (!searchParams) return
    const from = searchParams.get("from")
    const to = searchParams.get("to")
    const start = searchParams.get("startTime")
    const end = searchParams.get("endTime")

    setDate(
      from || to
        ? {
            from: from ? new Date(from) : undefined,
            to: to ? new Date(to) : undefined,
          }
        : undefined
    )
    if (start) setStartTime(start)
    if (end) setEndTime(end)
  }, [searchParams])

  // Automatically switch tabs or auto-apply when selections complete
  const handleDateSelect = (selectedRange: DateRange | undefined) => {
    setDate(selectedRange)

    if (selectedRange?.from && selectedRange?.to) {
      if (showTime) {
        // Switch to the time tab so the user can configure time
        setActiveTab("times")
      } else {
        // Pure date-range mode: Auto-apply the filter after a short delay for transition
        const params = new URLSearchParams(searchParams?.toString() || "")
        params.set("from", selectedRange.from.toISOString())
        params.set("to", selectedRange.to.toISOString())
        params.delete("startTime")
        params.delete("endTime")

        setTimeout(() => {
          router.replace(`${pathname}?${params.toString()}`, { scroll: false })
          setOpen(false)
        }, 180)
      }
    }
  }

  // ─── 2. Handle Commit (Writes to URL on Apply) ───────────────────────────
  const handleApply = () => {
    const params = new URLSearchParams(searchParams?.toString() || "")

    if (date?.from) {
      params.set("from", date.from.toISOString())
    } else {
      params.delete("from")
    }

    if (date?.to) {
      params.set("to", date.to.toISOString())
    } else {
      params.delete("to")
    }

    if (showTime) {
      params.set("startTime", startTime)
      params.set("endTime", endTime)
    } else {
      params.delete("startTime")
      params.delete("endTime")
    }

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    })
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDate(undefined)
    setStartTime("09:00")
    setEndTime("18:00")

    const params = new URLSearchParams(searchParams?.toString() || "")
    params.delete("from")
    params.delete("to")
    params.delete("startTime")
    params.delete("endTime")

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    })
  }

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setActiveTab(date?.from && date?.to && showTime ? "times" : "dates")
    }
  }

  const isRangeCompleted = Boolean(date?.from && date?.to)

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "group/pick-date justify-between text-left font-normal border rounded-none hover:bg-accent/40 transition-colors",
            showTime ? "w-[350px]" : "w-[280px]",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/pick-date:text-foreground" />
            <span className={cn("truncate text-xs", !date && "text-muted-foreground")}>
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, yyyy")} – {format(date.to, "LLL dd, yyyy")}
                  </>
                ) : (
                  format(date.from, "LLL dd, yyyy")
                )
              ) : (
                placeholder
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5 ml-2 shrink-0">
            {date && showTime && (
              <span className="text-[10px] font-mono font-semibold text-muted-foreground uppercase bg-muted dark:bg-muted/50 px-1.5 py-0.5 rounded-sm select-none">
                {startTime} - {endTime}
              </span>
            )}
            {date ? (
              <button
                onClick={handleClear}
                className="p-0.5 rounded-full hover:bg-muted text-muted-foreground/80 hover:text-foreground transition-colors"
                title="Clear filter"
              >
                <X className="size-3" />
              </button>
            ) : (
              <ChevronRight className="size-3.5 opacity-40 group-aria-expanded:rotate-90 transition-transform duration-200" />
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-auto p-0 overflow-hidden shadow-xl border rounded-none bg-popover text-popover-foreground"
      >
        {showTime ? (
          // ─── PREMIUM TIME-INCLUDED MULTI-TAB VIEW ──────────────────────────
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Custom Tabs Header */}
            <div className="flex items-center justify-between border-b border-border/80 px-3 py-2 bg-muted/20 dark:bg-muted/10">
              <TabsList variant="line" className="h-7 bg-transparent border-0 gap-1 p-0">
                <TabsTrigger
                  value="dates"
                  className="text-xs px-3 py-1 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  1. Select Dates
                </TabsTrigger>
                <TabsTrigger
                  value="times"
                  disabled={!date?.from}
                  className="text-xs px-3 py-1 font-semibold rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
                >
                  2. Set Time
                </TabsTrigger>
              </TabsList>

              {date?.from && (
                <span className="text-[10px] text-muted-foreground font-semibold bg-accent/40 dark:bg-muted/40 px-2 py-0.5 select-none rounded-xs max-w-[150px] truncate">
                  {format(date.from, "MMM dd")}
                  {date.to ? ` – ${format(date.to, "MMM dd")}` : ""}
                </span>
              )}
            </div>

            {/* Date Picker Section */}
            <TabsContent value="dates" className="p-0 border-0 outline-none mt-0">
              <Calendar
                mode="range"
                selected={date}
                onSelect={handleDateSelect}
                numberOfMonths={2}
                className="p-3"
              />
            </TabsContent>

            {/* Time Picker Section */}
            <TabsContent value="times" className="p-4 w-[340px] border-0 outline-none mt-0">
              <div className="space-y-4">
                <div className="mb-2 select-none">
                  <h4 className="text-xs font-semibold text-foreground">Adjust range hours</h4>
                  <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                    Filters records between these times on the selected days.
                  </p>
                </div>

                <FieldGroup className="grid grid-cols-2 gap-3">
                  <Field className="gap-1">
                    <FieldLabel className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-wider">
                      Start Hour
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="text-xs h-9 cursor-pointer rounded-none border-input"
                      />
                      <InputGroupAddon className="rounded-none border-input">
                        <ClockIcon className="size-3.5 text-muted-foreground" />
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>

                  <Field className="gap-1">
                    <FieldLabel className="text-[10px] font-bold text-muted-foreground/90 uppercase tracking-wider">
                      End Hour
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="text-xs h-9 cursor-pointer rounded-none border-input"
                      />
                      <InputGroupAddon className="rounded-none border-input">
                        <ClockIcon className="size-3.5 text-muted-foreground" />
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                </FieldGroup>

                <Separator className="bg-border/60" />

                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setActiveTab("dates")}
                    className="text-xs font-medium hover:bg-accent/40 rounded-none text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="size-3.5 mr-0.5" />
                    Back
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApply}
                    className="text-xs rounded-none font-semibold px-4"
                    disabled={!isRangeCompleted}
                  >
                    Apply Filter
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          // ─── PURE DATE RANGE CALENDAR VIEW ─────────────────────────────────
          <div className="flex flex-col">
            <Calendar
              mode="range"
              selected={date}
              onSelect={handleDateSelect}
              numberOfMonths={2}
              className="p-3"
            />
            <div className="flex items-center justify-between border-t border-border/80 px-4 py-2.5 bg-muted/10">
              <span className="text-[10px] text-muted-foreground select-none">
                {date?.from && date?.to ? "Range complete" : "Choose start & end dates"}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setOpen(false)}
                  className="text-xs font-medium rounded-none text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  size="xs"
                  onClick={handleApply}
                  className="text-xs font-semibold px-3 rounded-none"
                  disabled={!isRangeCompleted}
                >
                  Apply Range
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
