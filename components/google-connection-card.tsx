"use client"

import { useQuery } from "@tanstack/react-query"
import { signIn, signOut } from "next-auth/react"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BadgeDot } from "@/components/ui/badge-dot"
import { Plus, Link2Off } from "lucide-react"
import Icon from "@/components/icons/Icon"

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
  const { data: internalIsConnected = null } = useQuery({
    queryKey: ["drive-connection"],
    queryFn: async () => {
      const res = await fetch("/api/drive/list")
      return res.ok
    },
    // Skip when parent controls this value
    enabled: controlledIsConnected === undefined,
  })

  const isConnected = controlledIsConnected !== undefined ? controlledIsConnected : internalIsConnected

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-muted p-3">
            <Icon name="GoogleDrive2026" className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              Google Drive
              {isConnected ? (
                <Badge variant="success-light" className="gap-1.5">
                  <BadgeDot variant="success" pulse />
                  Connected
                </Badge>
              ) : (
                <Badge variant="destructive-light" className="gap-1.5">
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
          {!isConnected ? (
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
          ) : (
            <Button
              variant="destructive"
              onClick={() =>
                signOut({
                  callbackUrl: "/login",
                })
              }
            >
              <Link2Off className="h-4 w-4" />
              <span className="hidden sm:inline">Withdraw Integration</span>
              <span className="sm:hidden">Withdraw</span>
            </Button>
          )}
        </div>
      </CardHeader>
    </Card>
  )
}
