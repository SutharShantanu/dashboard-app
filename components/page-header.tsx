import React from "react"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  subtitle: React.ReactNode
  title: React.ReactNode
  description: React.ReactNode
  actionButton?: React.ReactNode
  pulse?: boolean
  className?: string
}

export function PageHeader({
  subtitle,
  title,
  description,
  actionButton,
  pulse = false,
  className,
}: PageHeaderProps) {
  return (
    <Card className={cn("overflow-hidden border ring-0 shadow-none", className)}>
      <CardHeader>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-2 w-2 rounded-full bg-primary",
                  pulse && "animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                )}
              />
              <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                {subtitle}
              </span>
            </div>
            <CardTitle className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
              {title}
            </CardTitle>
            <CardDescription className="max-w-xl text-base text-muted-foreground/80 leading-relaxed">
              {description}
            </CardDescription>
          </div>
          {actionButton && (
            <div className="flex shrink-0 items-center gap-3">
              {actionButton}
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  )
}

