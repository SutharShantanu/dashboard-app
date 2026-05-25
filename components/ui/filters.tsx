"use client"

import type React from "react"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupText } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  AlertCircleIcon,
  CheckIcon,
  PlusIcon,
  XIcon,
  CalendarIcon,
  ClockIcon,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import {
  format,
  eachMonthOfInterval,
  eachYearOfInterval,
  endOfYear,
  isAfter,
  isBefore,
  startOfYear,
} from "date-fns"
import type { CaptionLabelProps, MonthGridProps, DateRange } from "react-day-picker"
import { Dispatch, SetStateAction, HTMLAttributes } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Separator } from "@/components/ui/separator"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// i18n Configuration Interface
export interface FilterI18nConfig {
  // UI Labels
  addFilter: string
  searchFields: string
  noFieldsFound: string
  noResultsFound: string
  select: string
  true: string
  false: string
  min: string
  max: string
  to: string
  typeAndPressEnter: string
  selected: string
  selectedCount: string
  percent: string
  defaultCurrency: string
  defaultColor: string
  addFilterTitle: string

  // Operators
  operators: {
    is: string
    isNot: string
    isAnyOf: string
    isNotAnyOf: string
    includesAll: string
    excludesAll: string
    before: string
    after: string
    between: string
    notBetween: string
    contains: string
    notContains: string
    startsWith: string
    endsWith: string
    isExactly: string
    equals: string
    notEquals: string
    greaterThan: string
    lessThan: string
    overlaps: string
    includes: string
    excludes: string
    includesAllOf: string
    includesAnyOf: string
    empty: string
    notEmpty: string
  }

  // Placeholders
  placeholders: {
    enterField: (fieldType: string) => string
    selectField: string
    searchField: (fieldName: string) => string
    enterKey: string
    enterValue: string
  }

  // Helper functions
  helpers: {
    formatOperator: (operator: string) => string
  }

  // Validation
  validation: {
    invalidEmail: string
    invalidUrl: string
    invalidTel: string
    invalid: string
  }
}

// Default English i18n configuration
export const DEFAULT_I18N: FilterI18nConfig = {
  // UI Labels
  addFilter: "Filter",
  searchFields: "Filter...",
  noFieldsFound: "No filters found.",
  noResultsFound: "No results found.",
  select: "Select...",
  true: "True",
  false: "False",
  min: "Min",
  max: "Max",
  to: "to",
  typeAndPressEnter: "Type and press Enter to add tag",
  selected: "selected",
  selectedCount: "selected",
  percent: "%",
  defaultCurrency: "$",
  defaultColor: "#000000",
  addFilterTitle: "Add filter",

  // Operators
  operators: {
    is: "is",
    isNot: "is not",
    isAnyOf: "is any of",
    isNotAnyOf: "is not any of",
    includesAll: "includes all",
    excludesAll: "excludes all",
    before: "before",
    after: "after",
    between: "between",
    notBetween: "not between",
    contains: "contains",
    notContains: "does not contain",
    startsWith: "starts with",
    endsWith: "ends with",
    isExactly: "is exactly",
    equals: "equals",
    notEquals: "not equals",
    greaterThan: "greater than",
    lessThan: "less than",
    overlaps: "overlaps",
    includes: "includes",
    excludes: "excludes",
    includesAllOf: "includes all of",
    includesAnyOf: "includes any of",
    empty: "is empty",
    notEmpty: "is not empty",
  },

  // Placeholders
  placeholders: {
    enterField: (fieldType: string) => `Enter ${fieldType}...`,
    selectField: "Select...",
    searchField: (fieldName: string) => `Search ${fieldName.toLowerCase()}...`,
    enterKey: "Enter key...",
    enterValue: "Enter value...",
  },

  // Helper functions
  helpers: {
    formatOperator: (operator: string) => operator.replace(/_/g, " "),
  },

  // Validation
  validation: {
    invalidEmail: "Invalid email format",
    invalidUrl: "Invalid URL format",
    invalidTel: "Invalid phone format",
    invalid: "Invalid input format",
  },
}

// Context for all Filter component props
interface FilterContextValue {
  variant: "solid" | "default"
  size: "sm" | "default" | "lg"
  radius: "default" | "full"
  i18n: FilterI18nConfig
  className?: string
  showSearchInput?: boolean
  trigger?: React.ReactNode
  allowMultiple?: boolean
}

const FilterContext = createContext<FilterContextValue>({
  variant: "default",
  size: "default",
  radius: "default",
  i18n: DEFAULT_I18N,
  className: undefined,
  showSearchInput: true,
  trigger: undefined,
  allowMultiple: true,
})

const useFilterContext = () => useContext(FilterContext)

// Container variant for filters wrapper
const filtersContainerVariants = cva("flex flex-wrap items-center", {
  variants: {
    variant: {
      solid: "gap-2",
      default: "",
    },
    size: {
      sm: "gap-1.5",
      default: "gap-2.5",
      lg: "gap-3.5",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

function FilterInput<T = unknown>({
  field,
  onBlur,
  onKeyDown,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  className?: string
  field?: FilterFieldConfig<T>
}) {
  const context = useFilterContext()
  const [isValid, setIsValid] = useState(true)
  const [validationMessage, setValidationMessage] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (props.autoFocus) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [props.autoFocus])

  // Validation function to check if input matches pattern
  const validateInput = (value: string, pattern?: string): boolean => {
    if (!pattern || !value) return true
    const regex = new RegExp(pattern)
    return regex.test(value)
  }

  // Get validation message for field type
  const getValidationMessage = (): string => {
    return context.i18n.validation.invalid
  }

  // Handle blur event - validate when user leaves input
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value
    const pattern = field?.pattern || props.pattern

    // Only validate if there's a value and (pattern or validation function)
    if (value && (pattern || field?.validation)) {
      let valid = true
      let customMessage = ""

      // If there's a custom validation function, use it
      if (field?.validation) {
        const result = field.validation(value)
        // Handle both boolean and object return types
        if (typeof result === "boolean") {
          valid = result
        } else {
          valid = result.valid
          customMessage = result.message || ""
        }
      } else if (pattern) {
        // Use pattern validation
        valid = validateInput(value, pattern)
      }

      setIsValid(valid)
      setValidationMessage(valid ? "" : customMessage || getValidationMessage())
    } else {
      // Reset validation state for empty values or no validation
      setIsValid(true)
      setValidationMessage("")
    }

    // Call the original onBlur if provided
    onBlur?.(e)
  }

  // Handle keydown event - hide validation error when user starts typing
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Hide validation error when user starts typing (any key except special keys)
    if (
      !isValid &&
      ![
        "Tab",
        "Escape",
        "Enter",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
      ].includes(e.key)
    ) {
      setIsValid(true)
      setValidationMessage("")
    }

    // Call the original onKeyDown if provided
    onKeyDown?.(e)
  }

  return (
    <InputGroup
      className={cn(
        "w-fit",
        context.size == "sm" && "",
        context.size == "default" && "",
        context.size == "lg" && "",
        className
      )}
    >
      {field?.prefix && (
        <InputGroupAddon>
          <InputGroupText>{field.prefix}</InputGroupText>
        </InputGroupAddon>
      )}
      <InputGroupInput
        ref={inputRef}
        aria-invalid={!isValid}
        aria-describedby={
          !isValid && validationMessage
            ? `${field?.key || "input"}-error`
            : undefined
        }
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          context.size == "sm" && "text-xs",
          context.size == "default" && "",
          context.size == "lg" && ""
        )}
        {...props}
      />
      {!isValid && validationMessage && (
        <InputGroupAddon align="inline-end">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <InputGroupButton size="icon-xs">
                  <AlertCircleIcon className="size-3.5 text-destructive" />
                </InputGroupButton>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{validationMessage}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </InputGroupAddon>
      )}

      {field?.suffix && (
        <InputGroupAddon align="inline-end">
          <InputGroupText>{field.suffix}</InputGroupText>
        </InputGroupAddon>
      )}
    </InputGroup>
  )
}

