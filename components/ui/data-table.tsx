"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import {
  Filters,
  type Filter,
  type FilterFieldConfig,
} from "@/components/ui/filters"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyDescription } from "@/components/ui/empty"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Search,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownZA,
  ArrowUpZA,
  ArrowDownAZ,
  ClockArrowUp,
  ClockArrowDown,
  ArrowUp01,
  ArrowDown10,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Check,
  X,
} from "lucide-react"

// ─── Public types ──────────────────────────────────────────────────────────────

export interface DataTableFilterOption {
  label: string
  value: string
}

export interface DataTableColumnFilter {
  /** Must match the column's `id` / `accessorKey` exactly */
  columnId: string
  /** Options list – first entry is the "show all" sentinel */
  options: DataTableFilterOption[]
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  /** Show a global search bar above the table (default: false) */
  enableSearch?: boolean
  /** Allow clicking column headers to sort (default: false) */
  enableSorting?: boolean
  /** Show pagination controls (default: false) */
  enablePagination?: boolean
  /** Rows per page – only used when enablePagination is true (default: 10) */
  pageSize?: number
  /** Dropdown column filters rendered in the toolbar */
  columnFilters?: DataTableColumnFilter[]
  /** Extra content rendered to the right of the search/filter bar */
  toolbar?: React.ReactNode
  /** Allow cell content to wrap (default: false → whitespace-nowrap) */
  allowWrap?: boolean
  /** Initial column visibility state */
  initialColumnVisibility?: Record<string, boolean>
}

// ─── Sorting Icon Helper ───────────────────────────────────────────────────────

function getSortIcon(columnId: string, sortDir: false | "asc" | "desc") {
  const id = columnId.toLowerCase()

  // 1. Check if date/time column
  const isDate =
    id.includes("date") ||
    id.includes("time") ||
    id.includes("timestamp") ||
    id.includes("createdat") ||
    id.includes("updatedat")

  // 2. Check if numeric column
  const isNumeric =
    id.includes("amount") ||
    id.includes("price") ||
    id.includes("count") ||
    id.includes("size") ||
    id.includes("number") ||
    id.includes("id") ||
    id.includes("index") ||
    id === "ip"

  if (sortDir === "asc") {
    if (isDate) return <ClockArrowUp className="h-3.5 w-3.5 text-primary" />
    if (isNumeric) return <ArrowUp01 className="h-3.5 w-3.5 text-primary" />
    return <ArrowUpAZ className="h-3.5 w-3.5 text-primary" />
  }

  if (sortDir === "desc") {
    if (isDate) return <ClockArrowDown className="h-3.5 w-3.5 text-primary" />
    if (isNumeric) return <ArrowDown10 className="h-3.5 w-3.5 text-primary" />
    return <ArrowDownZA className="h-3.5 w-3.5 text-primary" />
  }

  return (
    <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/30 transition-colors hover:text-muted-foreground/60" />
  )
}

// ─── Faceted Filter Component ──────────────────────────────────────────────────

interface DataTableFacetedFilterProps {
  title?: string
  columnId: string
  options: DataTableFilterOption[]
  selectedValues: Set<string>
  onFilterChange: (values: string[]) => void
}

