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
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

export type EmptyStateVariant = "default" | "destructive" | "warning" | "success" | "muted"

interface EmptyStateProps {
  title?: string
  description?: ReactNode
  icon?: ReactNode
  useIllustration?: boolean
  className?: string
  action?: ReactNode
  variant?: EmptyStateVariant
  isLoading?: boolean
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
  isLoading = false,
}: EmptyStateProps) {
  if (isLoading) {
    return (
      <div className={cn("w-full space-y-8 py-10", className)}>
        <div className="space-y-2">
          <SkeletonBlock
            variant="rectangular"
            width={200}
            height={32}
            className="rounded-lg"
          />
          <SkeletonBlock
            variant="rectangular"
            width={300}
            height={20}
            className="rounded-lg"
          />
        </div>
        <SkeletonBlock
          variant="rectangular"
          width="100%"
          height={500}
          className="rounded-xl"
          showSpinner={true}
        />
      </div>
    )
  }

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

export interface SkeletonBlockProps extends React.ComponentProps<typeof Skeleton> {
  width?: number | string
  height?: number | string
  variant?: "rectangular" | "circular" | "text"
  showSpinner?: boolean
}

export function SkeletonBlock({
  width,
  height,
  variant = "rectangular",
  showSpinner = false,
  className,
  ...props
}: SkeletonBlockProps) {
  return (
    <Skeleton
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        variant === "rectangular" && "rounded-none",
        variant === "circular" && "rounded-full",
        variant === "text" && "h-4 w-full rounded-none",
        className
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...props.style,
      }}
      {...props}
    >
      {showSpinner && <Spinner className="z-10 h-5 w-5 text-muted-foreground" />}
    </Skeleton>
  )
}
