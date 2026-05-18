"use client"

import React from "react"
import { usePathname, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { BadgeDot } from "@/components/ui/badge-dot"

interface PageHeaderProps {
  subtitle: React.ReactNode
  title: React.ReactNode
  description: React.ReactNode
  pulse?: boolean
  className?: string
  children?: React.ReactNode
}

export function PageHeader({
  subtitle,
  title,
  description,
  pulse = false,
  className,
  children,
}: PageHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()
  const segments = pathname.split('/').filter(Boolean)
  const isNested = segments.length > 1

  return (
    <Card className={cn("overflow-hidden border ring-0 shadow-none", className)}>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BadgeDot variant="default" pulse={pulse} />
              <span className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
                {subtitle}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isNested && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon-sm" 
                        onClick={() => router.back()}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Go back</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <CardTitle className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground">
                {title}
              </CardTitle>
            </div>
            <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed">
              {description}
            </CardDescription>
          </div>
          {children && (
            <div className="flex shrink-0 items-center gap-3">
              {children}
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  )
}