export function DataTableFacetedFilter({
  title,
  columnId,
  options,
  selectedValues,
  onFilterChange,
}: DataTableFacetedFilterProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-dashed px-3 py-1 text-xs hover:bg-accent/50 hover:text-accent-foreground"
        >
          <PlusCircle className="h-4 w-4 shrink-0 opacity-60" />
          <span>{title}</span>
          {selectedValues.size > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 bg-muted-foreground/30"
              />
              <Badge
                variant="secondary"
                size="xs"
                className="font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary" size="xs" className="font-normal">
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((opt) => selectedValues.has(opt.value))
                    .map((opt) => (
                      <Badge
                        variant="secondary"
                        size="xs"
                        key={opt.value}
                        className="bg-accent font-normal text-accent-foreground dark:bg-muted dark:text-foreground"
                      >
                        {opt.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] border p-0" align="start">
        <Command className="">
          <CommandInput placeholder={`Filter ${title || "options"}...`} />
          <CommandList className="no-scrollbar">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="p-1.5">
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      const newValues = new Set(selectedValues)
                      if (isSelected) {
                        newValues.delete(option.value)
                      } else {
                        newValues.add(option.value)
                      }
                      onFilterChange(Array.from(newValues))
                    }}
                    className="flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "mr-2 flex h-3.5 w-3.5 items-center justify-center border border-primary transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                      <span>{option.label}</span>
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup className="p-1.5">
                  <CommandItem
                    variant="destructive"
                    onSelect={() => onFilterChange([])}
                  >
                    Clear
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function DataTable<TData, TValue>({
  columns,
  data,
  enableSearch = false,
  enableSorting = false,
  enablePagination = false,
  pageSize = 10,
  columnFilters: columnFilterDefs,
  toolbar,
  allowWrap = false,
  initialColumnVisibility,
}: DataTableProps<TData, TValue>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const initialFilters = useMemo(() => {
    try {
      const urlFilters = searchParams.get("filters")
      if (urlFilters) {
        return JSON.parse(decodeURIComponent(urlFilters)) as Filter[]
      }
    } catch (e) {
      console.error("Failed to parse filters from URL:", e)
    }
    return []
  }, []) // run once on mount

  const initialGlobalFilter = useMemo(() => {
    return searchParams.get("q") || ""
  }, []) // run once on mount

  const [globalFilter, setGlobalFilter] = useState(initialGlobalFilter)
  const [sorting, setSorting] = useState<SortingState>([])
  const [filters, setFilters] = useState<Filter[]>(initialFilters)
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize })

  // 1. Sync from internal state changes TO URL parameters
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())

    if (filters.length > 0) {
      params.set("filters", encodeURIComponent(JSON.stringify(filters)))
    } else {
      params.delete("filters")
    }

    if (globalFilter) {
      params.set("q", globalFilter)
    } else {
      params.delete("q")
    }

    const currentString = searchParams.toString()
    const newString = params.toString()

    if (currentString !== newString) {
      router.replace(`${pathname}?${newString}`, { scroll: false })
    }
  }, [filters, globalFilter, pathname, router, searchParams])

  // 2. Sync from URL parameters TO internal state changes (handles back/forward browser buttons)
  useEffect(() => {
    try {
      const urlFiltersStr = searchParams.get("filters") || ""
      const urlFilters = urlFiltersStr ? (JSON.parse(decodeURIComponent(urlFiltersStr)) as Filter[]) : []
      if (JSON.stringify(filters) !== JSON.stringify(urlFilters)) {
        setFilters(urlFilters)
      }
    } catch (e) {
      console.error("Failed to sync filters from URL:", e)
    }

    const urlQ = searchParams.get("q") || ""
    if (globalFilter !== urlQ) {
      setGlobalFilter(urlQ)
    }
  }, [searchParams])

  const columnFiltersState = useMemo<ColumnFiltersState>(() => {
    const grouped: Record<string, Filter[]> = {}
    filters.forEach((f) => {
      if (!grouped[f.field]) grouped[f.field] = []
      grouped[f.field].push(f)
    })

    return Object.entries(grouped).map(([field, list]) => ({
      id: field,
      value: list,
    }))
  }, [filters])

  const fields = useMemo<FilterFieldConfig[]>(() => {
    if (!columnFilterDefs) return []
    return columnFilterDefs.map((def) => {
      const colDef = columns.find(
        (c) => ((c as any).id ?? (c as any).accessorKey) === def.columnId
      )
      const label = (colDef?.header as string) || def.columnId

      let type: "text" | "select" | "date" = "text"
      const idLower = def.columnId.toLowerCase()
      if (def.options && def.options.length > 1) {
        type = "select"
      } else if (
        idLower.includes("date") ||
        idLower.includes("time") ||
        idLower.includes("timestamp") ||
        idLower.includes("createdat") ||
        idLower.includes("updatedat")
      ) {
        type = "date"
      }
      const options = def.options
        .filter((opt) => opt.value !== "ALL" && opt.value !== "all")
        .map((opt) => ({ value: opt.value, label: opt.label }))

      return {
        key: def.columnId,
        label,
        type,
        options,
      }
    })
  }, [columnFilterDefs, columns])

  // Auto-stamp filterFn: custom multi-select on any column targeted by a DataTableColumnFilter
  const processedColumns = useMemo<ColumnDef<TData, TValue>[]>(() => {
    const filteredIds = new Set(columnFilterDefs?.map((f) => f.columnId) ?? [])
    return columns.map((col) => {
      const id = (col as any).id ?? (col as any).accessorKey
      if (filteredIds.has(id)) {
        return {
          ...col,
          filterFn: (row, columnId, filterList) => {
            if (
              !filterList ||
              !Array.isArray(filterList) ||
              filterList.length === 0
            ) {
              return true
            }

            const cellValue = row.getValue(columnId)

            return filterList.every((filter: Filter) => {
              const { operator, values } = filter
              if (
                !values ||
                values.length === 0 ||
                values[0] === undefined ||
                values[0] === ""
              )
                return true

              const isColDate =
                columnId.toLowerCase().includes("date") ||
                columnId.toLowerCase().includes("time") ||
                columnId.toLowerCase().includes("timestamp") ||
                columnId.toLowerCase().includes("createdat") ||
                columnId.toLowerCase().includes("updatedat")

              switch (operator) {
                case "is":
                  if (isColDate) {
                    const cellTime = new Date(String(cellValue)).getTime()
                    if (values.length >= 2) {
                      const minTime = new Date(String(values[0])).getTime()
                      const maxTime = new Date(String(values[1])).getTime()
                      return cellTime >= minTime && cellTime <= maxTime
                    }
                    if (String(values[0]).endsWith("T00:00:00")) {
                      const dayStart = new Date(String(values[0])).getTime()
                      const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1
                      return cellTime >= dayStart && cellTime <= dayEnd
                    }
                    const filterTime = new Date(String(values[0])).getTime()
                    return cellTime === filterTime
                  }
                  return values.includes(cellValue)
                case "is_not":
                  if (isColDate) {
                    const cellTime = new Date(String(cellValue)).getTime()
                    if (values.length >= 2) {
                      const minTime = new Date(String(values[0])).getTime()
                      const maxTime = new Date(String(values[1])).getTime()
                      return cellTime < minTime || cellTime > maxTime
                    }
                    if (String(values[0]).endsWith("T00:00:00")) {
                      const dayStart = new Date(String(values[0])).getTime()
                      const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1
                      return cellTime < dayStart || cellTime > dayEnd
                    }
                    const filterTime = new Date(String(values[0])).getTime()
                    return cellTime !== filterTime
                  }
                  return !values.includes(cellValue)
                case "contains":
                  return values.some((value) =>
                    String(cellValue)
                      .toLowerCase()
                      .includes(String(value).toLowerCase())
                  )
                case "not_contains":
                  return !values.some((value) =>
                    String(cellValue)
                      .toLowerCase()
                      .includes(String(value).toLowerCase())
                  )
                case "equals":
                  return String(cellValue) === String(values[0])
                case "not_equals":
                  return String(cellValue) !== String(values[0])
                case "greater_than":
                  return Number(cellValue) > Number(values[0])
                case "less_than":
                  return Number(cellValue) < Number(values[0])
                case "greater_than_or_equal":
                  return Number(cellValue) >= Number(values[0])
                case "less_than_or_equal":
                  return Number(cellValue) <= Number(values[0])
                case "between":
                  if (values.length >= 2) {
                    if (isColDate) {
                      const cellTime = new Date(String(cellValue)).getTime()
                      const minTime = new Date(String(values[0])).getTime()
                      const maxTime = new Date(String(values[1])).getTime()
                      return cellTime >= minTime && cellTime <= maxTime
                    }
                    const min = Number(values[0])
                    const max = Number(values[1])
                    return Number(cellValue) >= min && Number(cellValue) <= max
                  }
                  return true
                case "not_between":
                  if (values.length >= 2) {
                    if (isColDate) {
                      const cellTime = new Date(String(cellValue)).getTime()
                      const minTime = new Date(String(values[0])).getTime()
                      const maxTime = new Date(String(values[1])).getTime()
                      return cellTime < minTime || cellTime > maxTime
                    }
                    const min = Number(values[0])
                    const max = Number(values[1])
                    return Number(cellValue) < min || Number(cellValue) > max
                  }
                  return true
                case "before":
                  return (
                    new Date(String(cellValue)) < new Date(String(values[0]))
                  )
                case "after":
                  return (
                    new Date(String(cellValue)) > new Date(String(values[0]))
                  )
                default:
                  return true
              }
            })
          },
        }
      }
      return col
    })
  }, [columns, columnFilterDefs])

  // Prepend # index column
  const columnsWithIndex = useMemo<ColumnDef<TData, TValue>[]>(() => {
    const indexCol: ColumnDef<TData, TValue> = {
      id: "__index",
      header: "#",
      cell: ({ row }) => row.index + 1,
      enableSorting: false,
      enableGlobalFilter: false,
    }
    return [indexCol, ...processedColumns]
  }, [processedColumns])

  // Enable sorting if enableSorting prop is true OR if any passed column specifies enableSorting is true
  const isSortingEnabled = useMemo(() => {
    return enableSorting || columns.some((col) => col.enableSorting === true)
  }, [enableSorting, columns])

  const table = useReactTable({
    data,
    columns: columnsWithIndex,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: isSortingEnabled ? getSortedRowModel() : undefined!,
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined!,
    initialState: {
      columnVisibility: initialColumnVisibility,
    },
    state: {
      globalFilter,
      columnFilters: columnFiltersState,
      ...(isSortingEnabled ? { sorting } : {}),
      ...(enablePagination ? { pagination } : {}),
    },
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: () => {}, // Managed internally by filters state
    ...(isSortingEnabled ? { onSortingChange: setSorting } : {}),
    ...(enablePagination ? { onPaginationChange: setPagination } : {}),
  })

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetPage = () => {
    if (enablePagination) setPagination((p) => ({ ...p, pageIndex: 0 }))
  }

  const handleGlobalFilter = (value: string) => {
    setGlobalFilter(value)
    resetPage()
  }

  const handleFiltersChange = (newFilters: Filter[]) => {
    setFilters(newFilters)
    resetPage()
  }

  const rows = table.getRowModel().rows
  const filteredTotal = table.getFilteredRowModel().rows.length
  const totalPages = enablePagination ? table.getPageCount() : 1
  const currentPageIndex = enablePagination
    ? table.getState().pagination.pageIndex
    : 0

  const getCellClass = (columnId: string) => {
    if (columnId === "timestamp" || columnId === "__index") {
      return "border-r last:border-r-0 whitespace-nowrap text-xs text-muted-foreground/80"
    }
    if (
      columnId === "user" ||
      columnId === "actor" ||
      columnId === "email" ||
      columnId === "action"
    ) {
      return "border-r last:border-r-0 whitespace-nowrap align-middle"
    }
    return cn(
      "border-r last:border-r-0 align-top max-w-[450px]",
      allowWrap ? "whitespace-normal break-words text-wrap" : "whitespace-nowrap"
    )
  }

  const hasToolbar =
    enableSearch || (columnFilterDefs && columnFilterDefs.length > 0) || toolbar

  return (
    <div className="space-y-3">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      {hasToolbar && (
        <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
          <div className="flex w-full flex-1 flex-col gap-2 sm:flex-row">
            {enableSearch && (
              <InputGroup className="min-w-xs max-w-sm flex-1">
                <InputGroupAddon>
                  <Search className="size-4" />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Search table…"
                  value={globalFilter}
                  onChange={(e) => handleGlobalFilter(e.target.value)}
                />
              </InputGroup>
            )}

            {columnFilterDefs && columnFilterDefs.length > 0 && (
              <div className="flex items-center gap-2">
                <Filters
                  filters={filters}
                  fields={fields}
                  onChange={handleFiltersChange}
                />
                {filters.length > 0 && (
                  <Button
                    variant="destructive"
                    onClick={() => handleFiltersChange([])}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>

          {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-full touch-pan-x overflow-x-auto border">
        <div className="w-fit min-w-full">
          <Table
            noWrapper
            className="w-auto min-w-full table-auto border-collapse"
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort =
                      isSortingEnabled && header.column.getCanSort()
                    const sortDir = header.column.getIsSorted()
                    return (
                      <TableHead
                        key={header.id}
                        className="border-r whitespace-nowrap select-none last:border-r-0"
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        style={{ cursor: canSort ? "pointer" : "default" }}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center gap-1.5">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {canSort && (
                              <span className="flex shrink-0 items-center">
                                {getSortIcon(header.column.id, sortDir)}
                              </span>
                            )}
                          </div>
                        )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={getCellClass(cell.column.id)}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columnsWithIndex.length}
                    className="p-0"
                  >
                    <Empty className="border-0 py-12">
                      <EmptyHeader className="gap-1">
                        <EmptyDescription className="text-xs text-muted-foreground">
                          No results.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      {enablePagination && totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 pt-1 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Showing {currentPageIndex * pageSize + 1}–
            {Math.min((currentPageIndex + 1) * pageSize, filteredTotal)} of{" "}
            {filteredTotal} rows
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-xs font-semibold"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              «
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-xs font-medium text-muted-foreground select-none">
              {currentPageIndex + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 text-xs font-semibold"
              onClick={() => table.setPageIndex(totalPages - 1)}
              disabled={!table.getCanNextPage()}
            >
              »
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
