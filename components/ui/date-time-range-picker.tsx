/**
 * date-range-time-picker.tsx
 *
 * Three reusable variants for picking a full date-time range
 * (year → date range → start/end time):
 *
 *  • DateRangeTimePicker          — Tabbed popover, dual-month calendar + year strip (flagship)
 *  • DateRangeTimePickerCompact   — Single-panel popover, single-month + year-overlay navigation
 *  • DateRangeTimePickerInline    — No popover, always-visible inline block for forms / drawers
 *
 * All three share:
 *  – DateTimeRangeValue type  (from / to / startTime / endTime)
 *  – Controlled + uncontrolled modes via value / onChange
 *  – onApply callback for committing (URL push, API calls, etc.)
 *  – yearRange prop to constrain navigation
 *  – showTime prop to toggle the time section on/off
 */

"use client"

import {
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import {
  eachMonthOfInterval,
  eachYearOfInterval,
  endOfYear,
  format,
  isAfter,
  isBefore,
  startOfYear,
} from "date-fns"
import type { DateRange } from "react-day-picker"
import {
  CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

// ─────────────────────────────────────────────────────────────────────────────
// Public Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DateTimeRangeValue {
  /** Range start date (undefined = not selected) */
  from: Date | undefined
  /** Range end date (undefined = not selected) */
  to: Date | undefined
  /** Start-of-day time as "HH:MM" (24-hour) */
  startTime: string
  /** End-of-day time as "HH:MM" (24-hour) */
  endTime: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Private Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_RANGE: DateTimeRangeValue = {
  from: undefined,
  to: undefined,
  startTime: "09:00",
  endTime: "18:00",
}

function makeYearNumbers(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

function makeYearDates(start: number, end: number): Date[] {
  return eachYearOfInterval({
    start: startOfYear(new Date(start, 0)),
    end: endOfYear(new Date(end, 0)),
  })
}

function makeMonthDates(year: number): Date[] {
  return eachMonthOfInterval({
    start: startOfYear(new Date(year, 0)),
    end: endOfYear(new Date(year, 0)),
  })
}

function formatRange(from: Date | undefined, to: Date | undefined): string {
  if (!from) return ""
  if (!to) return format(from, "LLL dd, yyyy")
  return `${format(from, "LLL dd, yyyy")} – ${format(to, "LLL dd, yyyy")}`
}

/** useValue — uncontrolled/controlled state bridge */
function useValue(
  external: DateTimeRangeValue | undefined,
  onChange: ((v: DateTimeRangeValue) => void) | undefined
) {
  const [internal, setInternal] = useState<DateTimeRangeValue>(
    external ?? DEFAULT_RANGE
  )
  const current = external !== undefined ? external : internal
  const push = (next: DateTimeRangeValue) => {
    setInternal(next)
    onChange?.(next)
  }
  return { current, push }
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared Sub-Components  (not exported — only used internally)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * YearStrip — horizontal scrollable row of year buttons.
 * Clicking a year calls onYearSelect; the active year scrolls into view.
 */
function YearStrip({
  years,
  currentYear,
  onYearSelect,
  className,
}: {
  years: number[]
  currentYear: number
  onYearSelect: (year: number) => void
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current?.querySelector("[data-active=true]") as HTMLElement | null
    el?.scrollIntoView({ inline: "center", behavior: "smooth" })
  }, [currentYear])

  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {years.map((y) => (
        <Button
          key={y}
          size="xs"
          variant={y === currentYear ? "default" : "ghost"}
          data-active={y === currentYear}
          className="h-6 min-w-[3.25rem] shrink-0 rounded-none px-2 text-[11px] font-semibold"
          onClick={() => onYearSelect(y)}
        >
          {y}
        </Button>
      ))}
    </div>
  )
}

/**
 * TimeRangeSection — labeled start + end time inputs.
 */
function TimeRangeSection({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: {
  startTime: string
  endTime: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="select-none">
        <p className="text-xs font-semibold text-foreground">Time Range</p>
        <p className="mt-0.5 text-[10px] text-muted-foreground/80">
          Records between these hours on each selected day.
        </p>
      </div>
      <FieldGroup className="grid grid-cols-2 gap-3">
        <Field className="gap-1">
          <FieldLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90">
            Start Time
          </FieldLabel>
          <InputGroup>
            <InputGroupAddon className="rounded-none border-input">
              <Clock className="size-3.5 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              type="time"
              value={startTime}
              onChange={(e) => onStartChange(e.target.value)}
              className="h-9 cursor-pointer rounded-none border-input text-xs appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </InputGroup>
        </Field>
        <Field className="gap-1">
          <FieldLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90">
            End Time
          </FieldLabel>
          <InputGroup>
            <InputGroupAddon className="rounded-none border-input">
              <Clock className="size-3.5 text-muted-foreground" />
            </InputGroupAddon>
            <InputGroupInput
              type="time"
              value={endTime}
              onChange={(e) => onEndChange(e.target.value)}
              className="h-9 cursor-pointer rounded-none border-input text-xs appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
            />
          </InputGroup>
        </Field>
      </FieldGroup>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Year-Overlay Components  (only used by Variant 2 — Compact)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A replacement for react-day-picker's CaptionLabel that acts as a toggle
 * button, revealing the year/month overlay grid when clicked.
 */
function YearOverlayCaptionLabel({
  children,
  isYearView,
  onToggle,
}: {
  children?: ReactNode
  isYearView: boolean
  onToggle: () => void
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      data-state={isYearView ? "open" : "closed"}
      onClick={onToggle}
      className="-ms-2 flex items-center gap-1.5 text-sm font-semibold hover:bg-transparent
                 [&[data-state=open]>svg]:rotate-180"
    >
      {children}
      <ChevronDown
        aria-hidden="true"
        className="size-3.5 shrink-0 text-muted-foreground/80 transition-transform duration-200"
      />
    </Button>
  )
}

/**
 * A replacement for react-day-picker's MonthGrid that renders the normal
 * calendar table PLUS an absolute overlay panel for year → month navigation.
 */
function YearOverlayMonthGrid({
  className,
  children,
  isYearView,
  years,
  currentYear,
  currentMonth,
  onMonthSelect,
  selectedYear,
  setSelectedYear,
  startDate,
  endDate,
}: {
  className?: string
  children?: ReactNode
  isYearView: boolean
  startDate: Date
  endDate: Date
  years: Date[]
  currentYear: number
  currentMonth: number
  onMonthSelect: (date: Date) => void
  selectedYear: number | null
  setSelectedYear: Dispatch<SetStateAction<number | null>>
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Auto-scroll the active year into view whenever the overlay opens
  useEffect(() => {
    if (isYearView && ref.current) {
      const el = ref.current.querySelector("[data-active=true]") as HTMLElement | null
      el?.scrollIntoView({ block: "center" })
    }
  }, [isYearView, selectedYear])

  return (
    <div className="relative">
      {/* Normal calendar grid — always rendered so layout stays stable */}
      <table className={className}>{children}</table>

      {/* Year / month overlay */}
      {isYearView && (
        <div className="absolute inset-0 z-20 -m-2 bg-background">
          <div ref={ref} className="h-full">
            <ScrollArea className="h-full">
              <div className="px-3 pb-3 pt-1">
                {selectedYear === null ? (
                  /* ── Year grid ── */
                  <div className="grid grid-cols-4 gap-2">
                    {years.map((year) => {
                      const y = year.getFullYear()
                      const isActive = y === currentYear
                      return (
                        <Button
                          key={y}
                          variant={isActive ? "default" : "outline"}
                          size="sm"
                          className="h-8 rounded-none text-xs"
                          data-active={isActive}
                          onClick={() => setSelectedYear(y)}
                        >
                          {y}
                        </Button>
                      )
                    })}
                  </div>
                ) : (
                  /* ── Month grid for selected year ── */
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start rounded-none px-2 text-xs"
                      onClick={() => setSelectedYear(null)}
                    >
                      <ChevronLeft className="mr-1 size-3.5" />
                      {selectedYear}
                    </Button>
                    <div className="grid grid-cols-3 gap-2">
                      {makeMonthDates(selectedYear).map((month) => {
                        const isActive =
                          month.getMonth() === currentMonth &&
                          selectedYear === currentYear
                        const isDisabled =
                          isBefore(month, startDate) || isAfter(month, endDate)
                        return (
                          <Button
                            key={month.getTime()}
                            variant={isActive ? "default" : "outline"}
                            size="sm"
                            className="h-8 rounded-none text-xs"
                            data-active={isActive}
                            disabled={isDisabled}
                            onClick={() => onMonthSelect(month)}
                          >
                            {format(month, "MMM")}
                          </Button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ┌──────────────────────────────────────────────────────────────────────────┐
// │  VARIANT 1 — DateRangeTimePicker                                         │
// │  Full-featured tabbed popover with dual-month calendar + year strip       │
// └──────────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────

export interface DateRangeTimePickerProps {
  /** Controlled value — omit for uncontrolled mode */
  value?: DateTimeRangeValue
  /** Fires on every change (date selection, time edit) */
  onChange?: (value: DateTimeRangeValue) => void
  /** Fires when user clicks Apply — ideal for URL/API commits */
  onApply?: (value: DateTimeRangeValue) => void
  placeholder?: string
  className?: string
  /** Show the time step (Tab 2). Default: true */
  showTime?: boolean
  /** Year range shown in the strip. Default: current year ±5 */
  yearRange?: { start: number; end: number }
}

/**
 * ### Variant 1 — DateRangeTimePicker
 *
 * **Best for:** filter bars, report headers, data table toolbars.
 *
 * **Features:**
 * - Popover trigger button showing selected range + times inline
 * - Clear (×) button when a range is active
 * - Scrollable year strip to jump year quickly
 * - Dual-month calendar for easy range selection
 * - Tab 2 unlocked once both dates are picked — start/end time inputs
 * - Controlled (`value` + `onChange`) or uncontrolled
 *
 * **Usage:**
 * ```tsx
 * <DateRangeTimePicker
 *   showTime
 *   onApply={(v) => console.log(v)}
 * />
 * ```
 */
export function DateRangeTimePicker({
  value,
  onChange,
  onApply,
  placeholder = "Select date range…",
  className,
  showTime = true,
  yearRange,
}: DateRangeTimePickerProps) {
  const id = useId()
  const today = new Date()
  const thisYear = today.getFullYear()
  const yr = yearRange ?? { start: thisYear - 5, end: thisYear + 5 }

  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("dates")
  const [month, setMonth] = useState(today)

  const { current, push } = useValue(value, onChange)
  const isComplete = Boolean(current.from && current.to)
  const years = makeYearNumbers(yr.start, yr.end)

  const handleDateSelect = (range: DateRange | undefined) => {
    push({ ...current, from: range?.from, to: range?.to })
    if (range?.from && range?.to && showTime) setActiveTab("times")
  }

  const handleApply = () => {
    onApply?.(current)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    push({ ...DEFAULT_RANGE })
    setActiveTab("dates")
  }

  const handleOpenChange = (o: boolean) => {
    setOpen(o)
    if (o) setActiveTab(isComplete && showTime ? "times" : "dates")
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "group/dtp justify-between text-left font-normal",
            "rounded-none border hover:bg-accent/40 transition-colors",
            showTime ? "w-[440px]" : "w-[280px]",
            className
          )}
        >
          {/* ── Left: range label + time badge ── */}
          <div className="flex min-w-0 items-center gap-2 truncate">
            <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/dtp:text-foreground" />
            <span
              className={cn(
                "truncate text-xs",
                !current.from && "text-muted-foreground"
              )}
            >
              {current.from ? formatRange(current.from, current.to) : placeholder}
            </span>
            {isComplete && showTime && (
              <span className="shrink-0 select-none rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground dark:bg-muted/60">
                {current.startTime} – {current.endTime}
              </span>
            )}
          </div>

          {/* ── Right: clear or open chevron ── */}
          <div className="ml-2 flex shrink-0 items-center gap-1">
            {isComplete ? (
              <button
                onClick={handleClear}
                aria-label="Clear date range"
                className="rounded-full p-0.5 text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            ) : (
              <ChevronRight className="size-3.5 opacity-40 transition-transform group-aria-expanded:rotate-90" />
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-auto overflow-hidden rounded-none border p-0 shadow-xl"
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>

          {/* ── Tab Header ── */}
          <div className="flex items-center justify-between border-b bg-muted/20 px-3 py-2">
            <TabsList variant="line" className="h-7 gap-1 border-0 bg-transparent p-0">
              <TabsTrigger
                value="dates"
                className="rounded-none border-b-2 border-transparent px-3 py-1 text-xs font-semibold data-[state=active]:border-primary"
              >
                1 · Range
              </TabsTrigger>
              {showTime && (
                <TabsTrigger
                  value="times"
                  disabled={!current.from}
                  className="rounded-none border-b-2 border-transparent px-3 py-1 text-xs font-semibold data-[state=active]:border-primary"
                >
                  2 · Time
                </TabsTrigger>
              )}
            </TabsList>

            {/* Mini summary badge */}
            {current.from && (
              <span className="max-w-[200px] select-none truncate rounded-sm bg-accent/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:bg-muted/40">
                {format(current.from, "MMM dd, yy")}
                {current.to ? ` – ${format(current.to, "MMM dd, yy")}` : ""}
              </span>
            )}
          </div>

          {/* ── Tab 1: Date Range ── */}
          <TabsContent value="dates" className="mt-0 border-0 p-0 outline-none">

            {/* Year strip */}
            <div className="border-b bg-muted/10 px-3 py-2">
              <p className="mb-1.5 select-none text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Jump to year
              </p>
              <YearStrip
                years={years}
                currentYear={month.getFullYear()}
                onYearSelect={(y) => setMonth(new Date(y, month.getMonth()))}
              />
            </div>

            {/* Dual-month calendar */}
            <Calendar
              mode="range"
              selected={{ from: current.from, to: current.to }}
              onSelect={handleDateSelect}
              month={month}
              onMonthChange={setMonth}
              numberOfMonths={2}
              startMonth={startOfYear(new Date(yr.start, 0))}
              endMonth={endOfYear(new Date(yr.end, 0))}
              className="p-3"
            />

            {/* Footer — only shown when showTime is false */}
            {!showTime && (
              <div className="flex items-center justify-between border-t bg-muted/10 px-4 py-2.5">
                <span className="select-none text-[10px] text-muted-foreground">
                  {isComplete ? "Range complete" : "Pick start & end dates"}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setOpen(false)}
                    className="rounded-none text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    onClick={handleApply}
                    disabled={!isComplete}
                    className="rounded-none px-3 text-xs font-semibold"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Tab 2: Time ── */}
          {showTime && (
            <TabsContent
              value="times"
              className="mt-0 w-[340px] border-0 p-4 outline-none"
            >
              <TimeRangeSection
                startTime={current.startTime}
                endTime={current.endTime}
                onStartChange={(v) => push({ ...current, startTime: v })}
                onEndChange={(v) => push({ ...current, endTime: v })}
              />
              <Separator className="my-4 bg-border/60" />
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setActiveTab("dates")}
                  className="rounded-none text-xs text-muted-foreground hover:text-foreground"
                >
                  <ChevronLeft className="mr-0.5 size-3.5" />
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  disabled={!isComplete}
                  className="rounded-none px-4 text-xs font-semibold"
                >
                  Apply Filter
                </Button>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ┌──────────────────────────────────────────────────────────────────────────┐
// │  VARIANT 2 — DateRangeTimePickerCompact                                  │
// │  Single-panel popover, single-month, year-overlay navigation             │
// └──────────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────

export interface DateRangeTimePickerCompactProps {
  value?: DateTimeRangeValue
  onChange?: (value: DateTimeRangeValue) => void
  onApply?: (value: DateTimeRangeValue) => void
  placeholder?: string
  className?: string
  /** Show the time inputs below the calendar. Default: true */
  showTime?: boolean
  /** Year range available in the overlay. Default: current year -8 / +2 */
  yearRange?: { start: number; end: number }
}

/**
 * ### Variant 2 — DateRangeTimePickerCompact
 *
 * **Best for:** sidebars, dense toolbars, narrow filter panels.
 *
 * **Features:**
 * - Compact trigger (240px) with a monospaced time badge
 * - Clicking the "Month YYYY ▾" caption in the calendar header reveals:
 *   1. A **year grid** (click to select)
 *   2. A **month grid** for that year (click to navigate)
 * - Single-month range calendar (space-efficient)
 * - Time inputs inline below the calendar
 * - Manual Apply button in the footer
 *
 * **Usage:**
 * ```tsx
 * <DateRangeTimePickerCompact
 *   placeholder="Filter by date…"
 *   onApply={(v) => applyFilter(v)}
 * />
 * ```
 */
export function DateRangeTimePickerCompact({
  value,
  onChange,
  onApply,
  placeholder = "Filter by date…",
  className,
  showTime = true,
  yearRange,
}: DateRangeTimePickerCompactProps) {
  const id = useId()
  const today = new Date()
  const thisYear = today.getFullYear()
  const yr = yearRange ?? { start: thisYear - 8, end: thisYear + 2 }

  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState(today)
  const [isYearView, setIsYearView] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)

  const { current, push } = useValue(value, onChange)
  const isComplete = Boolean(current.from && current.to)

  const startDate = startOfYear(new Date(yr.start, 0))
  const endDate = endOfYear(new Date(yr.end, 0))
  const yearDates = makeYearDates(yr.start, yr.end)

  const handleApply = () => {
    onApply?.(current)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    push({ ...DEFAULT_RANGE })
  }

  const handleOpenChange = (o: boolean) => {
    setOpen(o)
    if (!o) {
      setIsYearView(false)
      setSelectedYear(null)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "group/dtp w-[240px] justify-between text-left font-normal",
            "rounded-none border hover:bg-accent/40 transition-colors",
            className
          )}
        >
          {/* Label */}
          <div className="flex min-w-0 items-center gap-2 truncate">
            <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover/dtp:text-foreground" />
            <span
              className={cn(
                "truncate text-xs",
                !current.from && "text-muted-foreground"
              )}
            >
              {current.from ? formatRange(current.from, current.to) : placeholder}
            </span>
          </div>

          {/* Right side: time badge + clear/chevron */}
          <div className="ml-2 flex shrink-0 items-center gap-1">
            {isComplete && showTime && (
              <span className="select-none rounded-sm bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground dark:bg-muted/60">
                {current.startTime}–{current.endTime}
              </span>
            )}
            {isComplete ? (
              <button
                onClick={handleClear}
                aria-label="Clear"
                className="rounded-full p-0.5 text-muted-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            ) : (
              <ChevronDown className="size-3.5 opacity-40" />
            )}
          </div>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[290px] overflow-hidden rounded-none border p-0 shadow-xl"
      >
        {/* Single-month calendar with year-overlay components */}
        <Calendar
          mode="range"
          selected={{ from: current.from, to: current.to }}
          onSelect={(range) =>
            push({ ...current, from: range?.from, to: range?.to })
          }
          month={month}
          onMonthChange={setMonth}
          numberOfMonths={1}
          startMonth={startDate}
          endMonth={endDate}
          className="p-3"
          components={{
            // Override caption label to toggle the year overlay
            CaptionLabel: ({
              children,
            }: {
              children?: ReactNode
            }) => (
              <YearOverlayCaptionLabel
                isYearView={isYearView}
                onToggle={() => {
                  setIsYearView((v) => !v)
                  setSelectedYear(null)
                }}
              >
                {children}
              </YearOverlayCaptionLabel>
            ),
            // Override month grid to add the overlay panel
            MonthGrid: ({
              className: gridClassName,
              children: gridChildren,
            }: {
              className?: string
              children?: ReactNode
            }) => (
              <YearOverlayMonthGrid
                className={gridClassName}
                currentMonth={month.getMonth()}
                currentYear={month.getFullYear()}
                endDate={endDate}
                isYearView={isYearView}
                onMonthSelect={(m) => {
                  setMonth(m)
                  setIsYearView(false)
                  setSelectedYear(null)
                }}
                startDate={startDate}
                years={yearDates}
                selectedYear={selectedYear}
                setSelectedYear={setSelectedYear}
              >
                {gridChildren}
              </YearOverlayMonthGrid>
            ),
          }}
        />

        {/* Time inputs */}
        {showTime && (
          <>
            <Separator />
            <div className="p-3">
              <TimeRangeSection
                startTime={current.startTime}
                endTime={current.endTime}
                onStartChange={(v) => push({ ...current, startTime: v })}
                onEndChange={(v) => push({ ...current, endTime: v })}
              />
            </div>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-muted/10 px-3 py-2">
          <span className="select-none text-[10px] text-muted-foreground">
            {isComplete ? "Range selected" : "Pick start & end dates"}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setOpen(false)}
              className="rounded-none text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              size="xs"
              onClick={handleApply}
              disabled={!isComplete}
              className="rounded-none px-3 text-xs font-semibold"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ┌──────────────────────────────────────────────────────────────────────────┐
// │  VARIANT 3 — DateRangeTimePickerInline                                   │
// │  No popover — always visible, embeds directly into forms/drawers         │
// └──────────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────

export interface DateRangeTimePickerInlineProps {
  value?: DateTimeRangeValue
  onChange?: (value: DateTimeRangeValue) => void
  /** Fires when user clicks Apply */
  onApply?: (value: DateTimeRangeValue) => void
  /** Fires when user clicks Clear */
  onClear?: () => void
  className?: string
  /** Show time range section. Default: true */
  showTime?: boolean
  /** Year range shown in the strip. Default: current year ±5 */
  yearRange?: { start: number; end: number }
}

/**
 * ### Variant 3 — DateRangeTimePickerInline
 *
 * **Best for:** settings modals, filter drawers, forms where the picker
 * should always be visible without requiring a trigger click.
 *
 * **Features:**
 * - Year band at the top (scrollable strip of year buttons)
 * - Dual-month range calendar
 * - Optional time range section below the calendar
 * - Summary footer with selected range + Clear / Apply buttons
 * - Full controlled or uncontrolled support
 *
 * **Usage:**
 * ```tsx
 * <DateRangeTimePickerInline
 *   showTime
 *   onApply={(v) => {
 *     setFilter(v)
 *     closeDrawer()
 *   }}
 *   onClear={() => setFilter(undefined)}
 * />
 * ```
 */
export function DateRangeTimePickerInline({
  value,
  onChange,
  onApply,
  onClear,
  className,
  showTime = true,
  yearRange,
}: DateRangeTimePickerInlineProps) {
  const today = new Date()
  const thisYear = today.getFullYear()
  const yr = yearRange ?? { start: thisYear - 5, end: thisYear + 5 }

  const [month, setMonth] = useState(today)
  const { current, push } = useValue(value, onChange)
  const isComplete = Boolean(current.from && current.to)
  const years = makeYearNumbers(yr.start, yr.end)

  const handleClear = () => {
    push({ ...DEFAULT_RANGE })
    onClear?.()
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-none border bg-background",
        className
      )}
    >
      {/* ── Year Band ── */}
      <div className="border-b bg-muted/20 px-4 pb-2.5 pt-3">
        <p className="mb-1.5 select-none text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Year
        </p>
        <YearStrip
          years={years}
          currentYear={month.getFullYear()}
          onYearSelect={(y) => setMonth(new Date(y, month.getMonth()))}
        />
      </div>

      {/* ── Dual-Month Calendar ── */}
      <div className="border-b">
        <Calendar
          mode="range"
          selected={{ from: current.from, to: current.to }}
          onSelect={(range) =>
            push({ ...current, from: range?.from, to: range?.to })
          }
          month={month}
          onMonthChange={setMonth}
          numberOfMonths={2}
          startMonth={startOfYear(new Date(yr.start, 0))}
          endMonth={endOfYear(new Date(yr.end, 0))}
          className="p-4"
        />
      </div>

      {/* ── Time Section ── */}
      {showTime && (
        <div className="border-b px-4 py-4">
          <TimeRangeSection
            startTime={current.startTime}
            endTime={current.endTime}
            onStartChange={(v) => push({ ...current, startTime: v })}
            onEndChange={(v) => push({ ...current, endTime: v })}
          />
        </div>
      )}

      {/* ── Summary Footer ── */}
      <div className="bg-muted/10 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Selected summary */}
          <div className="min-w-0 flex-1">
            {isComplete ? (
              <div className="space-y-0.5">
                <p className="truncate text-xs font-semibold text-foreground">
                  {format(current.from!, "MMM dd, yyyy")} –{" "}
                  {format(current.to!, "MMM dd, yyyy")}
                </p>
                {showTime && (
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {current.startTime} – {current.endTime}
                  </p>
                )}
              </div>
            ) : (
              <p className="select-none text-xs text-muted-foreground">
                No range selected
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="xs"
              onClick={handleClear}
              disabled={!isComplete}
              className="rounded-none text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => onApply?.(current)}
              disabled={!isComplete}
              className="rounded-none px-4 text-xs font-semibold"
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