interface FilterRemoveButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode
}

function FilterRemoveButton({
  className,
  icon = <XIcon />,
  ...props
}: FilterRemoveButtonProps) {
  const context = useFilterContext()

  return (
    <Button
      variant="outline"
      size={
        context.size === "sm"
          ? "icon-sm"
          : context.size === "lg"
            ? "icon-lg"
            : "icon"
      }
      {...props}
    >
      {icon}
    </Button>
  )
}

// Generic types for flexible filter system
export interface FilterOption<T = unknown> {
  value: T
  label: string
  icon?: React.ReactNode
  metadata?: Record<string, unknown>
  className?: string
}

export interface FilterOperator {
  value: string
  label: string
  supportsMultiple?: boolean
}

// Custom renderer props interface
export interface CustomRendererProps<T = unknown> {
  field: FilterFieldConfig<T>
  values: T[]
  onChange: (values: T[]) => void
  operator: string
}

// Grouped field configuration interface
export interface FilterFieldGroup<T = unknown> {
  group?: string
  fields: FilterFieldConfig<T>[]
}

// Union type for both flat and grouped field configurations
export type FilterFieldsConfig<T = unknown> =
  | FilterFieldConfig<T>[]
  | FilterFieldGroup<T>[]

export interface FilterFieldConfig<T = unknown> {
  key?: string
  label?: string
  icon?: React.ReactNode
  type?: "select" | "multiselect" | "text" | "custom" | "separator" | "date"
  // Group-level configuration
  group?: string
  fields?: FilterFieldConfig<T>[]
  // Field-specific options
  options?: FilterOption<T>[]
  operators?: FilterOperator[]
  customRenderer?: (props: CustomRendererProps<T>) => React.ReactNode
  customValueRenderer?: (
    values: T[],
    options: FilterOption<T>[]
  ) => React.ReactNode
  placeholder?: string
  searchable?: boolean
  maxSelections?: number
  min?: number
  max?: number
  step?: number
  prefix?: string | React.ReactNode
  suffix?: string | React.ReactNode
  pattern?: string
  validation?: (
    value: unknown
  ) => boolean | { valid: boolean; message?: string }
  allowCustomValues?: boolean
  className?: string
  menuPopupClassName?: string
  // Grouping options (legacy support)
  groupLabel?: string
  // Boolean field options
  onLabel?: string
  offLabel?: string
  // Input event handlers
  onInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  // Default operator to use when creating a filter for this field
  defaultOperator?: string
  // Controlled values support for this field
  value?: T[]
  onValueChange?: (values: T[]) => void
}

// Helper functions to handle both flat and grouped field configurations
const isFieldGroup = <T = unknown,>(
  item: FilterFieldConfig<T> | FilterFieldGroup<T>
): item is FilterFieldGroup<T> => {
  return "fields" in item && Array.isArray(item.fields)
}

// Helper function to check if a FilterFieldConfig is a group-level configuration
const isGroupLevelField = <T = unknown,>(
  field: FilterFieldConfig<T>
): boolean => {
  return Boolean(field.group && field.fields)
}

const flattenFields = <T = unknown,>(
  fields: FilterFieldsConfig<T>
): FilterFieldConfig<T>[] => {
  return fields.reduce<FilterFieldConfig<T>[]>((acc, item) => {
    if (isFieldGroup(item)) {
      return [...acc, ...item.fields]
    }
    // Handle group-level fields (new structure)
    if (isGroupLevelField(item)) {
      return [...acc, ...item.fields!]
    }
    return [...acc, item]
  }, [])
}

const getFieldsMap = <T = unknown,>(
  fields: FilterFieldsConfig<T>
): Record<string, FilterFieldConfig<T>> => {
  const flatFields = flattenFields(fields)
  return flatFields.reduce(
    (acc, field) => {
      // Only add fields that have a key (skip group-level configurations)
      if (field.key) {
        acc[field.key] = field
      }
      return acc
    },
    {} as Record<string, FilterFieldConfig<T>>
  )
}

