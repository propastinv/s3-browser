"use client"

import { type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  IconChevronRight,
} from "@tabler/icons-react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"


export function NavMain({
  items,
}: {
  items: {
    title: string
    url?: string
    icon?: Icon
    items?: {
      title: string
      url: string
    }[]
  }[]
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu className="gap-1">
          {items.map((item) => {
            const isActive = item.url === pathname
            const hasChildren = item.items && item.items.length > 0
            const isSubActive = item.items?.some((sub) => sub.url === pathname)

            return (
              <SidebarMenuItem key={item.title}>
                {hasChildren ? (
                  <Collapsible
                    defaultOpen={isActive || isSubActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuButton
                      tooltip={item.title}
                      className={isActive ? "bg-sidebar-accent" : ""}
                      render={
                        item.url ? (
                          <Link href={item.url} className="flex items-center gap-2">
                            {item.icon && <item.icon width={16} height={16} />}
                            <span>{item.title}</span>
                          </Link>
                        ) : undefined
                      }
                    >
                      {!item.url && (
                        <div className="flex items-center gap-2">
                          {item.icon && <item.icon width={16} height={16} />}
                          <span>{item.title}</span>
                        </div>
                      )}
                    </SidebarMenuButton>

                    <CollapsibleTrigger
                      render={
                        <SidebarMenuAction className="group-data-open/collapsible:rotate-90">
                          <IconChevronRight />
                        </SidebarMenuAction>
                      }
                    />

                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items?.map((subItem) => {
                          const isSubActive = subItem.url === pathname
                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                render={
                                  <Link
                                    href={subItem.url}
                                    className={`${isSubActive
                                      ? "text-primary font-medium bg-sidebar-accent"
                                      : ""
                                      }`}
                                  >
                                    <span>{subItem.title}</span>
                                  </Link>
                                }
                              />
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </Collapsible>
                ) : item.url ? (
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={
                      isActive
                        ? "bg-sidebar-accent"
                        : ""
                    }
                    render={
                      <Link href={item.url} className="flex items-center gap-2">
                        {item.icon && <item.icon />}
                        <span>{item.title}</span>
                      </Link>
                    }
                  />
                ) : (
                  <SidebarMenuButton
                    tooltip={item.title}
                    className={`flex items-center gap-2 ${isActive
                      ? "bg-sidebar-accent"
                      : ""
                      }`}
                  >
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup >
  )
}