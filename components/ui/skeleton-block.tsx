import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export interface SkeletonBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rectangular" | "circular" | "text"
  width?: number | string
  height?: number | string
  showSpinner?: boolean
}

export function SkeletonBlock({
  className,
  variant = "rectangular",
  width,
  height,
  style,
  showSpinner,
  ...props
}: SkeletonBlockProps) {
  return (
    <Skeleton
      className={cn(
        variant === "circular" ? "rounded-full" : "rounded-md",
        showSpinner && "flex items-center justify-center",
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    >
      {showSpinner && <Spinner className="w-6 h-6 text-muted-foreground" />}
    </Skeleton>
  )
}
