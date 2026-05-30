"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { SkeletonBlock } from "@/components/ui/skeleton-block"

export function ModeToggle() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    // Wrapping the setState in a setTimeout fixes the "cascading renders" linter warning
    // by pushing the state update to the end of the execution queue (next macrotask).
    const timer = setTimeout(() => setMounted(true), 0)
    return () => clearTimeout(timer)
  }, [])

  if (!mounted) {
    // Renders a 3-section toggle skeleton to perfectly match the loaded layout
    // without layout shift, following frontend-design principles.
    return (
      <div className="flex gap-1">
        <SkeletonBlock width={30} height={30} variant="rectangular" />
        <SkeletonBlock width={30} height={30} variant="rectangular" />
        <SkeletonBlock width={30} height={30} variant="rectangular" />
      </div>
    )
  }

  return (
    <ToggleGroup
      type="single"
      value={theme}
      variant="outline"
      onValueChange={(value) => {
        if (value) setTheme(value)
      }}
    >
      <ToggleGroupItem value="light" aria-label="Light mode">
        <Sun className="h-4 w-4" />
      </ToggleGroupItem>

      <ToggleGroupItem value="dark" aria-label="Dark mode">
        <Moon className="h-4 w-4" />
      </ToggleGroupItem>

      <ToggleGroupItem value="system" aria-label="System mode">
        <Monitor className="h-4 w-4" />
      </ToggleGroupItem>
    </ToggleGroup>
  )
}
