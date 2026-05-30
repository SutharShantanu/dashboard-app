import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"

export interface SkeletonBlockProps extends React.ComponentProps<typeof Skeleton> {
  /** Width of the skeleton */
  width?: number | string
  /** Height of the skeleton */
  height?: number | string
  /** Shape variant */
  variant?: "rectangular" | "circular" | "text"
  /** Whether to render a spinner inside the skeleton */
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
