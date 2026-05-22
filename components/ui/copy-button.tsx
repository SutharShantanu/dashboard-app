"use client"

import * as React from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { VariantProps } from "class-variance-authority"

type CopyButtonProps = Omit<React.ComponentProps<"button">, "children"> &
  VariantProps<typeof buttonVariants> & {
    /** The text that will be written to the clipboard. */
    content: string
    /** Controlled copied state. When provided the internal timer is disabled. */
    copied?: boolean
    /** Called when the copied state changes. */
    onCopiedChange?: (copied: boolean, content?: string) => void
    /** How long (ms) to show the check icon before reverting. Default: 2000 */
    delay?: number
    /** Tooltip label shown before copying. Default: "Copy" */
    label?: string
    /** Tooltip label shown after copying. Default: "Copied!" */
    copiedLabel?: string
  }

function CopyButton({
  className,
  content,
  copied,
  onCopiedChange,
  onClick,
  variant = "outline",
  size = "icon",
  delay = 2000,
  label = "Copy",
  copiedLabel = "Copied!",
  ...props
}: CopyButtonProps) {
  const [internalCopied, setInternalCopied] = React.useState(false)
  const [open, setOpen] = React.useState(false)

  // Respect controlled state when provided
  const isCopied = copied !== undefined ? copied : internalCopied

  const handleCopy = React.useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e)
      // If controlled and already copied, do nothing
      if (copied) return
      if (!content) return

      const promise = navigator.clipboard.writeText(content).then(() => {
        setInternalCopied(true)
        onCopiedChange?.(true, content)

        setTimeout(() => {
          setInternalCopied(false)
          onCopiedChange?.(false)
        }, delay)
      })

      toast.promise(promise, {
        loading: "Copying...",
        success: "Copied to clipboard!",
        error: "Failed to copy.",
      })
    },
    [onClick, copied, content, onCopiedChange, delay]
  )

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <Button
            data-slot="copy-button"
            data-copied={isCopied || undefined}
            variant={variant}
            size={size}
            className={cn("relative overflow-hidden", className)}
            onClick={handleCopy}
            aria-label={isCopied ? copiedLabel : label}
            {...props}
          >
            {/* Copy icon — visible when not copied */}
            <CopyIcon
              className={cn(
                "absolute transition-all duration-150",
                isCopied ? "scale-50 opacity-0" : "scale-100 opacity-100"
              )}
            />
            {/* Check icon — visible when copied */}
            <CheckIcon
              className={cn(
                "absolute transition-all duration-150",
                isCopied ? "scale-100 opacity-100" : "scale-50 opacity-0"
              )}
            />
            {/* Invisible spacer to hold button dimensions */}
            <span className="invisible">
              <CopyIcon />
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs font-semibold">
            {isCopied ? copiedLabel : label}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export { CopyButton, type CopyButtonProps }
