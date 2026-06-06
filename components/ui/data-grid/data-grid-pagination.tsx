"use client"

import React, { ReactNode } from "react"
import { useDataGrid } from "@/components/ui/data-grid/data-grid"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Badge } from "@/components/ui/badge"

interface DataGridPaginationProps {
  sizes?: number[]
  sizesInfo?: string
  sizesLabel?: string
  sizesDescription?: string
  sizesSkeleton?: ReactNode
  more?: boolean
  moreLimit?: number
  info?: string
  infoSkeleton?: ReactNode
  className?: string
  rowsPerPageLabel?: string
  previousPageLabel?: string
  nextPageLabel?: string
  ellipsisText?: string
}

function DataGridPagination(props: DataGridPaginationProps): React.JSX.Element {
  const { table, recordCount, isLoading } = useDataGrid()

  const defaultProps: Partial<DataGridPaginationProps> = {
    sizes: [5, 10, 25, 50, 100],
    sizesLabel: "Show",
    sizesDescription: "per page",
    sizesSkeleton: <Skeleton className="h-8 w-44" />,
    moreLimit: 5,
    more: false,
    info: "{from} - {to} / {count}",
    infoSkeleton: <Skeleton className="h-8 w-60" />,
    rowsPerPageLabel: "Rows per page",
    previousPageLabel: "Go to previous page",
    nextPageLabel: "Go to next page",
    ellipsisText: "...",
  }

  const mergedProps: DataGridPaginationProps = { ...defaultProps, ...props }

  const btnBaseClasses = "size-7 p-0 text-sm"
  const btnArrowClasses = btnBaseClasses + " rtl:transform rtl:rotate-180"
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const from = pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, recordCount)
  const pageCount = table.getPageCount()

  // Replace placeholders in paginationInfo
  const paginationInfo = mergedProps?.info
    ? mergedProps.info
        .replace("{from}", from.toString())
        .replace("{to}", to.toString())
        .replace("{count}", recordCount.toString())
    : `${from} - ${to} of ${recordCount}`

  // Pagination limit logic
  const paginationMoreLimit = mergedProps?.moreLimit || 5

  // Determine the start and end of the pagination group
  const currentGroupStart =
    Math.floor(pageIndex / paginationMoreLimit) * paginationMoreLimit
  const currentGroupEnd = Math.min(
    currentGroupStart + paginationMoreLimit,
    pageCount
  )

  // Render page buttons based on the current group
  const renderPageButtons = () => {
    const buttons = []
    for (let i = currentGroupStart; i < currentGroupEnd; i++) {
      buttons.push(
        <ToggleGroupItem
          key={i}
          value={i.toString()}
          className={cn(btnBaseClasses, "text-muted-foreground data-[state=on]:bg-accent data-[state=on]:text-accent-foreground")}
          aria-label={`Go to page ${i + 1}`}
        >
          {i + 1}
        </ToggleGroupItem>
      )
    }
    return (
      <ToggleGroup
        type="single"
        variant="outline"
        value={pageIndex.toString()}
        onValueChange={(val) => {
          if (val !== undefined && val !== "") {
            table.setPageIndex(Number(val))
          }
        }}
      >
        {buttons}
      </ToggleGroup>
    )
  }

  // Render a "previous" ellipsis button if there are previous pages to show
  const renderEllipsisPrevButton = () => {
    if (currentGroupStart > 0) {
      return (
        <Button
          size="icon-sm"
          className={btnBaseClasses}
          variant="outline"
          onClick={() => table.setPageIndex(currentGroupStart - 1)}
        >
          {mergedProps.ellipsisText}
        </Button>
      )
    }
    return null
  }

  // Render a "next" ellipsis button if there are more pages to show after the current group
  const renderEllipsisNextButton = () => {
    if (currentGroupEnd < pageCount) {
      return (
        <Button
          className={btnBaseClasses}
          variant="outline"
          size="icon-sm"
          onClick={() => table.setPageIndex(currentGroupEnd)}
        >
          {mergedProps.ellipsisText}
        </Button>
      )
    }
    return null
  }

  return (
    <div
      data-slot="data-grid-pagination"
      className={cn(
        "flex grow flex-col flex-wrap items-center justify-between gap-2.5 py-2.5 sm:flex-row sm:py-0",
        mergedProps?.className
      )}
    >
      <div className="order-2 flex flex-wrap items-center space-x-2.5 py-2.5 sm:order-1 sm:pb-0">
        {isLoading ? (
          mergedProps?.sizesSkeleton
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              {mergedProps.rowsPerPageLabel}
            </div>
            <Select
              value={`${pageSize}`}
              onValueChange={(value) => {
                const newPageSize = Number(value)
                table.setPageSize(newPageSize)
              }}
            >
              <SelectTrigger className="w-fit" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="w-fit">
                {mergedProps?.sizes?.map((size: number) => (
                  <SelectItem key={size} value={`${size}`}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>
      <div className="order-1 flex flex-col items-center justify-center gap-2.5 pt-2.5 sm:order-2 sm:flex-row sm:justify-end sm:pt-0">
        {isLoading ? (
          mergedProps?.infoSkeleton
        ) : (
          <>
            <Badge variant="outline" className="order-2 text-xs font-normal text-muted-foreground sm:order-1">
              {paginationInfo}
            </Badge>
            {pageCount > 1 && (
              <div className="order-1 flex items-center space-x-1 sm:order-2">
                <Button
                  size="icon-sm"
                  variant="outline"
                  className={btnArrowClasses}
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">
                    {mergedProps.previousPageLabel}
                  </span>
                  <ChevronLeftIcon className="size-4" />
                </Button>

                {renderEllipsisPrevButton()}

                {renderPageButtons()}

                {renderEllipsisNextButton()}

                <Button
                  size="icon-sm"
                  variant="outline"
                  className={btnArrowClasses}
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">{mergedProps.nextPageLabel}</span>
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export { DataGridPagination, type DataGridPaginationProps }
