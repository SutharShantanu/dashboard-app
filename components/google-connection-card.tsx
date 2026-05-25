"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BadgeDot } from "@/components/ui/badge-dot"
import { Cloud, Plus } from "lucide-react"

interface GoogleConnectionCardProps {
  isGoogleConnected?: boolean | null
  callbackUrl?: string
  className?: string
}

export function GoogleConnectionCard({
  isGoogleConnected: controlledIsConnected,
  callbackUrl = "/sheets",
  className,
}: GoogleConnectionCardProps) {
  const [internalIsConnected, setInternalIsConnected] = useState<boolean | null>(null)

  useEffect(() => {
    // If the component is controlled by a parent page/component, do not fetch connection state internally
    if (controlledIsConnected !== undefined) {
      return
    }

    async function checkConnection() {
      try {
        const res = await fetch("/api/drive/list")
        setInternalIsConnected(res.ok)
      } catch (err) {
        setInternalIsConnected(false)
      }
    }

    checkConnection()
  }, [controlledIsConnected])

  const isConnected = controlledIsConnected !== undefined ? controlledIsConnected : internalIsConnected

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-muted p-3">
            <Cloud className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              Google Drive
              {isConnected ? (
                <Badge variant="secondary" className="gap-1.5">
                  <BadgeDot variant="success" pulse />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1.5">
                  <BadgeDot variant="destructive" pulse />
                  Not Connected
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Browse and link spreadsheets from your Drive.
            </CardDescription>
          </div>
        </div>
        <div>
          {!isConnected && (
            <Button
              onClick={() =>
                signIn("google", {
                  callbackUrl,
                })
              }
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Connect Now</span>
              <span className="sm:hidden">Connect</span>
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  )
}
