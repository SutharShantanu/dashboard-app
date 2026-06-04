"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Column } from "@tanstack/react-table"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  CirclePlusIcon,
  CheckIcon,
  SearchIcon,
  Loader2Icon,
} from "lucide-react"
import { EmptyState } from "@/components/empty-state"
import { useDebounce } from "@/hooks/use-debounce"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Spinner } from "../spinner"

interface DataGridColumnFilterProps<TData, TValue> {
  column?: Column<TData, TValue>
  title?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
}

function DataGridColumnFilter<TData, TValue>({
  column,
  title,
  options,
}: DataGridColumnFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues()
  const selectedValues = new Set(column?.getFilterValue() as string[])
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const isSearching = searchQuery !== debouncedSearchQuery

  const filteredOptions = useMemo(() => {
    if (!debouncedSearchQuery) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    )
  }, [options, debouncedSearchQuery])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <CirclePlusIcon className="size-4" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-7.5" />
              <Badge variant="secondary" className="lg:hidden">
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge variant="secondary">
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge variant="secondary" key={option.value}>
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit max-w-xs p-0" align="start">
        <div className="p-2">
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>
              <SearchIcon className="size-4" />
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            placeholder={title}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <InputGroupAddon>
              <InputGroupText>
                <Spinner className="size-4" />
              </InputGroupText>
            </InputGroupAddon>
          )}
        </InputGroup>
        </div>
        <Separator className="mt-0" />
        <div className="max-h-[300px] overflow-y-auto p-2 pt-0">
          {filteredOptions.length === 0 ? (
            <EmptyState
              title="No results found"
              description="Try adjusting your search."
            />
          ) : (
            <div className="flex flex-wrap gap-1.5 p-2">
              {filteredOptions.map((option) => {
                const isSelected = selectedValues.has(option.value)
                return (
                  <Badge
                    key={option.value}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer font-normal transition-colors",
                      !isSelected && "hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => {
                      if (isSelected) {
                        selectedValues.delete(option.value)
                      } else {
                        selectedValues.add(option.value)
                      }
                      const filterValues = Array.from(selectedValues)
                      column?.setFilterValue(
                        filterValues.length ? filterValues : undefined
                      )
                    }}
                  >
                    {isSelected && <CheckIcon className="mr-1 h-3 w-3" />}
                    {option.icon && <option.icon className="mr-1.5 h-3.5 w-3.5 opacity-70" />}
                    {option.label}
                    {facets?.get(option.value) && (
                      <span className="ml-1.5 opacity-60 text-xs">
                        {facets.get(option.value)}
                      </span>
                    )}
                  </Badge>
                )
              })}
            </div>
          )}
          {selectedValues.size > 0 && (
            <>
              <Separator className="my-1 w-full" />
              <div className="p-1">
                <Button
                  variant="destructive"
                  onClick={() => column?.setFilterValue(undefined)}
                  className="w-full"
                >
                  Clear filters
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { DataGridColumnFilter, type DataGridColumnFilterProps }
