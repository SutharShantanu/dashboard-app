import React from "react"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import { SkeletonBlock } from "@/components/ui/skeleton-block"
import { NavUser } from "@/components/nav-user"
import { getAvatarUrl } from "@/lib/utils"
import { TooltipProvider } from "@/components/ui/tooltip"

interface SidebarSkeletonProps {
  user: {
    displayName?: string | null
    role: string
    username: string
    gender?: string
  }
}

export function SidebarSkeleton({ user, ...props }: SidebarSkeletonProps & React.ComponentProps<typeof Sidebar>) {
  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader className="gap-4">
          <div className="flex items-center gap-3">
            <SkeletonBlock width={36} height={36} variant="rectangular" className="rounded-xl shrink-0" />
            <SkeletonBlock width={120} height={20} variant="rectangular" className="group-data-[collapsible=icon]:hidden" />
          </div>
          <div className="relative group-data-[collapsible=icon]:hidden">
            <SkeletonBlock width="100%" height={32} variant="rectangular" className="rounded-md" />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <div className="flex items-center justify-between px-2 py-1.5 group-data-[collapsible=icon]:hidden">
              <SkeletonBlock width={120} height={16} variant="rectangular" />
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 3 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <SkeletonBlock width={16} height={16} variant="circular" />
                      <SkeletonBlock width={96} height={16} variant="rectangular" />
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup>
            <div className="px-2 py-1.5 group-data-[collapsible=icon]:hidden">
              <SkeletonBlock width={100} height={16} variant="rectangular" />
            </div>
            <SidebarGroupContent>
              <SidebarMenu>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <SkeletonBlock width={16} height={16} variant="circular" />
                      <SkeletonBlock width={120} height={16} variant="rectangular" />
                    </div>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser
            user={{
              name: user.displayName || user.username,
              email: `${user.username}@aegis.local`,
              avatar: getAvatarUrl(user.username, user.role, user.gender),
              role: user.role,
              username: user.username,
            }}
          />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  )
}
