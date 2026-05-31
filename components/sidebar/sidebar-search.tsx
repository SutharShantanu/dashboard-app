import React, { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Card } from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import { Spinner } from "@/components/ui/spinner"

interface SidebarSearchProps {
  allNavItems: { title: string; url: string; icon?: any }[]
}

export function SidebarSearch({ allNavItems }: SidebarSearchProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedTerm, setDebouncedTerm] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const searchResults = React.useMemo(() => {
    if (!debouncedTerm) return []
    return allNavItems.filter((item) =>
      item.title.toLowerCase().includes(debouncedTerm.toLowerCase())
    )
  }, [debouncedTerm, allNavItems])

  return (
    <div className="relative group-data-[collapsible=icon]:hidden">
      <InputGroup className="w-full min-w-0">
        <InputGroupAddon>
          <Search className="size-3.5" />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          placeholder="Search sheets or config..."
          className="min-w-0 text-xs"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <InputGroupAddon align="inline-end">
          {searchTerm !== debouncedTerm && searchTerm.length > 0 ? (
            <Spinner className="size-3.5 text-muted-foreground" />
          ) : (
            <Kbd className="text-xs">CTRL + K</Kbd>
          )}
        </InputGroupAddon>
      </InputGroup>

      {searchTerm.length > 0 && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1">
          <Card className="overflow-hidden p-0 shadow-lg">
            <Command className="h-auto max-h-75">
              <CommandList className="max-h-75">
                <CommandEmpty>
                  No results found for &quot;{searchTerm}&quot;
                </CommandEmpty>

                {searchResults.length > 0 && (
                  <CommandGroup heading="Results">
                    {searchResults.map((item) => (
                      <CommandItem
                        key={item.url}
                        onSelect={() => {
                          router.push(item.url)
                          setSearchTerm("")
                        }}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2.5 sm:gap-2 sm:py-1.5"
                      >
                        {item.icon && (
                          <item.icon className="size-4 text-muted-foreground sm:size-3.5" />
                        )}
                        <span className="text-sm sm:text-xs">
                          {item.title}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </Card>
        </div>
      )}
    </div>
  )
}
