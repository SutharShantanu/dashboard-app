import * as React from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export interface SkeletonBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "rectangular" | "circular"
  width?: number | string
  height?: number | string
}

export function SkeletonBlock({
  className,
  variant = "rectangular",
  width,
  height,
  style,
  ...props
}: SkeletonBlockProps) {
  return (
    <Skeleton
      className={cn(
        variant === "circular" ? "rounded-full" : "rounded-md",
        className
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  )
}
