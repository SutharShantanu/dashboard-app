"use client"

import * as React from "react"
import { Avatar as AvatarPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const AVATAR_VARIANTS = [
  "bg-blue-500/50 dark:bg-blue-500/50",
  "bg-emerald-500/50 dark:bg-emerald-500/50",
  "bg-rose-500/50 dark:bg-rose-500/50",
  "bg-amber-500/50 dark:bg-amber-500/50",
  "bg-indigo-500/50 dark:bg-indigo-500/50",
  "bg-violet-500/50 dark:bg-violet-500/50",
  "bg-cyan-500/50 dark:bg-cyan-500/50",
  "bg-orange-500/50 dark:bg-orange-500/50",
  "bg-pink-500/50 dark:bg-pink-500/50",
  "bg-teal-500/50 dark:bg-teal-500/50",
  "bg-fuchsia-500/50 dark:bg-fuchsia-500/50",
  "bg-lime-500/50 dark:bg-lime-500/50",
  "bg-sky-500/50 dark:bg-sky-500/50",
  "bg-purple-500/50 dark:bg-purple-500/50",
  "bg-yellow-500/50 dark:bg-yellow-500/50",
  "bg-red-500/50 dark:bg-red-500/50",
]

function getVariantFromString(value: string) {
  if (!value) return AVATAR_VARIANTS[0]
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % AVATAR_VARIANTS.length
  return AVATAR_VARIANTS[index]
}

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & {
    size?: "default" | "sm" | "lg"
  }
>(({ className, size = "default", ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    data-slot="avatar"
    data-size={size}
    className={cn(
      "group/avatar relative flex size-8 shrink-0 rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6",
      "group-data-[slot=avatar-group]/avatar-group:ring-2 group-data-[slot=avatar-group]/avatar-group:ring-background",
      className
    )}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    data-slot="avatar-image"
    className={cn(
      "aspect-square size-full rounded-full object-cover",
      className
    )}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> & {
    variant?: string
    seed?: string
  }
>(
  (
    { className, children, variant: variantProp, seed: seedProp, ...props },
    ref
  ) => {
    const extractText = (node: React.ReactNode): string => {
      if (node == null || typeof node === "boolean") return ""
      if (typeof node === "string" || typeof node === "number")
        return String(node)
      if (Array.isArray(node)) return node.map(extractText).join("")
      if (React.isValidElement(node)) {
        const props = node.props as { children?: React.ReactNode } | undefined
        return extractText(props?.children)
      }
      return ""
    }

    const text = React.useMemo(() => extractText(children), [children])
    const seed = seedProp || text || "user"

    const variant = React.useMemo(
      () => variantProp || getVariantFromString(seed),
      [seed, variantProp]
    )

    return (
      <AvatarPrimitive.Fallback
        ref={ref}
        data-slot="avatar-fallback"
        className={cn(
          "text-md flex size-full items-center justify-center rounded-full font-semibold tracking-tight shadow-inner backdrop-blur-sm transition-colors group-data-[size=lg]/avatar:text-sm group-data-[size=sm]/avatar:text-xs",
          variant,
          className
        )}
        {...props}
      >
        {children}
      </AvatarPrimitive.Fallback>
    )
  }
)
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

function AvatarBadge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        "absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none",
        "group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
        "group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
        "group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroup({
  className,
  size = "default",
  ...props
}: React.ComponentProps<"div"> & { size?: "default" | "sm" | "lg" }) {
  return (
    <div
      data-slot="avatar-group"
      data-size={size}
      className={cn(
        "group/avatar-group flex items-center -space-x-3 data-[size=sm]:-space-x-2",
        className
      )}
      {...props}
    />
  )
}

function AvatarGroupCount({
  className,
  children,
  seed,
  variant: variantProp,
  ...props
}: React.ComponentProps<"div"> & { seed?: string; variant?: string }) {
  const value = seed || (typeof children === "string" ? children : "+")
  const variant = React.useMemo(
    () => variantProp || getVariantFromString(value),
    [value, variantProp]
  )

  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "text-lgfont-semibold relative flex size-8 shrink-0 items-center justify-center rounded-full ring-2 ring-background backdrop-blur-sm select-none",
        "group-data-[size=lg]/avatar-group:size-10 group-data-[size=sm]/avatar-group:size-6",
        "text-foreground/70",
        "bg-opacity-40",
        variant,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
}
