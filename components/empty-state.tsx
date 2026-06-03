import React, { ReactNode } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

import { UndrawEmpty } from "react-undraw-illustrations"

export type EmptyStateVariant = "default" | "destructive" | "warning" | "success" | "muted"

interface EmptyStateProps {
  title: string
  description: ReactNode
  icon?: ReactNode
  useIllustration?: boolean
  className?: string
  action?: ReactNode
  variant?: EmptyStateVariant
}

const variantStyles: Record<EmptyStateVariant, {
  container: string
  iconWrapper: string
  title: string
  illustrationColor: string
}> = {
  default: {
    container: "",
    iconWrapper: "bg-muted text-foreground",
    title: "",
    illustrationColor: "var(--primary)",
  },
  destructive: {
    container: "border-destructive/20 text-destructive",
    iconWrapper: "bg-destructive/10 text-destructive",
    title: "text-destructive",
    illustrationColor: "var(--destructive)",
  },
  warning: {
    container: "border-warning/20 text-warning",
    iconWrapper: "bg-warning/10 text-warning",
    title: "text-warning",
    illustrationColor: "var(--warning)",
  },
  success: {
    container: "border-success/20 text-success",
    iconWrapper: "bg-success/10 text-success",
    title: "text-success",
    illustrationColor: "var(--success)",
  },
  muted: {
    container: "border-border text-muted-foreground",
    iconWrapper: "bg-muted text-muted-foreground",
    title: "text-muted-foreground",
    illustrationColor: "var(--muted-foreground)",
  }
}

export function EmptyState({
  title,
  description,
  icon,
  useIllustration = false,
  className,
  action,
  variant = "default",
}: EmptyStateProps) {
  const styles = variantStyles[variant]

  return (
    <Empty className={cn("py-12", styles.container, className)}>
      <EmptyHeader>
        <EmptyMedia 
          variant={useIllustration || !icon ? "default" : "icon"}
          className={cn(!useIllustration && icon && styles.iconWrapper)}
        >
          {useIllustration ? (
            <UndrawEmpty primaryColor={styles.illustrationColor} height="150px" />
          ) : (
            icon
          )}
        </EmptyMedia>
        <EmptyTitle className={styles.title}>{title}</EmptyTitle>
        <EmptyDescription className={cn(variant !== "default" && "text-inherit opacity-80")}>
          {description}
        </EmptyDescription>
        {action && <div className="mt-4">{action}</div>}
      </EmptyHeader>
    </Empty>
  )
}