// Helper function to create operators from i18n config
const createOperatorsFromI18n = (
  i18n: FilterI18nConfig
): Record<string, FilterOperator[]> => ({
  select: [
    { value: "is", label: i18n.operators.is },
    { value: "is_not", label: i18n.operators.isNot },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  multiselect: [
    { value: "is_any_of", label: i18n.operators.isAnyOf },
    { value: "is_not_any_of", label: i18n.operators.isNotAnyOf },
    { value: "includes_all", label: i18n.operators.includesAll },
    { value: "excludes_all", label: i18n.operators.excludesAll },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  text: [
    { value: "contains", label: i18n.operators.contains },
    { value: "not_contains", label: i18n.operators.notContains },
    { value: "starts_with", label: i18n.operators.startsWith },
    { value: "ends_with", label: i18n.operators.endsWith },
    { value: "is", label: i18n.operators.isExactly },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  custom: [
    { value: "is", label: i18n.operators.is },
    { value: "after", label: i18n.operators.after },
    { value: "is", label: i18n.operators.is },
    { value: "between", label: i18n.operators.between },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
  date: [
    { value: "is", label: i18n.operators.is },
    { value: "before", label: i18n.operators.before },
    { value: "after", label: i18n.operators.after },
    { value: "between", label: i18n.operators.between },
    { value: "empty", label: i18n.operators.empty },
    { value: "not_empty", label: i18n.operators.notEmpty },
  ],
})

// Default operators for different field types (using default i18n)
export const DEFAULT_OPERATORS: Record<string, FilterOperator[]> =
  createOperatorsFromI18n(DEFAULT_I18N)

// Helper function to get operators for a field
const getOperatorsForField = <T = unknown,>(
  field: FilterFieldConfig<T>,
  values: T[],
  i18n: FilterI18nConfig
): FilterOperator[] => {
  if (field.operators) return field.operators

  const operators = createOperatorsFromI18n(i18n)

  // Determine field type for operator selection
  let fieldType = field.type || "select"

  // If it's a select field but has multiple values, treat as multiselect
  if (fieldType === "select" && values.length > 1) {
    fieldType = "multiselect"
  }

  // If it's a multiselect field or has multiselect operators, use multiselect operators
  if (fieldType === "multiselect" || field.type === "multiselect") {
    return operators.multiselect
  }

  return operators[fieldType] || operators.select
}

interface FilterOperatorDropdownProps<T = unknown> {
  field: FilterFieldConfig<T>
  operator: string
  values: T[]
  onChange: (operator: string) => void
}

function FilterOperatorDropdown<T = unknown>({
  field,
  operator,
  values,
  onChange,
}: FilterOperatorDropdownProps<T>) {
  const context = useFilterContext()
  const operators = getOperatorsForField(field, values, context.i18n)

  // Find the operator label, with fallback to formatted operator name
  const operatorLabel =
    operators.find((op) => op.value === operator)?.label ||
    context.i18n.helpers.formatOperator(operator)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={context.size}
          className="text-muted-foreground hover:text-foreground"
        >
          {operatorLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((op) => (
          <DropdownMenuItem
            key={op.value}
            onClick={() => onChange(op.value)}
            className={cn(
              "flex items-center justify-between data-highlighted:bg-accent data-highlighted:text-accent-foreground"
            )}
          >
            <span>{op.label}</span>
            <CheckIcon
              className={cn(
                "ms-auto text-primary",
                op.value === operator ? "opacity-100" : "opacity-0"
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface FilterValueSelectorProps<T = unknown> {
  field: FilterFieldConfig<T>
  values: T[]
  onChange: (values: T[]) => void
  operator: string
  autoFocus?: boolean
}

interface SelectOptionsPopoverProps<T = unknown> {
  field: FilterFieldConfig<T>
  values: T[]
  onChange: (values: T[]) => void
  onClose?: () => void
  inline?: boolean
}

function SelectOptionsPopover<T = unknown>({
  field,
  values,
  onChange,
  onClose,
  inline = false,
}: SelectOptionsPopoverProps<T>) {
  const [open, setOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const context = useFilterContext()
  const baseId = useId()

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [searchInput, open])

  useEffect(() => {
    if (highlightedIndex >= 0 && open) {
      const element = document.getElementById(
        `${baseId}-item-${highlightedIndex}`
      )
      element?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, open, baseId])

  const isMultiSelect = field.type === "multiselect" || values.length > 1
  const effectiveValues =
    (field.value !== undefined ? (field.value as T[]) : values) || []

  const selectedOptions =
    field.options?.filter((opt) => effectiveValues.includes(opt.value)) || []
  const unselectedOptions =
    field.options?.filter((opt) => !effectiveValues.includes(opt.value)) || []

  // Filter options based on search input
  const filteredSelectedOptions = selectedOptions // Keep all selected visible
  const filteredUnselectedOptions = unselectedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchInput.toLowerCase())
  )

  const allFilteredOptions = useMemo(
    () => [...filteredSelectedOptions, ...filteredUnselectedOptions],
    [filteredSelectedOptions, filteredUnselectedOptions]
  )

  const handleClose = () => {
    setOpen(false)
    onClose?.()
  }

  const renderMenuContent = () => (
    <>
      {field.searchable !== false && (
        <>
          <Input
            ref={inputRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={true}
            aria-haspopup="listbox"
            aria-controls={`${baseId}-listbox`}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${baseId}-item-${highlightedIndex}`
                : undefined
            }
            placeholder={context.i18n.placeholders.searchField(
              field.label || ""
            )}
            className={cn(
              "h-8 border-0 border-input bg-transparent! px-2 text-sm shadow-none",
              "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                if (allFilteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev < allFilteredOptions.length - 1 ? prev + 1 : 0
                  )
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                if (allFilteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : allFilteredOptions.length - 1
                  )
                }
              } else if (e.key === "ArrowLeft") {
                e.preventDefault()
                setOpen(false)
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault()
                const option = allFilteredOptions[highlightedIndex]
                if (option) {
                  const isSelected = effectiveValues.includes(option.value as T)
                  const next = isSelected
                    ? (effectiveValues.filter((v) => v !== option.value) as T[])
                    : isMultiSelect
                      ? ([...effectiveValues, option.value] as T[])
                      : ([option.value] as T[])

                  if (
                    !isSelected &&
                    isMultiSelect &&
                    field.maxSelections &&
                    next.length > field.maxSelections
                  ) {
                    return
                  }

                  if (field.onValueChange) {
                    field.onValueChange(next)
                  } else {
                    onChange(next)
                  }
                  if (!isMultiSelect) handleClose()
                }
              }
              e.stopPropagation()
            }}
          />
          <DropdownMenuSeparator />
        </>
      )}
      <div className="relative flex max-h-full">
        <div
          className="flex max-h-[min(var(--radix-dropdown-menu-content-available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain"
          role="listbox"
          id={`${baseId}-listbox`}
        >
          <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 **:data-[slot=scroll-area-viewport]:h-full **:data-[slot=scroll-area-viewport]:overscroll-contain">
            {allFilteredOptions.length === 0 && (
              <div className="py-2 text-center text-sm text-muted-foreground">
                {context.i18n.noResultsFound}
              </div>
            )}

            {/* Selected items */}
            {filteredSelectedOptions.length > 0 && (
              <DropdownMenuGroup className="px-1">
                {filteredSelectedOptions.map((option, index) => {
                  const isHighlighted = highlightedIndex === index
                  const itemId = `${baseId}-item-${index}`

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      id={itemId}
                      role="option"
                      aria-selected={isHighlighted}
                      data-highlighted={isHighlighted || undefined}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      checked={true}
                      className={cn(
                        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                        option.className
                      )}
                      onSelect={(e) => {
                        if (isMultiSelect) e.preventDefault()
                      }}
                      onCheckedChange={() => {
                        const next = effectiveValues.filter(
                          (v) => v !== option.value
                        ) as T[]
                        if (field.onValueChange) {
                          field.onValueChange(next)
                        } else {
                          onChange(next)
                        }
                        if (!isMultiSelect) handleClose()
                      }}
                    >
                      {option.icon && option.icon}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuGroup>
            )}

            {/* Separator */}
            {filteredSelectedOptions.length > 0 &&
              filteredUnselectedOptions.length > 0 && (
                <DropdownMenuSeparator className="mx-0" />
              )}

            {/* Available items */}
            {filteredUnselectedOptions.length > 0 && (
              <DropdownMenuGroup className="px-1">
                {filteredUnselectedOptions.map((option, index) => {
                  const overallIndex = index + filteredSelectedOptions.length
                  const isHighlighted = highlightedIndex === overallIndex
                  const itemId = `${baseId}-item-${overallIndex}`

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      id={itemId}
                      role="option"
                      aria-selected={isHighlighted}
                      data-highlighted={isHighlighted || undefined}
                      onMouseEnter={() => setHighlightedIndex(overallIndex)}
                      checked={false}
                      className={cn(
                        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                        option.className
                      )}
                      onSelect={(e) => {
                        if (isMultiSelect) e.preventDefault()
                      }}
                      onCheckedChange={() => {
                        const next = isMultiSelect
                          ? ([...effectiveValues, option.value] as T[])
                          : ([option.value] as T[])

                        if (
                          isMultiSelect &&
                          field.maxSelections &&
                          next.length > field.maxSelections
                        ) {
                          return
                        }

                        if (field.onValueChange) {
                          field.onValueChange(next)
                        } else {
                          onChange(next)
                        }
                        if (!isMultiSelect) handleClose()
                      }}
                    >
                      {option.icon && option.icon}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuGroup>
            )}
          </ScrollArea>
        </div>
      </div>
    </>
  )

  if (inline) {
    return <div className="w-full">{renderMenuContent()}</div>
  }

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(open) => {
        setOpen(open)
        if (!open) {
          setTimeout(() => setSearchInput(""), 200)
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={context.size}>
          <div className="flex items-center gap-1.5">
            {field.customValueRenderer ? (
              field.customValueRenderer(values, field.options || [])
            ) : (
              <>
                {selectedOptions.length > 0 && (
                  <div className="flex items-center -space-x-1.5">
                    {selectedOptions.slice(0, 3).map((option) => (
                      <div key={String(option.value)}>{option.icon}</div>
                    ))}
                  </div>
                )}
                {selectedOptions.length === 1
                  ? selectedOptions[0].label
                  : selectedOptions.length > 1
                    ? `${selectedOptions.length} ${context.i18n.selectedCount}`
                    : context.i18n.select}
              </>
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("w-[200px] px-0", field.className)}
      >
        {renderMenuContent()}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function parse24HourTime(timeStr: string) {
  const t = timeStr || "00:00:00"
  const [hStr, mStr] = t.split(":")
  const hour = parseInt(hStr || "0", 10)
  const minute = parseInt(mStr || "0", 10)
  return { hour, minute }
}

function format24HourTime(hour: number, minute: number) {
  const hStr = String(hour).padStart(2, "0")
  const mStr = String(minute).padStart(2, "0")
  return `${hStr}:${mStr}:00`
}

function MonthGrid({
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
  children: React.ReactNode
  isYearView: boolean
  setIsYearView: Dispatch<SetStateAction<boolean>>
  startDate: Date
  endDate: Date
  years: Date[]
  currentYear: number
  currentMonth: number
  onMonthSelect: (date: Date) => void
  selectedYear: number | null
  setSelectedYear: Dispatch<SetStateAction<number | null>>
}) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isYearView && scrollAreaRef.current) {
      const activeElement = scrollAreaRef.current.querySelector(
        "[data-active='true']"
      ) as HTMLElement | null

      if (activeElement) {
        activeElement.scrollIntoView({ block: "center" })
      }
    }
  }, [isYearView, selectedYear])

  return (
    <div className="relative">
      <table className={className}>{children}</table>
      {isYearView && (
        <div className="bg-background absolute inset-0 z-20 -m-2">
          <div className="h-full" ref={scrollAreaRef}>
            <ScrollArea className="h-full">
              <div className="px-3 pt-1 pb-3">
                {selectedYear === null ? (
                  <div className="grid grid-cols-4 gap-2">
                    {years.map((year) => {
                      const y = year.getFullYear()
                      const isCurrent = y === currentYear
                      return (
                        <Button
                          key={y}
                          variant={isCurrent ? "default" : "outline"}
                          size="sm"
                          className="h-8 rounded-none border border-border"
                          data-active={isCurrent}
                          onClick={() => setSelectedYear(y)}
                        >
                          {y}
                        </Button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 rounded-none"
                        onClick={() => setSelectedYear(null)}
                      >
                        <ChevronDown className="mr-1 size-4 rotate-90" />
                        {selectedYear}
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {eachMonthOfInterval({
                        start: startOfYear(new Date(selectedYear, 0)),
                        end: endOfYear(new Date(selectedYear, 0)),
                      }).map((month) => {
                        const isCurrent =
                          month.getMonth() === currentMonth &&
                          selectedYear === currentYear

                        const isDisabled =
                          isBefore(month, startOfYear(startDate)) ||
                          isAfter(month, endOfYear(endDate))

                        return (
                          <Button
                            key={month.getTime()}
                            variant={isCurrent ? "default" : "outline"}
                            size="sm"
                            className="h-8 rounded-none border border-border"
                            data-active={isCurrent}
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

function CaptionLabel({
  children,
  isYearView,
  setIsYearView,
}: {
  isYearView: boolean
  setIsYearView: Dispatch<SetStateAction<boolean>>
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <Button
      className="data-[state=open]:text-muted-foreground/80 -ms-2 flex items-center gap-2 text-sm font-medium hover:bg-transparent [&[data-state=open]>svg]:rotate-180 rounded-none"
      data-state={isYearView ? "open" : "closed"}
      onClick={() => setIsYearView((prev) => !prev)}
      size="sm"
      variant="ghost"
    >
      {children}
      <ChevronDown aria-hidden="true" className="text-muted-foreground/80 shrink-0 transition-transform duration-200" />
    </Button>
  )
}

function FilterValueSelector<T = unknown>({
  field,
  values,
  onChange,
  operator,
  autoFocus,
}: FilterValueSelectorProps<T>) {
  const context = useFilterContext()
  const dateId = useId()
  const [isYearView, setIsYearView] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [showTimeView, setShowTimeView] = useState(false)
  
  const today = new Date()
  const [month, setMonth] = useState(() => {
    return values[0] ? new Date(String(values[0])) : today
  })

  const startYear = today.getFullYear() - 10
  const endYear = today.getFullYear() + 10
  const startDate = startOfYear(new Date(startYear, 0))
  const endDate = endOfYear(new Date(endYear, 11))

  const years = eachYearOfInterval({
    end: endOfYear(endDate),
    start: startOfYear(startDate),
  })

  if (operator === "empty" || operator === "not_empty") {
    return null
  }

  if (field.customRenderer) {
    return (
      <ButtonGroupText className="bg-background text-start whitespace-nowrap outline-hidden hover:bg-accent aria-expanded:bg-accent dark:bg-input/30">
        {field.customRenderer({ field, values, onChange, operator })}
      </ButtonGroupText>
    )
  }

  if (field.type === "date") {
    const startDateVal = values[0] ? new Date(String(values[0])) : undefined
    const endDateVal = values[1] ? new Date(String(values[1])) : undefined
    const dateRange: DateRange = { from: startDateVal, to: endDateVal }

    const startTime =
      values[0] && String(values[0]).includes("T")
        ? String(values[0]).split("T")[1].slice(0, 8)
        : ""
    const endTime =
      values[1] && String(values[1]).includes("T")
        ? String(values[1]).split("T")[1].slice(0, 8)
        : ""

    const isRangeMode =
      operator === "is" ||
      operator === "is_not" ||
      operator === "between" ||
      operator === "not_between"

    const handleSelectDateRange = (newRange: DateRange | undefined) => {
      if (!newRange) {
        onChange([])
        return
      }
      const fromDate = newRange.from
      const toDate = newRange.to

      const startT = startTime || "00:00:00"
      const endT = endTime || "23:59:59"

      const fromStr = fromDate ? format(fromDate, "yyyy-MM-dd") : ""
      const toStr = toDate ? format(toDate, "yyyy-MM-dd") : ""

      const newValues: T[] = []
      if (fromStr) {
        newValues.push(`${fromStr}T${startT}` as T)
      }
      if (toStr) {
        newValues.push(`${toStr}T${endT}` as T)
      }

      onChange(newValues)

      // Transition to Time view when both dates are selected
      if (fromDate && toDate) {
        setShowTimeView(true)
      }
    }

    const handleSelectSingleDate = (newDate: Date | undefined) => {
      if (!newDate) {
        onChange([])
        return
      }
      const startT = startTime || "00:00:00"
      const dateStr = format(newDate, "yyyy-MM-dd")
      onChange([`${dateStr}T${startT}`] as T[])
      setShowTimeView(true)
    }

    const handleStartTimeChange = (newStart: string) => {
      const activeDate = startDateVal || new Date()
      const dateStr = format(activeDate, "yyyy-MM-dd")
      const startT = newStart || "00:00:00"
      const endT = endTime || "23:59:59"

      if (isRangeMode) {
        const toStr = endDateVal ? format(endDateVal, "yyyy-MM-dd") : ""
        const newValues: T[] = [`${dateStr}T${startT}` as T]
        if (toStr) newValues.push(`${toStr}T${endT}` as T)
        onChange(newValues)
      } else {
        onChange([`${dateStr}T${startT}`] as T[])
      }
    }

    const handleEndTimeChange = (newEnd: string) => {
      const startActiveDate = startDateVal || new Date()
      const endActiveDate = endDateVal || new Date()
      const fromStr = format(startActiveDate, "yyyy-MM-dd")
      const toStr = format(endActiveDate, "yyyy-MM-dd")
      const startT = startTime || "00:00:00"
      const endT = newEnd || "23:59:59"

      onChange([`${fromStr}T${startT}`, `${toStr}T${endT}`] as T[])
    }

    const renderTimePicker = (label: string, timeStr: string, isStart: boolean) => {
      const { hour, minute } = parse24HourTime(timeStr)

      const handleTimePartChange = (part: "hour" | "minute", amount: number) => {
        let nextHour = hour
        let nextMin = minute
        if (part === "hour") {
          nextHour = (hour + amount + 24) % 24
        } else if (part === "minute") {
          nextMin = (minute + amount + 60) % 60
        }
        const nextTimeStr = format24HourTime(nextHour, nextMin)
        if (isStart) {
          handleStartTimeChange(nextTimeStr)
        } else {
          handleEndTimeChange(nextTimeStr)
        }
      }

      return (
        <div className="flex flex-col gap-2 items-center w-full">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">{label}</span>
          <div className="flex items-center gap-2 p-3 bg-accent/25 dark:bg-muted/20 border border-border/80 rounded-none w-full justify-center">
            {/* Hours */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => handleTimePartChange("hour", 1)}
                className="p-0.5 hover:bg-accent rounded-none transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <span className="text-2xl font-mono font-bold px-2.5 py-1 bg-background border border-border/85 rounded-none shadow-xs select-none min-w-[44px] text-center">
                {String(hour).padStart(2, "0")}
              </span>
              <button
                onClick={() => handleTimePartChange("hour", -1)}
                className="p-0.5 hover:bg-accent rounded-none transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            
            <span className="text-xl font-mono select-none -mt-4 font-bold text-muted-foreground/60">:</span>
            
            {/* Minutes */}
            <div className="flex flex-col items-center">
              <button
                onClick={() => handleTimePartChange("minute", 1)}
                className="p-0.5 hover:bg-accent rounded-none transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <span className="text-2xl font-mono font-bold px-2.5 py-1 bg-background border border-border/85 rounded-none shadow-xs select-none min-w-[44px] text-center">
                {String(minute).padStart(2, "0")}
              </span>
              <button
                onClick={() => handleTimePartChange("minute", -1)}
                className="p-0.5 hover:bg-accent rounded-none transition-colors text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <Popover onOpenChange={(open) => {
        if (open) {
          setShowTimeView(false)
        }
      }}>
        <PopoverTrigger asChild>
          <Button
            className="group/pick-date w-fit justify-between text-xs font-medium rounded-none"
            id={dateId}
            variant="outline"
          >
            <span
              className={cn("truncate", !startDateVal && "text-muted-foreground")}
            >
              {startDateVal ? (
                isRangeMode && endDateVal ? (
                  <>
                    {format(startDateVal, "LLL dd, yyyy")} {startTime || "00:00:00"} -{" "}
                    {format(endDateVal, "LLL dd, yyyy")} {endTime || "23:59:59"}
                  </>
                ) : (
                  `${format(startDateVal, "LLL dd, yyyy")} ${startTime || "00:00:00"}`
                )
              ) : (
                isRangeMode ? "Pick a date range" : "Pick a date and time"
              )}
            </span>
            <CalendarIcon
              aria-hidden="true"
              className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80 transition-colors group-hover:text-foreground"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className={cn(
            "z-50 p-4 shadow-md border border-border rounded-none",
            showTimeView ? "w-[280px] sm:w-[320px]" : "w-auto"
          )}
        >
          {showTimeView ? (
            <div className="flex flex-col gap-4 w-full">
              {/* Back to Calendar Header */}
              <div className="flex items-center justify-between border-b pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-none text-xs gap-1 px-2"
                  onClick={() => setShowTimeView(false)}
                >
                  <ChevronDown className="h-4 w-4 rotate-90" />
                  <span>Calendar</span>
                </Button>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider select-none">
                  Select Time
                </span>
              </div>

              {/* Time Pickers Panel */}
              <div className="flex flex-col gap-4 justify-center w-full">
                {isRangeMode ? (
                  <div className="flex gap-4 justify-between w-full">
                    {renderTimePicker("Start Time", startTime, true)}
                    {renderTimePicker("End Time", endTime, false)}
                  </div>
                ) : (
                  <div className="w-[120px] self-center">
                    {renderTimePicker("Time", startTime, true)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Calendar picker with year/month caption selector overrides */
            <div className="flex flex-col gap-3">
              {isRangeMode ? (
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleSelectDateRange as any}
                  classNames={{
                    month_caption: "ms-2.5 justify-start",
                    nav: "flex items-center w-full absolute inset-x-0 justify-end pointer-events-none [&>button]:pointer-events-auto",
                  }}
                  components={{
                    CaptionLabel: (props: any) => (
                      <CaptionLabel
                        isYearView={isYearView}
                        setIsYearView={(val) => {
                          setIsYearView(val)
                          if (!val) setSelectedYear(null)
                        }}
                        {...props}
                      />
                    ),
                    MonthGrid: (props: any) => {
                      return (
                        <MonthGrid
                          className={props.className}
                          currentMonth={month.getMonth()}
                          currentYear={month.getFullYear()}
                          endDate={endDate}
                          isYearView={isYearView}
                          onMonthSelect={(selectedMonth: Date) => {
                            setMonth(selectedMonth)
                            setIsYearView(false)
                            setSelectedYear(null)
                          }}
                          setIsYearView={setIsYearView}
                          startDate={startDate}
                          years={years}
                          selectedYear={selectedYear}
                          setSelectedYear={setSelectedYear}
                        >
                          {props.children}
                        </MonthGrid>
                      )
                    },
                  }}
                  defaultMonth={new Date()}
                  endMonth={endDate}
                  month={month}
                  onMonthChange={setMonth}
                  startMonth={startDate}
                  numberOfMonths={2}
                  className="p-0 border rounded-none bg-card"
                />
              ) : (
                <Calendar
                  mode="single"
                  selected={startDateVal}
                  onSelect={handleSelectSingleDate as any}
                  classNames={{
                    month_caption: "ms-2.5 justify-start",
                    nav: "flex items-center w-full absolute inset-x-0 justify-end pointer-events-none [&>button]:pointer-events-auto",
                  }}
                  components={{
                    CaptionLabel: (props: any) => (
                      <CaptionLabel
                        isYearView={isYearView}
                        setIsYearView={(val) => {
                          setIsYearView(val)
                          if (!val) setSelectedYear(null)
                        }}
                        {...props}
                      />
                    ),
                    MonthGrid: (props: any) => {
                      return (
                        <MonthGrid
                          className={props.className}
                          currentMonth={month.getMonth()}
                          currentYear={month.getFullYear()}
                          endDate={endDate}
                          isYearView={isYearView}
                          onMonthSelect={(selectedMonth: Date) => {
                            setMonth(selectedMonth)
                            setIsYearView(false)
                            setSelectedYear(null)
                          }}
                          setIsYearView={setIsYearView}
                          startDate={startDate}
                          years={years}
                          selectedYear={selectedYear}
                          setSelectedYear={setSelectedYear}
                        >
                          {props.children}
                        </MonthGrid>
                      )
                    },
                  }}
                  defaultMonth={new Date()}
                  endMonth={endDate}
                  month={month}
                  onMonthChange={setMonth}
                  startMonth={startDate}
                  numberOfMonths={2}
                  className="p-0 border rounded-none bg-card"
                />
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    )
  }

  if (field.type === "text") {
    return (
      <FilterInput
        type="text"
        value={(values[0] as string) || ""}
        onChange={(e) => onChange([e.target.value] as T[])}
        placeholder={field.placeholder}
        pattern={field.pattern}
        field={field}
        className={cn("w-36", field.className)}
        autoFocus={autoFocus}
      />
    )
  }

  if (field.type === "select" || field.type === "multiselect") {
    return (
      <SelectOptionsPopover field={field} values={values} onChange={onChange} />
    )
  }

  return (
    <SelectOptionsPopover field={field} values={values} onChange={onChange} />
  )
}

export interface Filter<T = unknown> {
  id: string
  field: string
  operator: string
  values: T[]
}

export function createFilter<T = unknown>(
  field: string,
  operator: string,
  values: T[] = []
): Filter<T> {
  return {
    id: `${field}-${operator}-${Math.random().toString(36).substring(2, 9)}`,
    field,
    operator,
    values,
  }
}

export interface FilterGroup<T = unknown> {
  id: string
  label?: string
  filters: Filter<T>[]
  fields: FilterFieldConfig<T>[]
}

interface FiltersContentProps<T = unknown> {
  filters: Filter<T>[]
  fields: FilterFieldsConfig<T>
  onChange: (filters: Filter<T>[]) => void
}

export const FiltersContent = <T = unknown,>({
  filters,
  fields,
  onChange,
}: FiltersContentProps<T>) => {
  const context = useFilterContext()
  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields])

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((filter) => {
          if (filter.id === filterId) {
            const updatedFilter = { ...filter, ...updates }
            if (
              updates.operator === "empty" ||
              updates.operator === "not_empty"
            ) {
              updatedFilter.values = [] as T[]
            }
            return updatedFilter
          }
          return filter
        })
      )
    },
    [filters, onChange]
  )

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId))
    },
    [filters, onChange]
  )

  return (
    <div
      className={cn(
        filtersContainerVariants({
          variant: context.variant,
          size: context.size,
        }),
        context.className
      )}
    >
      {filters.map((filter) => {
        const field = fieldsMap[filter.field]
        if (!field) return null

        return (
          <ButtonGroup key={filter.id} className="mr-2">
            <ButtonGroupText>
              {field.icon && field.icon}
              {field.label}
            </ButtonGroupText>

            <FilterOperatorDropdown<T>
              field={field}
              operator={filter.operator}
              values={filter.values}
              onChange={(operator) => updateFilter(filter.id, { operator })}
            />

            <FilterValueSelector<T>
              field={field}
              values={filter.values}
              onChange={(values) => updateFilter(filter.id, { values })}
              operator={filter.operator}
              autoFocus={false}
            />

            <FilterRemoveButton onClick={() => removeFilter(filter.id)} />
          </ButtonGroup>
        )
      })}
    </div>
  )
}

interface FiltersProps<T = unknown> {
  filters: Filter<T>[]
  fields: FilterFieldsConfig<T>
  onChange: (filters: Filter<T>[]) => void
  className?: string
  variant?: "solid" | "default"
  size?: "sm" | "default" | "lg"
  radius?: "default" | "full"
  i18n?: Partial<FilterI18nConfig>
  showSearchInput?: boolean
  trigger?: React.ReactNode
  allowMultiple?: boolean
  menuPopupClassName?: string
  collapseAddButton?: boolean
  enableShortcut?: boolean
  shortcutKey?: string
  shortcutLabel?: string
}

interface FilterSubmenuContentProps<T = unknown> {
  field: FilterFieldConfig<T>
  currentValues: T[]
  isMultiSelect: boolean
  onToggle: (value: T, isSelected: boolean) => void
  i18n: FilterI18nConfig
  isActive?: boolean
  onActive?: () => void
  onBack?: () => void
  onClose?: () => void
}

function FilterSubmenuContent<T = unknown>({
  field,
  currentValues,
  isMultiSelect,
  onToggle,
  i18n,
  isActive,
  onActive,
  onBack,
  onClose,
}: FilterSubmenuContentProps<T>) {
  const [searchInput, setSearchInput] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const baseId = useId()

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [searchInput])

  useEffect(() => {
    if (highlightedIndex >= 0 && isActive) {
      const element = document.getElementById(
        `${baseId}-item-${highlightedIndex}`
      )
      element?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, isActive, baseId])

  const filteredOptions = useMemo(() => {
    return (
      field.options?.filter((option) => {
        const isSelected = currentValues.includes(option.value)
        if (isSelected) return true
        if (!searchInput) return true
        return option.label.toLowerCase().includes(searchInput.toLowerCase())
      }) || []
    )
  }, [field.options, searchInput, currentValues])

  useEffect(() => {
    if (isActive && filteredOptions.length > 0) {
      setHighlightedIndex(0)
    }
  }, [isActive, filteredOptions.length])

  return (
    <div className="flex flex-col" onMouseEnter={onActive}>
      {field.searchable !== false && (
        <>
          <Input
            ref={inputRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={true}
            aria-haspopup="listbox"
            aria-controls={`${baseId}-listbox`}
            aria-activedescendant={
              highlightedIndex >= 0
                ? `${baseId}-item-${highlightedIndex}`
                : undefined
            }
            placeholder={i18n.placeholders.searchField(field.label || "")}
            className={cn(
              "border-0 bg-transparent! px-2 text-sm shadow-none",
              "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0"
            )}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                  )
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                  )
                }
              } else if (e.key === "ArrowLeft") {
                e.preventDefault()
                onBack?.()
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault()
                const option = filteredOptions[highlightedIndex]
                if (option) {
                  onToggle(
                    option.value as T,
                    currentValues.includes(option.value)
                  )
                  if (!isMultiSelect) {
                    onBack?.()
                  }
                }
              } else if (e.key === "Escape") {
                e.preventDefault()
                onClose?.()
              }
              e.stopPropagation()
            }}
          />
          <DropdownMenuSeparator />
        </>
      )}
      <div className="relative flex max-h-full">
        <div
          className="flex max-h-[min(var(--radix-dropdown-menu-content-available-height),24rem)] w-full scroll-pt-2 scroll-pb-2 flex-col overscroll-contain outline-hidden"
          role="listbox"
          id={`${baseId}-listbox`}
          tabIndex={field.searchable === false ? 0 : -1}
          onKeyDown={(e) => {
            if (field.searchable === false) {
              if (e.key === "ArrowDown") {
                e.preventDefault()
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                  )
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault()
                if (filteredOptions.length > 0) {
                  setHighlightedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                  )
                }
              } else if (e.key === "ArrowLeft") {
                e.preventDefault()
                onBack?.()
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault()
                const option = filteredOptions[highlightedIndex]
                if (option) {
                  onToggle(
                    option.value as T,
                    currentValues.includes(option.value)
                  )
                  if (!isMultiSelect) {
                    onBack?.()
                  }
                }
              } else if (e.key === "Escape") {
                e.preventDefault()
                onClose?.()
              }
              e.stopPropagation()
            }
          }}
        >
          <ScrollArea className="size-full min-h-0 **:data-[slot=scroll-area-scrollbar]:m-0 **:data-[slot=scroll-area-viewport]:h-full **:data-[slot=scroll-area-viewport]:overscroll-contain">
            {filteredOptions.length === 0 ? (
              <div className="py-2 text-center text-sm text-muted-foreground">
                {i18n.noResultsFound}
              </div>
            ) : (
              <DropdownMenuGroup>
                {filteredOptions.map((option, index) => {
                  const isSelected = currentValues.includes(option.value)
                  const isHighlighted = highlightedIndex === index
                  const itemId = `${baseId}-item-${index}`

                  return (
                    <DropdownMenuCheckboxItem
                      key={String(option.value)}
                      id={itemId}
                      role="option"
                      aria-selected={isHighlighted}
                      data-highlighted={isHighlighted || undefined}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      checked={isSelected}
                      className={cn(
                        "data-highlighted:bg-accent data-highlighted:text-accent-foreground",
                        option.className
                      )}
                      onSelect={(e) => {
                        if (isMultiSelect) e.preventDefault()
                      }}
                      onCheckedChange={() =>
                        onToggle(option.value as T, isSelected)
                      }
                    >
                      {option.icon && option.icon}
                      <span className="truncate">{option.label}</span>
                    </DropdownMenuCheckboxItem>
                  )
                })}
              </DropdownMenuGroup>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}

export function Filters<T = unknown>({
  filters,
  fields,
  onChange,
  className,
  variant = "default",
  size = "default",
  radius = "default",
  i18n,
  showSearchInput = true,
  trigger,
  allowMultiple = true,
  menuPopupClassName,
  enableShortcut = false,
  shortcutKey = "f",
  shortcutLabel = "F",
}: FiltersProps<T>) {
  const [addFilterOpen, setAddFilterOpen] = useState(false)
  const [menuSearchInput, setMenuSearchInput] = useState("")
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [lastAddedFilterId, setLastAddedFilterId] = useState<string | null>(
    null
  )
  const rootInputRef = useRef<HTMLInputElement>(null)
  const rootId = useId()

  useEffect(() => {
    if (!enableShortcut) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === shortcutKey.toLowerCase() &&
        !addFilterOpen &&
        !(
          document.activeElement instanceof HTMLInputElement ||
          document.activeElement instanceof HTMLTextAreaElement
        )
      ) {
        e.preventDefault()
        setAddFilterOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [enableShortcut, shortcutKey, addFilterOpen])

  useEffect(() => {
    setHighlightedIndex(-1)
  }, [menuSearchInput])

  useEffect(() => {
    if (highlightedIndex >= 0 && addFilterOpen) {
      const element = document.getElementById(
        `${rootId}-item-${highlightedIndex}`
      )
      element?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, addFilterOpen, rootId])

  useEffect(() => {
    if (!addFilterOpen) {
      setOpenSubMenu(null)
    }
  }, [addFilterOpen])

  // Track which filter instance is being built in the current Add Filter menu session
  // Maps fieldKey -> unique filterId created during this open session
  const [sessionFilterIds, setSessionFilterIds] = useState<
    Record<string, string>
  >({})

  useEffect(() => {
    if (lastAddedFilterId) {
      const timer = setTimeout(() => {
        setLastAddedFilterId(null)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [lastAddedFilterId])

  const mergedI18n: FilterI18nConfig = {
    ...DEFAULT_I18N,
    ...i18n,
    operators: { ...DEFAULT_I18N.operators, ...i18n?.operators },
    placeholders: { ...DEFAULT_I18N.placeholders, ...i18n?.placeholders },
    validation: { ...DEFAULT_I18N.validation, ...i18n?.validation },
  }

  const fieldsMap = useMemo(() => getFieldsMap(fields), [fields])

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((filter) => {
          if (filter.id === filterId) {
            const updatedFilter = { ...filter, ...updates }
            if (
              updates.operator === "empty" ||
              updates.operator === "not_empty"
            ) {
              updatedFilter.values = [] as T[]
            }
            return updatedFilter
          }
          return filter
        })
      )
    },
    [filters, onChange]
  )

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((filter) => filter.id !== filterId))
    },
    [filters, onChange]
  )

  const addFilter = useCallback(
    (fieldKey: string) => {
      const field = fieldsMap[fieldKey]
      if (field && field.key) {
        const defaultOperator =
          field.defaultOperator ||
          (field.type === "multiselect" ? "is_any_of" : "is")
        const defaultValues: unknown[] = field.type === "text" ? [""] : []
        const newFilter = createFilter<T>(
          fieldKey,
          defaultOperator,
          defaultValues as T[]
        )
        setLastAddedFilterId(newFilter.id)
        onChange([...filters, newFilter])
        setAddFilterOpen(false)
        setMenuSearchInput("")
      }
    },
    [fieldsMap, filters, onChange]
  )

  const selectableFields = useMemo(() => {
    const flatFields = flattenFields(fields)
    return flatFields.filter((field) => {
      if (!field.key || field.type === "separator") return false
      if (allowMultiple) return true
      return !filters.some((filter) => filter.field === field.key)
    })
  }, [fields, filters, allowMultiple])

  const filteredFields = useMemo(() => {
    return selectableFields.filter(
      (f) =>
        !menuSearchInput ||
        f.label?.toLowerCase().includes(menuSearchInput.toLowerCase())
    )
  }, [selectableFields, menuSearchInput])

  const handleToggleValue = (fieldKey: string, value: any) => {
    const existing = filters.find((f) => f.field === fieldKey)
    if (existing) {
      const field = fieldsMap[fieldKey]
      const isMulti = field?.type === "multiselect"
      const isSelected = existing.values.includes(value)

      let nextValues = [...existing.values]
      if (isSelected) {
        nextValues = nextValues.filter((v) => v !== value)
      } else {
        if (isMulti) {
          nextValues.push(value)
        } else {
          nextValues = [value]
        }
      }

      if (nextValues.length === 0) {
        removeFilter(existing.id)
      } else {
        updateFilter(existing.id, { values: nextValues as T[] })
      }
    } else {
      const field = fieldsMap[fieldKey]
      if (field) {
        const defaultOperator =
          field.defaultOperator ||
          (field.type === "multiselect" ? "is_any_of" : "is")
        const newFilter = createFilter<T>(fieldKey, defaultOperator, [
          value,
        ] as T[])
        onChange([...filters, newFilter])
      }
    }
  }

  useEffect(() => {
    if (addFilterOpen && filteredFields.length > 0) {
      setHighlightedIndex(0)
    }
  }, [addFilterOpen, filteredFields.length])

  return (
    <FilterContext.Provider
      value={{
        variant,
        size,
        radius,
        i18n: mergedI18n,
        className,
        trigger,
        allowMultiple,
      }}
    >
      <div
        className={cn(filtersContainerVariants({ variant, size }), className)}
      >
        {selectableFields.length > 0 && (
          <DropdownMenu
            open={addFilterOpen}
            onOpenChange={(open) => {
              setAddFilterOpen(open)
              if (!open) {
                setMenuSearchInput("")
                setSessionFilterIds({})
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              {trigger || (
                <Button variant="outline" size={size}>
                  <PlusIcon className="h-4 w-4" />
                  {mergedI18n.addFilter}
                </Button>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className={cn("w-[220px]", menuPopupClassName)}
              align="start"
            >
              {showSearchInput && (
                <>
                  <div className="relative">
                    <Input
                      ref={rootInputRef}
                      role="combobox"
                      placeholder={mergedI18n.searchFields}
                      className={cn(
                        "border-0 bg-transparent! px-2 text-sm shadow-none",
                        "focus-visible:border-border focus-visible:ring-0 focus-visible:ring-offset-0"
                      )}
                      value={menuSearchInput}
                      onChange={(e) => setMenuSearchInput(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuGroup>
                {filteredFields.map((field) => {
                  const hasSubMenu =
                    field.type === "select" || field.type === "multiselect"
                  const existingFilter = filters.find(
                    (f) => f.field === field.key
                  )
                  const currentValues = existingFilter?.values || []

                  if (hasSubMenu) {
                    return (
                      <DropdownMenuSub
                        key={field.key}
                        open={openSubMenu === field.key}
                        onOpenChange={(open) =>
                          setOpenSubMenu(open ? field.key! : null)
                        }
                      >
                        <DropdownMenuSubTrigger className="gap-1.5 text-xs">
                          {field.icon && field.icon}
                          <span>{field.label}</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-fit p-0">
                          <FilterSubmenuContent
                            field={field}
                            currentValues={currentValues}
                            isMultiSelect={field.type === "multiselect"}
                            onToggle={(val) =>
                              handleToggleValue(field.key!, val)
                            }
                            i18n={mergedI18n}
                            isActive={openSubMenu === field.key}
                            onClose={() => setAddFilterOpen(false)}
                          />
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )
                  }

                  return (
                    <DropdownMenuItem
                      key={field.key}
                      onClick={() => addFilter(field.key!)}
                      className="gap-1.5 text-xs"
                    >
                      {field.icon && field.icon}
                      <span>{field.label}</span>
                    </DropdownMenuItem>
                  )
                })}
                {filteredFields.length === 0 && (
                  <div className="py-2 text-center text-xs text-muted-foreground">
                    {mergedI18n.noFieldsFound}
                  </div>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <FiltersContent filters={filters} fields={fields} onChange={onChange} />
      </div>
    </FilterContext.Provider>
  )
}
