"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export function ModeToggle() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <ToggleGroup type="single" variant="outline" disabled>
        <ToggleGroupItem value="light" aria-label="Light mode" disabled>
          <Sun className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="dark" aria-label="Dark mode" disabled>
          <Moon className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="system" aria-label="System mode" disabled>
          <Monitor className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>
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
