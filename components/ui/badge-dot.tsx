import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeDotVariants = cva("inline-block size-1.5 rounded-full ring-1 ring-background shrink-0", {
  variants: {
    variant: {
      default: "bg-primary",
      secondary: "bg-secondary",
      destructive: "bg-destructive",
      success: "bg-emerald-500",
      warning: "bg-yellow-500",
      outline: "bg-muted-foreground",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

export interface BadgeDotProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeDotVariants> {
  pulse?: boolean
}

function BadgeDot({ className, variant, pulse, ...props }: BadgeDotProps) {
  return (
    <span className="relative flex size-1.5 shrink-0 items-center justify-center">
      {pulse && (
        <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", badgeDotVariants({ variant }))} />
      )}
      <span className={cn(badgeDotVariants({ variant }), className)} {...props} />
    </span>
  )
}

export { BadgeDot, badgeDotVariants }
