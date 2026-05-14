import React from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"

interface PageHeaderProps {
  subtitle: React.ReactNode
  title: React.ReactNode
  description: React.ReactNode
  actionButton?: React.ReactNode
  pulse?: boolean
}

export function PageHeader({
  subtitle,
  title,
  description,
  actionButton,
  pulse = false,
}: PageHeaderProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-2 w-2 rounded-full bg-primary ${
                  pulse ? "animate-pulse" : ""
                }`}
              />
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {subtitle}
              </span>
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              {title}
            </CardTitle>
            <CardDescription className="max-w-xl">
              {description}
            </CardDescription>
          </div>
          {actionButton && <div>{actionButton}</div>}
        </div>
      </CardHeader>
    </Card>
  )
}
