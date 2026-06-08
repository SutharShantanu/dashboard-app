"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Eye,
  Download,
  Bell,
  RefreshCw,
  MoreVerticalIcon,
} from "lucide-react"
import { Area, AreaChart, ResponsiveContainer } from "recharts"
import { cn } from "@/lib/utils"
import { AnimatedNumber } from "@/components/ui/animated-number"

export interface DashboardStatCardProps {
  title: string
  value: React.ReactNode
  delta?: number
  positive?: boolean
  lastMonth?: string | React.ReactNode
  icon?: React.ReactNode
  className?: string
  sparklineData?: { value: number }[]
  chartColor?: string
}

const defaultSparkline = [
  { value: 10 },
  { value: 25 },
  { value: 15 },
  { value: 40 },
  { value: 20 },
  { value: 50 },
  { value: 35 },
  { value: 60 },
]

export function DashboardStatCard({
  title,
  value,
  delta = 0,
  positive = true,
  lastMonth = "-",
  icon,
  className,
  sparklineData = defaultSparkline,
  chartColor,
}: DashboardStatCardProps) {
  const actualChartColor =
    chartColor ||
    (positive ? "var(--color-success)" : "var(--color-destructive)")
  const chartId = `sparkline-${title.replace(/\s+/g, "-").toLowerCase()}`

  return (
    <Card className={cn("group relative w-full overflow-hidden", className)}>
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-24 opacity-15 transition-opacity duration-500 group-hover:opacity-25"
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, black 20%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 20%, transparent 100%)",
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={sparklineData}
            margin={{ top: 0, left: 0, right: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={chartId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={actualChartColor}
                  stopOpacity={0.8}
                />
                <stop
                  offset="100%"
                  stopColor={actualChartColor}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={actualChartColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${chartId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <CardContent className="relative z-10 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {icon && <div className="text-muted-foreground">{icon}</div>}
            <h3 className="text-sm font-medium text-muted-foreground">
              {title}
            </h3>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon-xs"
                aria-label="More options"
              >
                <MoreVerticalIcon aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-fit max-w-48">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => console.log(`View Details for ${title}`)}
                >
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => console.log(`Export Data for ${title}`)}
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export Data
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => console.log(`Set Alert for ${title}`)}
                >
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  Set Alert
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => console.log(`Refresh ${title}`)}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Refresh
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl font-medium tracking-tight text-foreground tabular-nums">
              {value}
            </span>
            <Badge variant={positive ? "success-light" : "destructive-light"}>
              {positive ? (
                <ArrowUpIcon aria-hidden="true" />
              ) : (
                <ArrowDownIcon aria-hidden="true" />
              )}
              <AnimatedNumber value={delta} />%
            </Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="relative z-10 pt-0">
        <div className="text-xs text-muted-foreground">
          Vs last month:{" "}
          <span className="font-medium text-foreground tabular-nums">
            {lastMonth}
          </span>
        </div>
      </CardFooter>
    </Card>
  )
}
