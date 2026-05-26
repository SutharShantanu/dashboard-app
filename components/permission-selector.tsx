import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useDebounce } from "@/hooks/use-debounce"
import { Empty, EmptyHeader, EmptyDescription } from "@/components/ui/empty"
import { Toggle } from "@/components/ui/toggle"
import { Badge } from "@/components/ui/badge"
import { useMemoizedFn } from "@/hooks/use-memoized-fn"

interface Sheet {
  id: string
  title: string
  columns: string[]
}

interface PermissionSelectorProps {
  sheets: Sheet[]
  onChange: (permissions: Record<string, string[]>) => void
  value?: Record<string, string[]>
  presets?: Array<{
    id: string
    name: string
    permissions: Record<string, string[]>
  }>
  onPresetSelect?: (presetId: string) => void
  disabled?: boolean
  selectedSheet?: string
  onSheetChange?: (sheetId: string) => void
  hideSelectors?: boolean
}

export function PermissionSelector({
  sheets,
  onChange,
  value = {},
  presets = [],
  onPresetSelect,
  disabled = false,
  selectedSheet: propSelectedSheet,
  onSheetChange,
  hideSelectors = false,
}: PermissionSelectorProps) {
  const [internalSelectedSheet, setInternalSelectedSheet] =
    React.useState<string>(sheets[0]?.id || "")
  const [searchTerm, setSearchTerm] = React.useState("")
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Use a ref to hold the latest permissions so we can compare without
  // adding it to effect deps (prevents the parent-echo infinite loop).
  const [currentPermissions, setCurrentPermissions] =
    React.useState<Record<string, string[]>>(value)
  const currentPermissionsRef = React.useRef(currentPermissions)
  currentPermissionsRef.current = currentPermissions

  // Checkbox selections — plain useState, no RHF needed here
  const [selectedAvailable, setSelectedAvailable] = React.useState<string[]>([])
  const [selectedGranted, setSelectedGranted] = React.useState<string[]>([])

  const valueString = JSON.stringify(value)
  React.useEffect(() => {
    if (valueString !== JSON.stringify(currentPermissionsRef.current)) {
      setCurrentPermissions(value)
    }
  }, [valueString])

  const selectedSheet =
    propSelectedSheet !== undefined ? propSelectedSheet : internalSelectedSheet
  const setSelectedSheet =
    onSheetChange !== undefined ? onSheetChange : setInternalSelectedSheet

  // Reset checkbox selections when the active sheet changes
  React.useEffect(() => {
    setSelectedAvailable([])
    setSelectedGranted([])
  }, [selectedSheet])

  const currentSheet = sheets.find((s) => s.id === selectedSheet)
  const allColumns = (currentSheet?.columns || []).filter(
    (col) => col && col.trim() !== ""
  )
  const grantedColumns = (currentPermissions[selectedSheet] || []).filter(
    (col) => col && col.trim() !== ""
  )
  const availableColumns = allColumns.filter(
    (col) => !grantedColumns.includes(col)
  )

  const filteredAvailable = availableColumns.filter((col) =>
    col.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  )

  // Select-all toggles
  const isAllAvailableSelected =
    filteredAvailable.length > 0 &&
    filteredAvailable.every((col) => selectedAvailable.includes(col))

  const isAllGrantedSelected =
    grantedColumns.length > 0 &&
    grantedColumns.every((col) => selectedGranted.includes(col))

  const toggleSelectAllAvailable = useMemoizedFn(() => {
    if (isAllAvailableSelected) {
      setSelectedAvailable((prev) =>
        prev.filter((col) => !filteredAvailable.includes(col))
      )
    } else {
      setSelectedAvailable((prev) =>
        Array.from(new Set([...prev, ...filteredAvailable]))
      )
    }
  })

  const toggleSelectAllGranted = useMemoizedFn(() => {
    if (isAllGrantedSelected) {
      setSelectedGranted((prev) =>
        prev.filter((col) => !grantedColumns.includes(col))
      )
    } else {
      setSelectedGranted((prev) =>
        Array.from(new Set([...prev, ...grantedColumns]))
      )
    }
  })

  // Grant / Revoke actions
  const handleGrantSelected = () => {
    if (selectedAvailable.length === 0) return
    const nextGranted = [...grantedColumns, ...selectedAvailable]
    const sortedGranted = allColumns.filter((c) => nextGranted.includes(c))
    const updated = {
      ...currentPermissionsRef.current,
      [selectedSheet]: sortedGranted,
    }
    setCurrentPermissions(updated)
    onChange(updated)
    setSelectedAvailable([])
  }

  const handleRevokeSelected = () => {
    if (selectedGranted.length === 0) return
    const nextGranted = grantedColumns.filter(
      (c) => !selectedGranted.includes(c)
    )
    const updated = {
      ...currentPermissionsRef.current,
      [selectedSheet]: nextGranted,
    }
    setCurrentPermissions(updated)
    onChange(updated)
    setSelectedGranted([])
  }

  const handleGrantAll = () => {
    const nextGranted = [...grantedColumns, ...filteredAvailable]
    const sortedGranted = allColumns.filter((c) => nextGranted.includes(c))
    const updated = {
      ...currentPermissionsRef.current,
      [selectedSheet]: sortedGranted,
    }
    setCurrentPermissions(updated)
    onChange(updated)
    setSelectedAvailable([])
  }

  const handleRevokeAll = () => {
    const updated = { ...currentPermissionsRef.current, [selectedSheet]: [] }
    setCurrentPermissions(updated)
    onChange(updated)
    setSelectedGranted([])
  }

  return (
    <div className="w-full space-y-4">
      {!hideSelectors && presets.length > 0 && (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Load Preset:</Label>
          <Select onValueChange={onPresetSelect} disabled={disabled}>
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue placeholder="Select a preset" />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!hideSelectors && (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Select Sheet:</Label>
          <Select
            value={selectedSheet}
            onValueChange={setSelectedSheet}
            disabled={disabled}
          >
            <SelectTrigger className="h-8 w-[200px] text-xs">
              <SelectValue placeholder="Select sheet" />
            </SelectTrigger>
            <SelectContent>
              {sheets.map((s) => (
                <SelectItem key={s.id} value={s.id} className="text-xs">
                  {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex w-full items-stretch justify-between gap-4">
        {/* Available Columns */}
        <Card className="flex flex-1 flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm uppercase">
              Available Columns
            </CardTitle>
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search columns..."
                className="h-8 text-xs"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={disabled}
              />
              {searchTerm !== debouncedSearchTerm && (
                <InputGroupAddon align="inline-end">
                  <Spinner className="h-3 w-3" />
                </InputGroupAddon>
              )}
            </InputGroup>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="h-[300px] w-full overflow-y-auto border p-1">
              {filteredAvailable.length === 0 ? (
                <Empty className="border-0 p-4 py-8">
                  <EmptyHeader className="gap-1">
                    <EmptyDescription className="text-xs">
                      No columns available
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-1">
                  {/* Select All Toggle */}
                  <Toggle
                    pressed={isAllAvailableSelected}
                    onPressedChange={() => {
                      if (!disabled) toggleSelectAllAvailable()
                    }}
                    disabled={disabled}
                    id="select-all-available"
                    size="sm"
                    className="w-full justify-start gap-2 rounded border-b border-muted/50 px-2 py-1.5 text-xs font-semibold text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  >
                    {isAllAvailableSelected ? (
                      <span className="flex size-3.5 items-center justify-center rounded-none border border-primary bg-primary">
                        <Check className="size-2.5 text-primary-foreground" />
                      </span>
                    ) : (
                      <span className="size-3.5 rounded-none border border-input bg-background" />
                    )}
                    Select All Available ({filteredAvailable.length})
                  </Toggle>

                  {/* Individual column badges */}
                  <div className="flex flex-wrap gap-1 p-1">
                    {filteredAvailable.map((col) => {
                      const isSelected = selectedAvailable.includes(col)
                      return (
                        <Badge
                          key={col}
                          asChild
                          variant={isSelected ? "primary-light" : "secondary"}
                          size="default"
                        >
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) return
                              setSelectedAvailable((prev) =>
                                isSelected
                                  ? prev.filter((v) => v !== col)
                                  : [...prev, col]
                              )
                            }}
                          >
                            {col}
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleGrantSelected}
            title="Grant Selected"
            disabled={disabled || selectedAvailable.length === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleGrantAll}
            title="Grant All Filtered"
            disabled={disabled || filteredAvailable.length === 0}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRevokeSelected}
            title="Revoke Selected"
            disabled={disabled || selectedGranted.length === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRevokeAll}
            title="Revoke All"
            disabled={disabled || grantedColumns.length === 0}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Granted Columns */}
        <Card className="flex flex-1 flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-sm uppercase">
              Granted Columns
              <Badge variant="secondary">
                {grantedColumns.length}/{allColumns.length} granted
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <div className="h-[335px] w-full overflow-y-auto border p-1">
              {grantedColumns.length === 0 ? (
                <Empty className="border-0 p-4 py-8">
                  <EmptyHeader className="gap-1">
                    <EmptyDescription className="text-xs">
                      No columns granted
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <div className="space-y-1">
                  {/* Select All Toggle */}
                  <Toggle
                    pressed={isAllGrantedSelected}
                    onPressedChange={() => {
                      if (!disabled) toggleSelectAllGranted()
                    }}
                    disabled={disabled}
                    id="select-all-granted"
                    size="sm"
                    className="w-full justify-start gap-2 rounded border-b border-muted/50 px-2 py-1.5 text-xs font-semibold text-muted-foreground data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                  >
                    {isAllGrantedSelected ? (
                      <span className="flex size-3.5 items-center justify-center rounded-none border border-primary bg-primary">
                        <Check className="size-2.5 text-primary-foreground" />
                      </span>
                    ) : (
                      <span className="size-3.5 rounded-none border border-input bg-background" />
                    )}
                    Select All Granted
                  </Toggle>

                  {/* Individual column badges */}
                  <div className="flex flex-wrap gap-1 p-1">
                    {grantedColumns.map((col) => {
                      const isSelected = selectedGranted.includes(col)
                      return (
                        <Badge
                          key={col}
                          asChild
                          variant={isSelected ? "primary-light" : "outline"}
                          size="default"
                        >
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              if (disabled) return
                              setSelectedGranted((prev) =>
                                isSelected
                                  ? prev.filter((v) => v !== col)
                                  : [...prev, col]
                              )
                            }}
                          >
                            {col}
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
