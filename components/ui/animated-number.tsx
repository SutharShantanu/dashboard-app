import { ComponentProps, forwardRef } from "react"
import NumberFlow from "@number-flow/react"
import { cn } from "@/lib/utils"

export interface AnimatedNumberProps extends Omit<ComponentProps<typeof NumberFlow>, "value"> {
  value: number
  prefix?: string
  suffix?: string
}

export const AnimatedNumber = forwardRef<HTMLSpanElement, AnimatedNumberProps>(
  ({ value, prefix, suffix, format, className, ...props }, ref) => {
    return (
      <span className={cn("inline-flex items-center", className)} ref={ref}>
        {prefix && <span className="mr-1">{prefix}</span>}
        <NumberFlow
          value={value}
          format={format}
          {...props}
        />
        {suffix && <span className="ml-1">{suffix}</span>}
      </span>
    )
  }
)

AnimatedNumber.displayName = "AnimatedNumber"
