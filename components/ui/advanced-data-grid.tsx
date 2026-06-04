"use client"

import { ReactNode, useMemo, useState } from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
  Row,
  FilterFn,
} from "@tanstack/react-table"

import {
  DataGrid,
  DataGridContainer,
} from "@/components/ui/data-grid/data-grid"
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table"
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination"
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal, Search, Filter, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/use-debounce"
import { ExportDropdown } from "@/components/export-dropdown"

// ─── Public types ─────────────────────────────────────────────────────────────

/** One option inside a column-filter dropdown. */
export interface DataGridFilterOption {
  label: string
  value: string
  /** Rendered before the label. Can be any ReactNode (avatar, icon, etc.). */
  icon?: ReactNode
}

/** Describes a column that can be filtered. */
export interface DataGridColumnFilterDef {
  columnId: string
  /** When provided (and non-empty), a filter button is shown for this column. */
  options: DataGridFilterOption[]
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AdvancedDataGridProps<TData extends object> {
  /** Column definitions (TanStack Table format). */
  columns: ColumnDef<TData, unknown>[]
  /** Row data. */
  data: TData[]
  /** Show a global search input in the toolbar. */
  enableSearch?: boolean
  /** Enable column sorting. */
  enableSorting?: boolean
  /** Show pagination controls below the table. */
  enablePagination?: boolean
  /** Default page size (default 10). */
  pageSize?: number
  /** Allow cells to wrap text instead of truncating. */
  allowWrap?: boolean
  /**
   * Per-column filter definitions.
   * Columns whose `options` array is non-empty get a filter button in the toolbar.
   */
  columnFilters?: DataGridColumnFilterDef[]
  /** Initial column visibility map, e.g. `{ browser: false }`. */
  initialColumnVisibility?: VisibilityState
  /** Extra content rendered on the right side of the toolbar (e.g. export button). */
  toolbar?: ReactNode
  /** Enable export functionality */
  export?: boolean
  /** Message shown when there are no rows. */
  emptyMessage?: ReactNode
  /** Filename for exported data. */
  exportFilename?: string
  /** Called when a row is clicked. */
  onRowClick?: (row: TData) => void
  className?: string
}

// ─── Custom multi-value filter ─────────────────────────────────────────────────

const multiValueFilterFn: FilterFn<unknown> = (row, columnId, filterValue) => {
  if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0))
    return true
  const cellValue = row.getValue(columnId)
  const values: string[] = Array.isArray(filterValue)
    ? filterValue
    : [filterValue]
  return values.some(
    (v) => String(cellValue).toLowerCase() === String(v).toLowerCase()
  )
}
multiValueFilterFn.autoRemove = (val) =>
  !val || (Array.isArray(val) && val.length === 0)

// ─── Component ────────────────────────────────────────────────────────────────

