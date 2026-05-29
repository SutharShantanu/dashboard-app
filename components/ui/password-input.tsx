"use client"

import * as React from "react"
import { Eye, EyeOff, LockKeyhole, Sparkles } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn, generateSecurePassword } from "@/lib/utils"
import { toast } from "sonner"
import { PasswordStrength } from "@/components/password-strength"

export interface PasswordInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  /** Extra className forwarded to the wrapping InputGroup */
  groupClassName?: string
  /** Whether to show the generate secure password button */
  generatePassword?: boolean
  /** Callback fired when a new secure password is generated */
  onGeneratePassword?: (password: string) => void
  /** Whether to show the password strength indicator below the input */
  showStrengthIndicator?: boolean
  /** The current password value (required for strength indicator to work) */
  passwordValue?: string
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, groupClassName, generatePassword, onGeneratePassword, showStrengthIndicator, passwordValue, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    return (
      <div className="w-full space-y-2">
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

          {/* Right toggle / generate buttons */}
          <InputGroupAddon align="inline-end" className="flex items-center gap-1">
            {generatePassword && (
              <InputGroupButton
                size="icon-sm"
                type="button"
                aria-label="Generate Secure Password"
                title="Generate Secure Password"
                onClick={() => {
                  const securePw = generateSecurePassword()
                  if (onGeneratePassword) {
                    onGeneratePassword(securePw)
                  }
                  setShowPassword(true)
                  navigator.clipboard.writeText(securePw)
                  toast.success(
                    "Secure password generated and copied to clipboard!"
                  )
                }}
              >
                <Sparkles className="size-4 text-primary" />
              </InputGroupButton>
            )}

            <InputGroupButton
              size="icon-sm"
              type="button"
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

        {showStrengthIndicator && (
          <PasswordStrength password={passwordValue || ""} />
        )}
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
