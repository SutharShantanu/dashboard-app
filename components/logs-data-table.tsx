"use client"

import { useMemo, useState, useEffect } from "react"
import { formatDateTime } from "@/lib/date"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ExportDropdown } from "@/components/export-dropdown"
import { getAvatarUrl } from "@/lib/utils"
import {
  DataTable,
  DataTableColumnFilter,
  DataTableFilterOption,
} from "@/components/ui/data-table"

import { Monitor, Smartphone, Tablet, MapPin, Globe } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LogEntry {
  timestamp: string | Date
  action: string
  details: string
  ip?: string
  userAgent?: string
  actor?: string
  actorDisplayName?: string
  actorRole?: string
}

interface LogsDataTableProps {
  logs: LogEntry[]
}

// Parses "Signed in via X · Browser: Y · OS: Z · Device: W · Location: L · IP: P"

// Parses "Signed in via X · Browser: Y · OS: Z · Device: W · Location: L · IP: P"
function parseLoginDetails(details: string) {
  const parts = details.split(" · ")
  const get = (prefix: string) =>
    parts
      .find((p) => p.startsWith(prefix))
      ?.slice(prefix.length)
      .trim() ?? null
  return {
    method: parts[0] ?? null,
    browser: get("Browser:"),
    os: get("OS:"),
    device: get("Device:"),
    location: get("Location:"),
    ip: get("IP:"),
  }
}