export function AdvancedDataGrid<TData extends object>({
  columns,
  data,
  enableSearch = true,
  enableSorting = false,
  enablePagination = false,
  pageSize = 10,
  allowWrap = false,
  columnFilters: columnFilterDefs = [],
  initialColumnVisibility = {},
  toolbar,
  export: enableExport = false,
  exportFilename = "export",
  emptyMessage = "No data available.",
  onRowClick,
  className,
}: AdvancedDataGridProps<TData>) {
  const [searchQuery, setSearchQuery] = useState("")
  const globalFilter = useDebounce(searchQuery, 300)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility
  )

  // Attach the multi-value filterFn to every column that has filter options
  const patchedColumns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    const filterableIds = new Set(
      columnFilterDefs
        .filter((f) => f.options.length > 0)
        .map((f) => f.columnId)
    )
    if (filterableIds.size === 0) return columns
    return columns.map((col) => {
      const id =
        "id" in col && col.id
          ? col.id
          : "accessorKey" in col && col.accessorKey
            ? String(col.accessorKey)
            : ""
      if (!id || !filterableIds.has(id)) return col
      return { ...col, filterFn: multiValueFilterFn as FilterFn<TData> }
    })
  }, [columns, columnFilterDefs])

  const table = useReactTable<TData>({
    data,
    columns: patchedColumns,
    state: {
      globalFilter,
      sorting,
      columnFilters,
      columnVisibility,
    },
    filterFns: {
      multiValue: multiValueFilterFn as FilterFn<TData>,
    },
    onGlobalFilterChange: setSearchQuery,
    onSortingChange: enableSorting ? setSorting : undefined,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: enableSorting ? getSortedRowModel() : getCoreRowModel(),
    getPaginationRowModel: enablePagination
      ? getPaginationRowModel()
      : undefined,
    initialState: {
      pagination: { pageSize },
    },
    globalFilterFn: "includesString",
  })

  // Column-filter definitions for columns that have options
  const activeFilterDefs = columnFilterDefs.filter((f) => f.options.length > 0)

  // Determine whether we have a column-visibility toggle button
  const hasHidableColumns = table
    .getAllColumns()
    .some((col) => col.getCanHide())

  const hasToolbar =
    enableSearch ||
    activeFilterDefs.length > 0 ||
    hasHidableColumns ||
    enableExport ||
    !!toolbar

  const recordCount = table.getFilteredRowModel().rows.length

  return (
    <DataGrid
      table={table}
      recordCount={recordCount}
      onRowClick={onRowClick}
      emptyMessage={emptyMessage}
      tableLayout={{
        rowBorder: true,
        headerBorder: true,
        headerBackground: true,
        width: "auto",
        cellBorder: true,
      }}
      tableClassNames={{
        base: allowWrap ? "" : "",
      }}
    >
      <div className={cn("flex flex-col gap-2", className)}>
        {/* ── Toolbar ── */}
        {hasToolbar && (
          <div className="flex flex-wrap items-center gap-2">
            {enableSearch && (
              <InputGroup className="max-w-xs min-w-[180px] flex-1">
                <InputGroupAddon align="inline-start">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  placeholder="Search…"
                  value={searchQuery ?? ""}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs"
                />
                <InputGroupAddon
                  align="inline-end"
                  className="flex justify-center"
                >
                  {searchQuery !== globalFilter && (
                    <Spinner className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </InputGroupAddon>
              </InputGroup>
            )}

            {/* Single Filters Button */}
            {activeFilterDefs.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {table.getState().columnFilters.length > 0 && (
                      <Badge variant="secondary" className="px-1 h-5 rounded-sm font-normal">
                        {table.getState().columnFilters.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 max-h-[350px] overflow-y-auto">
                  <DropdownMenuLabel>Filter By</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {activeFilterDefs.map((filterDef) => {
                    const col = table.getColumn(filterDef.columnId)
                    if (!col) return null
                    const title =
                      typeof col.columnDef.header === "string"
                        ? col.columnDef.header
                        : filterDef.columnId
                    const selectedValues = new Set(
                      (col.getFilterValue() as string[]) || []
                    )

                    return (
                      <DropdownMenuSub key={filterDef.columnId}>
                        <DropdownMenuSubTrigger className="gap-2">
                          <span>{title}</span>
                          {selectedValues.size > 0 && (
                            <div className="ml-1.5 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                          {filterDef.options.map((opt) => {
                            const isSelected = selectedValues.has(opt.value)
                            return (
                              <DropdownMenuCheckboxItem
                                key={opt.value}
                                checked={isSelected}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    selectedValues.add(opt.value)
                                  } else {
                                    selectedValues.delete(opt.value)
                                  }
                                  const filterValues =
                                    Array.from(selectedValues)
                                  col.setFilterValue(
                                    filterValues.length
                                      ? filterValues
                                      : undefined
                                  )
                                }}
                              >
                                {opt.label}
                              </DropdownMenuCheckboxItem>
                            )
                          })}
                          {selectedValues.size > 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={(e) => {
                                  e.preventDefault()
                                  col.setFilterValue(undefined)
                                }}
                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Clear filter
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )
                  })}
                  {table.getState().columnFilters.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onSelect={() => table.resetColumnFilters()}
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Clear all filters
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="ml-auto flex items-center gap-2">
              {/* Export dropdown */}
              {enableExport && (
                <ExportDropdown
                  data={table.getFilteredRowModel().rows.map((r) => r.original)}
                  filename={exportFilename}
                />
              )}

              {/* Column visibility toggle */}
              {hasHidableColumns && (
                <DataGridColumnVisibility
                  table={table}
                  trigger={
                    <Button variant="outline">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      View
                    </Button>
                  }
                />
              )}

              {/* Extra toolbar content (export buttons, etc.) */}
              {toolbar && <div>{toolbar}</div>}
            </div>
          </div>
        )}

        {/* ── Table ── */}
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>

        {/* ── Pagination ── */}
        {enablePagination && recordCount > 0 && (
          <DataGridPagination sizes={[10, 25, 50, 100]} />
        )}
      </div>
    </DataGrid>
  )
}
