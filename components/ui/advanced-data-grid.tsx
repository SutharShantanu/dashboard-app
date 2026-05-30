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

import { DataGrid, DataGridContainer } from "@/components/ui/data-grid/data-grid"
import { DataGridTable } from "@/components/ui/data-grid/data-grid-table"
import { DataGridPagination } from "@/components/ui/data-grid/data-grid-pagination"
import { DataGridColumnFilter } from "@/components/ui/data-grid/data-grid-column-filter"
import { DataGridColumnVisibility } from "@/components/ui/data-grid/data-grid-column-visibility"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { SlidersHorizontal, Search } from "lucide-react"
import { cn } from "@/lib/utils"

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
  /** Message shown when there are no rows. */
  emptyMessage?: ReactNode
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
  enableSearch = false,
  enableSorting = false,
  enablePagination = false,
  pageSize = 10,
  allowWrap = false,
  columnFilters: columnFilterDefs = [],
  initialColumnVisibility = {},
  toolbar,
  emptyMessage = "No data available.",
  onRowClick,
  className,
}: AdvancedDataGridProps<TData>) {
  const [globalFilter, setGlobalFilter] = useState("")
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] =
    useState<VisibilityState>(initialColumnVisibility)

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
    onGlobalFilterChange: setGlobalFilter,
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
  const activeFilterDefs = columnFilterDefs.filter(
    (f) => f.options.length > 0
  )

  // Determine whether we have a column-visibility toggle button
  const hasHidableColumns = table
    .getAllColumns()
    .some((col) => col.getCanHide())

  const hasToolbar =
    enableSearch ||
    activeFilterDefs.length > 0 ||
    hasHidableColumns ||
    !!toolbar

  const recordCount = table.getFilteredRowModel().rows.length

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* ── Toolbar ── */}
      {hasToolbar && (
        <div className="flex flex-wrap items-center gap-2">
          {enableSearch && (
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search…"
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
          )}

          {/* Per-column filter buttons */}
          {activeFilterDefs.map((filterDef) => {
            const col = table.getColumn(filterDef.columnId)
            if (!col) return null
            // Map DataTableFilterOption → DataGridColumnFilter option shape
            const opts = filterDef.options.map((o) => ({
              label: o.label,
              value: o.value,
              // DataGridColumnFilter expects icon as ComponentType, so we skip
              // the ReactNode icon here (the visuals still show via label)
            }))
            return (
              <DataGridColumnFilter
                key={filterDef.columnId}
                column={col as Parameters<typeof DataGridColumnFilter>[0]["column"]}
                title={
                  typeof col.columnDef.header === "string"
                    ? col.columnDef.header
                    : filterDef.columnId
                }
                options={opts}
              />
            )
          })}

          {/* Column visibility toggle */}
          {hasHidableColumns && (
            <DataGridColumnVisibility
              table={table}
              trigger={
                <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  View
                </Button>
              }
            />
          )}

          {/* Extra toolbar content (export buttons, etc.) */}
          {toolbar && <div className="ml-auto">{toolbar}</div>}
        </div>
      )}

      {/* ── Table ── */}
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
        }}
        tableClassNames={{
          base: allowWrap ? "" : "",
        }}
      >
        <DataGridContainer>
          <DataGridTable />
        </DataGridContainer>
      </DataGrid>

      {/* ── Pagination ── */}
      {enablePagination && recordCount > 0 && (
        <div className="border-t px-3">
          <DataGridPagination sizes={[10, 25, 50, 100]} />
        </div>
      )}
    </div>
  )
}
