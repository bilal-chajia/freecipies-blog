"use client";

import * as React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Users,
  Tags,
  Image,
  Settings,
  LogOut,
  Pin,
  Home,
  LayoutTemplate,
  ChevronRight,
  Share2,
  ChevronsUpDown,
  Moon,
  Sun,
  Menu,
  PanelLeftClose,
  Utensils,
  Layers,
  Wrench,
  ArrowRightLeft,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/ui/avatar";
import { useUIStore, useAuthStore } from "../store/useStore";

const itemStyles = {
  Dashboard: "text-blue-600",
  Homepage: "text-teal-600",
  Content: "text-slate-600",
  "Blog Posts": "text-sky-600",
  Recipes: "text-emerald-600",
  Roundups: "text-violet-600",
  Categories: "text-amber-600",
  Authors: "text-indigo-600",
  Tags: "text-cyan-600",
  Equipment: "text-orange-600",
  Boards: "text-rose-600",
  Templates: "text-fuchsia-600",
  Settings: "text-slate-600",
  Media: "text-blue-600",
  Redirects: "text-zinc-600",
};

// Navigation data structure
const navGroups = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Homepage", url: "/homepage", icon: Home },
    ],
  },
  {
    title: "Blog",
    icon: FileText,
    items: [
      {
        title: "Content",
        icon: FileText,
        isSubmenu: true,
        items: [
          { title: "Blog Posts", url: "/articles", icon: FileText },
          { title: "Recipes", url: "/recipes", icon: Utensils },
          { title: "Roundups", url: "/roundups", icon: Layers },
        ]
      },
      { title: "Categories", url: "/categories", icon: FolderOpen },
      { title: "Authors", url: "/authors", icon: Users },
      { title: "Tags", url: "/tags", icon: Tags },
      { title: "Equipment", url: "/equipment", icon: Wrench },
    ],
  },
  {
    title: "Pinterest",
    icon: Share2,
    items: [
      { title: "Boards", url: "/pinterest/boards", icon: Pin },
      { title: "Templates", url: "/templates", icon: LayoutTemplate },
    ],
  },
  {
    title: "Settings",
    icon: Settings,
    url: "/settings/general",  // Single link - sub-navigation handled by SettingsLayout
  },
  {
    title: "General",
    items: [
      { title: "Media", url: "/media", icon: Image },
      { title: "Redirects", url: "/redirects", icon: ArrowRightLeft },
    ],
  },
];


interface NavItem {
  title: string;
  url?: string;
  icon?: React.ElementType;
  isSubmenu?: boolean;
  items?: NavItem[];
}

interface NavGroup {
  title: string;
  icon?: React.ElementType;
  url?: string;
  items?: NavItem[];
}

interface AppSidebarProps extends React.ComponentPropsWithoutRef<typeof Sidebar> {}

export function AppSidebar({ ...props }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Check if a path is active
  const isActive = (url: string | undefined): boolean => {
    if (!url) return false;
    if (url === "/") return location.pathname === url;
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  // Check if any item in a group is active
  const isGroupActive = (items: NavItem[]): boolean => items.some((item) => isActive(item.url));

  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem("admin_token");
    navigate("/login", { replace: true });
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Header with Toggle */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Toggle Sidebar">
              <button onClick={(e) => { e.preventDefault(); toggleSidebar(); }}>
                {isCollapsed ? (
                  <Menu className="size-4" />
                ) : (
                  <>
                    <LayoutDashboard className="size-4 text-primary" />
                    <span className="font-semibold">SaaS Blog CMS</span>
                    <PanelLeftClose className="ml-auto size-4" />
                  </>
                )}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.title} className="py-0">
            {/* Simple group without collapsible */}
            {!group.icon ? (
              <>
                <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.url)}
                          tooltip={item.title}
                        >
                          <Link to={item.url}>
                            <item.icon className={itemStyles[item.title]} />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </>
            ) : group.url ? (
              /* Direct link group (e.g., Settings with internal navigation) */
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname.startsWith(group.url.replace('/general', ''))}
                    tooltip={group.title}
                  >
                    <Link to={group.url}>
                      <group.icon className={itemStyles[group.title]} />
                      <span>{group.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : group.items ? (
              /* Collapsible group */
              <Collapsible
                defaultOpen={isGroupActive(group.items)}
                className="group/collapsible"
              >
                <SidebarMenu>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={group.title}>
                        <group.icon className={itemStyles[group.title]} />
                        <span>{group.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {group.items.map((item) => (
                          item.isSubmenu ? (
                            // Nested submenu (e.g., Content > Articles/Recipes/Roundups)
                            <Collapsible key={item.title} defaultOpen={item.items?.some(sub => isActive(sub.url))} className="group/submenu">
                              <SidebarMenuSubItem>
                                <CollapsibleTrigger asChild>
                                  <SidebarMenuSubButton className="cursor-pointer">
                                    <item.icon className={itemStyles[item.title]} />
                                    <span>{item.title}</span>
                                    <ChevronRight className="ml-auto h-3 w-3 transition-transform duration-200 group-data-[state=open]/submenu:rotate-90" />
                                  </SidebarMenuSubButton>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <SidebarMenuSub className="ml-2 border-l border-border/50">
                                    {item.items.map((subItem) => (
                                      <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                                          <Link to={subItem.url}>
                                            <subItem.icon className={`h-3.5 w-3.5 ${itemStyles[subItem.title] || ""}`} />
                                            <span>{subItem.title}</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    ))}
                                  </SidebarMenuSub>
                                </CollapsibleContent>
                              </SidebarMenuSubItem>
                            </Collapsible>
                          ) : (
                            // Regular menu item
                            <SidebarMenuSubItem key={item.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isActive(item.url)}
                              >
                                <Link to={item.url}>
                                <item.icon className={itemStyles[item.title]} />
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </SidebarMenu>
              </Collapsible>
            ) : null}
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer with User Menu */}
      <SidebarFooter>
        <SidebarMenu>
          {/* Theme Toggle */}
          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} tooltip="Toggle Theme">
              {theme === "dark" ? (
                <Sun className="size-4" />
              ) : (
                <Moon className="size-4" />
              )}
              <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* User Dropdown */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary text-primary-foreground">
                      {user?.name?.charAt(0) || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.name || "Admin"}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email || "admin@example.com"}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg">
                        {user?.name?.charAt(0) || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {user?.name || "Admin"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.email || "admin@example.com"}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

export default AppSidebar;
