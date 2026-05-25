import { format, isValid } from "date-fns"

/**
 * Standard format strings for date-fns to ensure project-wide consistency
 */
export const DATE_FORMATS = {
  dateTime: "dd/MM/yyyy hh:mm a", // e.g. 25/05/2026 09:28 PM
  dateOnly: "dd/MM/yyyy",         // e.g. 25/05/2026
  timeOnly: "hh:mm a",           // e.g. 09:28 PM
  prettyDate: "LLL dd, yyyy",     // e.g. May 25, 2026
}

/**
 * Safely parses any date input (Date object, string, or timestamp) into a valid Date object,
 * or returns null if invalid or empty.
 */
export function toSafeDate(value: Date | string | number | undefined | null): Date | null {
  if (!value) return null
  const d = new Date(value)
  return isValid(d) ? d : null
}

/**
 * Formats a date-time to the standard project format: dd/MM/yyyy hh:mm a
 * Fallback to default string or placeholder if invalid.
 */
export function formatDateTime(
  value: Date | string | number | undefined | null,
  fallback = "—"
): string {
  const date = toSafeDate(value)
  if (!date) return fallback
  return format(date, DATE_FORMATS.dateTime)
}

/**
 * Formats a date to the standard project format: dd/MM/yyyy
 */
export function formatDate(
  value: Date | string | number | undefined | null,
  fallback = "—"
): string {
  const date = toSafeDate(value)
  if (!date) return fallback
  return format(date, DATE_FORMATS.dateOnly)
}

/**
 * Formats a time to the standard project format: hh:mm a
 */
export function formatTime(
  value: Date | string | number | undefined | null,
  fallback = "—"
): string {
  const date = toSafeDate(value)
  if (!date) return fallback
  return format(date, DATE_FORMATS.timeOnly)
}

/**
 * Formats a date range into: dd/MM/yyyy - dd/MM/yyyy
 */
export function formatDateRange(
  from: Date | string | number | undefined | null,
  to: Date | string | number | undefined | null,
  fallback = "—"
): string {
  const fromDate = toSafeDate(from)
  const toDate = toSafeDate(to)

  if (!fromDate && !toDate) return fallback
  if (fromDate && !toDate) return formatDate(fromDate)
  if (!fromDate && toDate) return formatDate(toDate)

  return `${formatDate(fromDate)} - ${formatDate(toDate)}`
}

/**
 * Formats a date-time range into: dd/MM/yyyy hh:mm a - dd/MM/yyyy hh:mm a
 */
export function formatDateTimeRange(
  from: Date | string | number | undefined | null,
  to: Date | string | number | undefined | null,
  fallback = "—"
): string {
  const fromDate = toSafeDate(from)
  const toDate = toSafeDate(to)

  if (!fromDate && !toDate) return fallback
  if (fromDate && !toDate) return formatDateTime(fromDate)
  if (!fromDate && toDate) return formatDateTime(toDate)

  return `${formatDateTime(fromDate)} - ${formatDateTime(toDate)}`
}

/**
 * Reusable React cell renderer for any date/datetime value.
 *
 * Usage in a TanStack Table column definition:
 *   cell: ({ row }) => <DateCell value={row.original.createdAt} />
 *   cell: ({ row }) => <DateCell value={row.getValue("timestamp")} />
 *
 * Renders:  25/05/2026 09:28 PM
 * Falls back to "—" for missing/invalid dates.
 */
export function DateCell({
  value,
  fallback = "—",
}: {
  value: Date | string | number | undefined | null
  fallback?: string
}) {
  return (
    <span className="font-mono text-xs whitespace-nowrap text-muted-foreground">
      {formatDateTime(value, fallback)}
    </span>
  )
}
