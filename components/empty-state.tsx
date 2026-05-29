import React, { ReactNode } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

import { UndrawEmpty } from "react-undraw-illustrations"

interface EmptyStateProps {
  title: string
  description: ReactNode
  icon?: ReactNode
  useIllustration?: boolean
  className?: string
  action?: ReactNode
}

export function EmptyState({
  title,
  description,
  icon,
  useIllustration = false,
  className,
  action,
}: EmptyStateProps) {
  return (
    <Empty className={cn("py-12", className)}>
      <EmptyHeader>
        <EmptyMedia variant={useIllustration || !icon ? "default" : "icon"}>
          {useIllustration ? <UndrawEmpty primaryColor="#6366f1" height="150px" /> : icon}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
        {action && <div className="mt-4">{action}</div>}
      </EmptyHeader>
    </Empty>
  )
}
