import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-none border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
        info: "bg-info text-white",
        success: "bg-success text-white",
        warning: "bg-warning text-white",
        focus: "bg-focus text-focus-foreground",
        invert: "bg-invert text-invert-foreground",
        "primary-light": "bg-primary/10 border-none text-primary dark:bg-primary/20",
        "warning-light": "bg-warning/10 border-none text-warning-foreground dark:bg-warning/20",
        "success-light": "bg-success/10 border-none text-success-foreground dark:bg-success/20",
        "info-light": "bg-info/10 border-none text-info-foreground dark:bg-info/20",
        "destructive-light":
          "bg-destructive/10 border-none text-destructive-foreground dark:bg-destructive/20",
      },
      size: {
        xs: "h-4 px-1 text-tiny",
        sm: "h-4.5 px-1 text-tiny",
        default: "h-5 px-2 text-xs",
        lg: "h-5.5 px-2.5 text-xs",
        xl: "h-6 px-3 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

interface BadgeProps extends React.ComponentProps<"span">, VariantProps<typeof badgeVariants> {
  asChild?: boolean
}

function Badge({ className, variant, size, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants, type BadgeProps }
