"use client"

import * as React from "react"
import {
  IconLogs,
  IconFolder,
  IconInnerShadowTop,
  IconSearch,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useSession } from "next-auth/react";
import { BucketConfig } from '@/types/bucket';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  hasBackend: boolean;
  buckets: BucketConfig[];
  companyName: string;
}

export function AppSidebar({ hasBackend, buckets, companyName, ...props }: AppSidebarProps) {
  const { data: session } = useSession();

  const user = {
    name: session?.user?.name || "Jogn Doe",
    email: session?.user?.email || "j.doe@example.com",
    avatar: session?.user?.avatar_url || "/avatars/anon.jpg",
  };

  const data = {
    navMain: [
      {
        title: "Buckets",
        url: "/buckets",
        icon: IconFolder,
        items: buckets.map(bucket => ({
          title: bucket.id,
          url: `/bucket/${encodeURIComponent(bucket.id)}`,
        })),
      },
      ...(hasBackend
        ? [
          { title: "Recent", url: "/recent", icon: IconLogs },
          { title: "Users", url: "/users", icon: IconUsers },
        ]
        : []),
    ],
    navSecondary: hasBackend
      ? [
        { title: "Settings", url: "/settings", icon: IconSettings },
        { title: "Search", url: "#", icon: IconSearch },
      ]
      : [],
  };



  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="#">
                <IconInnerShadowTop className="size-5!" />
                <span className="text-base font-semibold">{companyName}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
