import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
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

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
import { useDebounce } from "@/hooks/use-debounce"
import { Empty, EmptyHeader, EmptyDescription } from "@/components/ui/empty"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"

// Define Zod validation schema for checkbox selection state
const selectionSchema = z.object({
  selectedAvailable: z.array(z.string()),
  selectedGranted: z.array(z.string()),
})

type SelectionFormValues = z.infer<typeof selectionSchema>

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
  const [currentPermissions, setCurrentPermissions] =
    React.useState<Record<string, string[]>>(value)

  // React Hook Form for checkbox selections using Zod schema
  const { control, setValue, watch, reset } = useForm<SelectionFormValues>({
    resolver: zodResolver(selectionSchema),
    defaultValues: {
      selectedAvailable: [],
      selectedGranted: [],
    },
  })

  const selectedAvailable = watch("selectedAvailable") || []
  const selectedGranted = watch("selectedGranted") || []

  // Sync state with prop value
  const valueString = JSON.stringify(value)
  React.useEffect(() => {
    setCurrentPermissions(value)
  }, [valueString])

  const selectedSheet =
    propSelectedSheet !== undefined ? propSelectedSheet : internalSelectedSheet
  const setSelectedSheet =
    onSheetChange !== undefined ? onSheetChange : setInternalSelectedSheet

  // Reset selections when sheet changes to avoid dangling state
  React.useEffect(() => {
    reset({
      selectedAvailable: [],
      selectedGranted: [],
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSheet])

  const currentSheet = sheets.find((s) => s.id === selectedSheet)
  const allColumns = (currentSheet?.columns || []).filter((col) => col && col.trim() !== "")
  const grantedColumns = (currentPermissions[selectedSheet] || []).filter((col) => col && col.trim() !== "")
  const availableColumns = allColumns.filter(
    (col) => !grantedColumns.includes(col)
  )

  const filteredAvailable = availableColumns.filter((col) =>
    col.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  )

  // Select all toggles
  const isAllAvailableSelected =
    filteredAvailable.length > 0 &&
    filteredAvailable.every((col) => selectedAvailable.includes(col))

  const isAllGrantedSelected =
    grantedColumns.length > 0 &&
    grantedColumns.every((col) => selectedGranted.includes(col))

  const toggleSelectAllAvailable = () => {
    if (isAllAvailableSelected) {
      setValue(
        "selectedAvailable",
        selectedAvailable.filter((col) => !filteredAvailable.includes(col))
      )
    } else {
      const merged = Array.from(
        new Set([...selectedAvailable, ...filteredAvailable])
      )
      setValue("selectedAvailable", merged)
    }
  }

  const toggleSelectAllGranted = () => {
    if (isAllGrantedSelected) {
      setValue(
        "selectedGranted",
        selectedGranted.filter((col) => !grantedColumns.includes(col))
      )
    } else {
      const merged = Array.from(
        new Set([...selectedGranted, ...grantedColumns])
      )
      setValue("selectedGranted", merged)
    }
  }

  // Grant / Revoke Actions
  const handleGrantSelected = () => {
    if (selectedAvailable.length === 0) return
    const nextGranted = [...grantedColumns, ...selectedAvailable]
    // Keep order of columns as in the original sheet
    const sortedGranted = allColumns.filter((c) => nextGranted.includes(c))
    const updated = {
      ...currentPermissions,
      [selectedSheet]: sortedGranted,
    }
    setCurrentPermissions(updated)
    onChange(updated)
    setValue("selectedAvailable", [])
  }

  const handleRevokeSelected = () => {
    if (selectedGranted.length === 0) return
    const nextGranted = grantedColumns.filter(
      (c) => !selectedGranted.includes(c)
    )
    const updated = {
      ...currentPermissions,
      [selectedSheet]: nextGranted,
    }
    setCurrentPermissions(updated)
    onChange(updated)
    setValue("selectedGranted", [])
  }

  const handleGrantAll = () => {
    const nextGranted = [...grantedColumns, ...filteredAvailable]
    const sortedGranted = allColumns.filter((c) => nextGranted.includes(c))
    const updated = {
      ...currentPermissions,
      [selectedSheet]: sortedGranted,
    }
    setCurrentPermissions(updated)
    onChange(updated)
    setValue("selectedAvailable", [])
  }

  const handleRevokeAll = () => {
    const updated = {
      ...currentPermissions,
      [selectedSheet]: [],
    }
    setCurrentPermissions(updated)
    onChange(updated)
    setValue("selectedGranted", [])
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
        <Card className="flex min-w-[220px] flex-1 flex-col justify-between border bg-card shadow-sm">
          <CardHeader className="shrink-0 space-y-2 p-3 pb-2">
            <CardTitle className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
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
          <CardContent className="flex flex-1 flex-col p-3 pt-0">
            <Controller
              name="selectedAvailable"
              control={control}
              render={({ field }) => (
                <div className="max-h-[300px] w-full flex-1 overflow-y-auto border p-1">
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
                      {/* Select All Row */}
                      <div className="flex items-center gap-2 rounded border-b border-muted/50 px-2 py-1.5 text-xs">
                        <Checkbox
                          checked={isAllAvailableSelected}
                          onCheckedChange={() =>
                            !disabled && toggleSelectAllAvailable()
                          }
                          disabled={disabled}
                          id="select-all-available"
                        />
                        <Label
                          htmlFor="select-all-available"
                          className="text-tiny cursor-pointer font-semibold text-muted-foreground select-none"
                        >
                          Select All Available ({filteredAvailable.length})
                        </Label>
                      </div>

                      {filteredAvailable.map((col) => {
                        const isChecked = field.value.includes(col)
                        const handleToggle = () => {
                          if (disabled) return
                          const newValue = isChecked
                            ? field.value.filter((val) => val !== col)
                            : [...field.value, col]
                          field.onChange(newValue)
                        }
                        return (
                          <Field
                            key={col}
                            orientation="horizontal"
                            className={`flex items-center gap-2 rounded border border-transparent px-2 py-1 text-xs transition-all duration-200 ${
                              isChecked
                                ? "border-primary/10 bg-primary/5 shadow-sm"
                                : disabled
                                  ? "opacity-80"
                                  : "cursor-pointer hover:bg-accent/50"
                            }`}
                            onClick={handleToggle}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={handleToggle}
                              disabled={disabled}
                              id={`avail-${col}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <FieldLabel
                              htmlFor={`avail-${col}`}
                              className="text-tiny flex-1 cursor-pointer font-normal text-foreground select-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {col}
                            </FieldLabel>
                          </Field>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="flex w-12 shrink-0 flex-col items-center justify-center gap-2">
          {/* Grant Selected */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleGrantSelected}
            title="Grant Selected"
            disabled={disabled || selectedAvailable.length === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Grant All */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleGrantAll}
            title="Grant All Filtered"
            disabled={disabled || filteredAvailable.length === 0}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>

          {/* Revoke Selected */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRevokeSelected}
            title="Revoke Selected"
            disabled={disabled || selectedGranted.length === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Revoke All */}
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
            <Controller
              name="selectedGranted"
              control={control}
              render={({ field }) => (
                <div className="max-h-[300px] w-full flex-1 overflow-y-auto border p-1">
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
                      {/* Select All Row */}
                      <div className="flex items-center gap-2 rounded border-b border-muted/50 px-2 py-1.5 text-xs">
                        <Checkbox
                          checked={isAllGrantedSelected}
                          onCheckedChange={() =>
                            !disabled && toggleSelectAllGranted()
                          }
                          disabled={disabled}
                          id="select-all-granted"
                        />
                        <Label
                          htmlFor="select-all-granted"
                          className="text-tiny cursor-pointer font-semibold text-muted-foreground select-none"
                        >
                          Select All Granted
                        </Label>
                      </div>

                      {grantedColumns.map((col) => {
                        const isChecked = field.value.includes(col)
                        const handleToggle = () => {
                          if (disabled) return
                          const newValue = isChecked
                            ? field.value.filter((val) => val !== col)
                            : [...field.value, col]
                          field.onChange(newValue)
                        }
                        return (
                          <Field
                            key={col}
                            orientation="horizontal"
                            className={`flex items-center gap-2 rounded border border-transparent px-2 py-1 text-xs transition-all duration-200 ${
                              isChecked
                                ? "border-primary/10 bg-primary/5 shadow-sm"
                                : disabled
                                  ? "opacity-80"
                                  : "cursor-pointer hover:bg-accent/50"
                            }`}
                            onClick={handleToggle}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={handleToggle}
                              disabled={disabled}
                              id={`grant-${col}`}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <FieldLabel
                              htmlFor={`grant-${col}`}
                              className="text-tiny flex-1 cursor-pointer font-normal text-muted-foreground select-none"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {col}
                            </FieldLabel>
                          </Field>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
