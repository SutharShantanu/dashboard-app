"use client"

import * as React from "react"
import { Eye, EyeOff, LockKeyhole } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

export interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  /** Extra className forwarded to the wrapping InputGroup */
  groupClassName?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, groupClassName, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    return (
      <InputGroup className={cn("h-9", groupClassName)}>
        {/* Left lock icon */}
        <InputGroupAddon align="inline-start">
          <LockKeyhole className="size-4 text-muted-foreground" />
        </InputGroupAddon>

        {/* Actual password input */}
        <InputGroupInput
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={cn("px-1", className)}
          {...props}
        />

        {/* Right show/hide toggle */}
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