function DeviceIcon({ device }: { device: string | null }) {
  const d = (device ?? "").toLowerCase()
  if (d.includes("mobile"))
    return <Smartphone className="h-3.5 w-3.5 shrink-0" />
  if (d.includes("tablet")) return <Tablet className="h-3.5 w-3.5 shrink-0" />
  return <Monitor className="h-3.5 w-3.5 shrink-0" />
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LogsDataTable({ logs }: LogsDataTableProps) {
  const [userGenderMap, setUserGenderMap] = useState<Record<string, string>>({})

  useEffect(() => {
    let active = true
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (active && data?.users) {
          const mapping: Record<string, string> = {}
          data.users.forEach((u: any) => {
            if (u.username) mapping[u.username.toLowerCase()] = u.gender || ""
            if (u.email) mapping[u.email.toLowerCase()] = u.gender || ""
          })
          setUserGenderMap(mapping)
        }
      })
      .catch((err) => console.error("Failed to load user genders in logs:", err))
    return () => {
      active = false
    }
  }, [])

  const columns = useMemo<ColumnDef<LogEntry>[]>(() => [
    {
      accessorKey: "timestamp",
      header: "Timestamp",
      cell: ({ row }) => (
        <span className="text-xs whitespace-nowrap ">
          {formatDateTime(row.getValue("timestamp"))}
        </span>
      ),
    },
    {
      id: "user",
      header: "User",
      accessorFn: (row) => row.actorDisplayName || row.actor || "",
      cell: ({ row }) => {
        const display = row.getValue<string>("user") || "—"
        const email = row.original.actor || ""
        const role = row.original.actorRole || ""
        const initials = display
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase()
        
        const actorKey = (email || display || "").toLowerCase()
        const userGender = userGenderMap[actorKey] || userGenderMap[display.toLowerCase()] || ""
        const avatarUrl = getAvatarUrl(email || display, role, userGender)

        const displayRole = (display.toLowerCase().includes("saba") || email.toLowerCase().includes("saba"))
          ? "Master Admin"
          : role

        return (
          <div className="flex min-w-[150px] items-center gap-2.5">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl} alt={display} />
              <AvatarFallback>{initials || "U"}</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-xs leading-tight">
              <span className="truncate font-medium text-foreground">{display}</span>
              {displayRole && (
                <span className="truncate text-tiny text-muted-foreground capitalize">
                  {displayRole}
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      id: "email",
      accessorKey: "actor",
      header: "Email",
      cell: ({ row }) => {
        const email = row.original.actor || ""
        const isEmail = email.includes("@")
        return isEmail ? (
          <span className="text-xs  break-all">
            {email}
          </span>
        ) : (
          <span className="text-xs /50">—</span>
        )
      },
    },
    {
      accessorKey: "action",
      header: "Action",
      filterFn: "equals",
      cell: ({ row }) => {
        const action = String(row.original.action || "").toLowerCase()
        let variant:
          | "secondary"
          | "destructive-light"
          | "warning-light"
          | "success-light" = "warning-light"

        if (action.includes("delete") || action.includes("remove")) {
          variant = "destructive-light"
        } else if (
          action.includes("success") ||
          action.includes("add") ||
          action.includes("create") ||
          action.includes("save") ||
          action.includes("sync") ||
          action.includes("login")
        ) {
          variant = "success-light"
        }

        return (
          <Badge
            variant={variant}
            className="uppercase"
          >
            {row.original.action || "unknown"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "details",
      header: "Details",
      cell: ({ row }) => {
        const details: string = row.getValue("details") ?? ""
        const action: string = row.original.action

        if (action === "LOGIN" && details.includes(" · ")) {
          const p = parseLoginDetails(details)
          return (
              <div className="flex min-w-[200px] flex-col gap-1 text-xs">
                <span className="font-medium text-foreground">{p.method}</span>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 ">
                  {(p.browser || p.os || p.device) && (
                    <span className="flex items-center gap-1">
                      <DeviceIcon device={p.device} />
                      {[p.browser, p.os].filter(Boolean).join(" / ")}
                    </span>
                  )}

                  {p.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {p.location}
                    </span>
                  )}

                  {!p.location && (p.ip ?? row.original.ip) && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3 shrink-0" />
                      {p.ip ?? row.original.ip}
                    </span>
                  )}
                </div>
              </div>
          )
        }

        return (
          <span className="block max-w-[420px] text-xs ">
            {details || "—"}
          </span>
        )
      },
    },
    {
      id: "ip",
      accessorKey: "ip",
      header: "IP",
      cell: ({ row }) => {
        // Already shown in the Details cell for rich LOGIN entries
        if (
          row.original.action === "LOGIN" &&
          row.original.details?.includes(" · ")
        )
          return null
        const ip: string = row.getValue("ip") ?? ""
        return ip ? (
          <span className="font-mono text-xs whitespace-nowrap ">
            {ip}
          </span>
        ) : null
      },
    },
    {
      id: "browser",
      header: "Browser",
      accessorFn: (row) => parseLoginDetails(row.details).browser || "",
      cell: ({ row }) => {
        const browser = parseLoginDetails(row.original.details).browser
        return browser ? <span className="text-xs">{browser}</span> : <span className="text-xs text-muted-foreground/50">—</span>
      },
    },
    {
      id: "os",
      header: "OS",
      accessorFn: (row) => parseLoginDetails(row.details).os || "",
      cell: ({ row }) => {
        const os = parseLoginDetails(row.original.details).os
        return os ? <span className="text-xs">{os}</span> : <span className="text-xs text-muted-foreground/50">—</span>
      },
    },
    {
      id: "device",
      header: "Device",
      accessorFn: (row) => parseLoginDetails(row.details).device || "",
      cell: ({ row }) => {
        const device = parseLoginDetails(row.original.details).device
        return device ? <span className="text-xs">{device}</span> : <span className="text-xs text-muted-foreground/50">—</span>
      },
    },
  ], [userGenderMap])
  // Build "All Actions" + unique action options for the filter dropdown
  const actionFilterOptions = useMemo<DataTableFilterOption[]>(() => {
    const unique = Array.from(
      new Set(logs.map((l) => l.action).filter(Boolean))
    ).sort()
    return [
      { label: "All Actions", value: "ALL" },
      ...unique.map((a) => ({ label: a, value: a })),
    ]
  }, [logs])

  // Build unique user options for the filter dropdown
  const userFilterOptions = useMemo<DataTableFilterOption[]>(() => {
    const unique = Array.from(
      new Set(logs.map((l) => l.actorDisplayName || l.actor).filter((x): x is string => !!x))
    ).sort()
    return unique.map((u) => {
      const matchingLog = logs.find((l) => (l.actorDisplayName || l.actor) === u)
      const email = matchingLog?.actor || ""
      const role = matchingLog?.actorRole || ""
      const actorKey = (email || u || "").toLowerCase()
      const userGender = userGenderMap[actorKey] || userGenderMap[u.toLowerCase()] || ""
      const avatarUrl = getAvatarUrl(email || u, role, userGender)
      const initials = u
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
      return {
        label: u as string,
        value: u as string,
        icon: (
          <Avatar className="h-4.5 w-4.5 shrink-0 border border-muted/20">
            <AvatarImage src={avatarUrl} alt={u} />
            <AvatarFallback className="text-[9px]">{initials || "U"}</AvatarFallback>
          </Avatar>
        ),
      }
    })
  }, [logs, userGenderMap])

  // Build unique email options for the filter dropdown
  const emailFilterOptions = useMemo<DataTableFilterOption[]>(() => {
    const unique = Array.from(
      new Set(logs.map((l) => l.actor).filter((x): x is string => !!x))
    ).sort()
    return unique.map((e) => {
      const matchingLog = logs.find((l) => l.actor === e)
      const role = matchingLog?.actorRole || ""
      const actorKey = (e || "").toLowerCase()
      const userGender = userGenderMap[actorKey] || ""
      const avatarUrl = getAvatarUrl(e, role, userGender)
      const initials = e.split("@")[0].slice(0, 2).toUpperCase()
      return {
        label: e as string,
        value: e as string,
        icon: (
          <Avatar className="h-4.5 w-4.5 shrink-0 border border-muted/20">
            <AvatarImage src={avatarUrl} alt={e} />
            <AvatarFallback className="text-[9px]">{initials || "E"}</AvatarFallback>
          </Avatar>
        ),
      }
    })
  }, [logs, userGenderMap])

  // Build unique browser options for the filter dropdown
  const browserFilterOptions = useMemo<DataTableFilterOption[]>(() => {
    const unique = Array.from(
      new Set(logs.map((l) => parseLoginDetails(l.details).browser).filter(Boolean))
    ).sort()
    return unique.map((b) => ({ label: b as string, value: b as string }))
  }, [logs])

  // Build unique OS options for the filter dropdown
  const osFilterOptions = useMemo<DataTableFilterOption[]>(() => {
    const unique = Array.from(
      new Set(logs.map((l) => parseLoginDetails(l.details).os).filter(Boolean))
    ).sort()
    return unique.map((o) => ({ label: o as string, value: o as string }))
  }, [logs])

  // Build unique device options for the filter dropdown
  const deviceFilterOptions = useMemo<DataTableFilterOption[]>(() => {
    const unique = Array.from(
      new Set(logs.map((l) => parseLoginDetails(l.details).device).filter(Boolean))
    ).sort()
    return unique.map((d) => ({ label: d as string, value: d as string }))
  }, [logs])

  const columnFilterDefs = useMemo<DataTableColumnFilter[]>(
    () => [
      { columnId: "timestamp", options: [] },
      { columnId: "user", options: userFilterOptions },
      { columnId: "email", options: emailFilterOptions },
      { columnId: "action", options: actionFilterOptions },
      { columnId: "details", options: [] },
      { columnId: "ip", options: [] },
      { columnId: "browser", options: browserFilterOptions },
      { columnId: "os", options: osFilterOptions },
      { columnId: "device", options: deviceFilterOptions },
    ],
    [
      userFilterOptions,
      emailFilterOptions,
      actionFilterOptions,
      browserFilterOptions,
      osFilterOptions,
      deviceFilterOptions,
    ]
  )


  // Sort newest-first before handing to DataTable
  const sortedLogs = useMemo(
    () =>
      [...logs].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [logs]
  )

  // Flat export data for ExportDropdown
  const exportData = useMemo(
    () =>
      logs.map((log) => ({
        Timestamp: new Date(log.timestamp).toLocaleString(),
        User: log.actorDisplayName || log.actor || "",
        Role: log.actorRole || "",
        Action: log.action,
        Details: log.details,
        IP: log.ip || "",
      })),
    [logs]
  )

  const exportFilename = `activity_logs_${new Date().toISOString().slice(0, 10)}`

  return (
    <DataTable
      columns={columns}
      data={sortedLogs}
      enableSearch
      enableSorting
      enablePagination
      pageSize={10}
      allowWrap
      columnFilters={columnFilterDefs}
      initialColumnVisibility={{
        browser: false,
        os: false,
        device: false,
      }}
      toolbar={<ExportDropdown data={exportData} filename={exportFilename} />}
    />
  )
}
