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
import { Switch } from "@/ui/switch";
import { cn } from "@/lib/utils";
import { useUIStore, useAuthStore } from "../store/useStore";
import { clearAllAdminCache } from "../services/api-client";

// Navigation data structure
const navGroups: NavGroup[] = [
  {
    title: "Main",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Homepage", url: "/homepage", icon: Home },
      { title: "Media Library", url: "/media", icon: Image },
    ],
  },
  {
    title: "Blog",
    items: [
      {
        title: "Content",
        icon: FileText,
        isSubmenu: true,
        items: [
          { title: "Blog Posts", url: "/articles", icon: FileText },
          { title: "Recipes", url: "/recipes", icon: Utensils },
          { title: "Roundups", url: "/roundups", icon: Layers },
        ],
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
    title: "System",
    items: [
      { title: "Settings", url: "/settings/general", icon: Settings },
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
  items: NavItem[];
}

function CollapsedSubmenu({ item, ItemIcon }: { item: NavItem; ItemIcon?: React.ElementType }) {
  const [open, setOpen] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          tooltip={undefined}
          className="cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {ItemIcon && <ItemIcon className="size-4 text-muted-foreground/80 transition-colors group-hover/menu-button:text-primary group-data-[active=true]/menu-button:text-primary" />}
          <span>{item.title}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={8}
        className="min-w-48"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {item.items?.map((subItem) => {
          const SubItemIcon = subItem.icon;
          return (
            <DropdownMenuItem key={subItem.title} asChild>
              <Link to={subItem.url ?? "#"} className="w-full flex items-center gap-2 cursor-pointer">
                {SubItemIcon && <SubItemIcon className="h-4 w-4 text-muted-foreground/80" />}
                <span>{subItem.title}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CollapsedGroup({ group }: { group: NavGroup }) {
  const [open, setOpen] = React.useState(false);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const GroupIcon = group.icon;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          tooltip={undefined}
          className="cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {GroupIcon && <GroupIcon className="size-4 text-muted-foreground/80 transition-colors group-hover/menu-button:text-primary group-data-[active=true]/menu-button:text-primary" />}
          <span>{group.title}</span>
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={8}
        className="min-w-48"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <DropdownMenuLabel>{group.title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {group.items.map((item) => {
          const ItemIcon = item.icon;
          if (item.isSubmenu) {
            return (
              <React.Fragment key={item.title}>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1 px-2">{item.title}</DropdownMenuLabel>
                {item.items?.map((subItem) => {
                  const SubItemIcon = subItem.icon;
                  return (
                    <DropdownMenuItem key={subItem.title} asChild>
                      <Link to={subItem.url ?? "#"} className="w-full flex items-center gap-2 cursor-pointer pl-4">
                        {SubItemIcon && <SubItemIcon className="h-4 w-4 text-muted-foreground/80" />}
                        <span>{subItem.title}</span>
                      </Link>
                    </DropdownMenuItem>
                  );
                })}
              </React.Fragment>
            );
          }
          return (
            <DropdownMenuItem key={item.title} asChild>
              <Link to={item.url ?? "#"} className="w-full flex items-center gap-2 cursor-pointer">
                {ItemIcon && <ItemIcon className="h-4 w-4 text-muted-foreground/80" />}
                <span>{item.title}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
    if (url.startsWith("/settings")) {
      return location.pathname.startsWith("/settings");
    }
    return location.pathname === url || location.pathname.startsWith(url + "/");
  };

  // Check if any item in a group is active
  const isGroupActive = (items: NavItem[]): boolean =>
    items.some((item) => isActive(item.url) || (item.items ? isGroupActive(item.items) : false));

  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem("admin_token");
    clearAllAdminCache();
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
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      return item.isSubmenu ? (
                        isCollapsed ? (
                          <SidebarMenuItem key={item.title}>
                            <CollapsedSubmenu item={item} ItemIcon={ItemIcon} />
                          </SidebarMenuItem>
                        ) : (
                          <Collapsible
                            key={item.title}
                            defaultOpen={item.items?.some((sub) => isActive(sub.url))}
                            className="group/submenu w-full"
                          >
                            <SidebarMenuItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton tooltip={item.title} className="cursor-pointer">
                                  {ItemIcon && <ItemIcon className="size-4 text-muted-foreground/80 transition-colors group-hover/menu-button:text-primary group-data-[active=true]/menu-button:text-primary" />}
                                  <span>{item.title}</span>
                                  <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/submenu:rotate-90" />
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub className="ml-2 border-l border-border/50">
                                  {item.items?.map((subItem) => {
                                    const SubItemIcon = subItem.icon;
                                    return (
                                      <SidebarMenuSubItem key={subItem.title}>
                                        <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                                          <Link to={subItem.url ?? "#"}>
                                            {SubItemIcon && <SubItemIcon className="h-3.5 w-3.5 text-muted-foreground/80 transition-colors group-hover/menu-button:text-primary group-data-[active=true]/menu-button:text-primary" />}
                                            <span>{subItem.title}</span>
                                          </Link>
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    );
                                  })}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>
                        )
                      ) : (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive(item.url)}
                            tooltip={item.title}
                          >
                            <Link to={item.url ?? "#"}>
                              {ItemIcon && <ItemIcon className="size-4 text-muted-foreground/80 transition-colors group-hover/menu-button:text-primary group-data-[active=true]/menu-button:text-primary" />}
                              <span>{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
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
                      {group.icon && <group.icon className="size-4 text-muted-foreground/80 transition-colors group-hover/menu-button:text-primary group-data-[active=true]/menu-button:text-primary" />}
                      <span>{group.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              /* Collapsible group */
              isCollapsed ? (
                <SidebarMenu>
                  <SidebarMenuItem>
                    <CollapsedGroup group={group} />
                  </SidebarMenuItem>
                </SidebarMenu>
              ) : (
                <Collapsible
                  defaultOpen={isGroupActive(group.items)}
                  className="group/collapsible"
                >
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={group.title}>
                          {group.icon && <group.icon className="size-4 text-muted-foreground/80 transition-colors group-hover/menu-button:text-primary group-data-[active=true]/menu-button:text-primary" />}
                          <span>{group.title}</span>
                          <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {group.items.map((item) => {
                            const ItemIcon = item.icon;
                            return item.isSubmenu ? (
                              // Nested submenu (e.g., Content > Articles/Recipes/Roundups)
                              <Collapsible key={item.title} defaultOpen={item.items?.some(sub => isActive(sub.url))} className="group/submenu">
                                <SidebarMenuSubItem>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton className="cursor-pointer">
                                      {ItemIcon && <ItemIcon className="size-4 text-muted-foreground/80 transition-colors group-hover/menu-button:text-primary group-data-[active=true]/menu-button:text-primary" />}
                                      <span>{item.title}</span>
                                      <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/submenu:rotate-90" />
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <SidebarMenuSub className="ml-2 border-l border-border/50">
                                      {item.items?.map((subItem) => {
                                        const SubItemIcon = subItem.icon;
                                        return (
                                          <SidebarMenuSubItem key={subItem.title}>
                                            <SidebarMenuSubButton asChild isActive={isActive(subItem.url)}>
                                              <Link to={subItem.url ?? "#"}>
                                                {SubItemIcon && <SubItemIcon className="h-3.5 w-3.5 text-muted-foreground/80 transition-colors group-hover/menu-button:text-primary group-data-[active=true]/menu-button:text-primary" />}
                                                <span>{subItem.title}</span>
                                              </Link>
                                            </SidebarMenuSubButton>
                                          </SidebarMenuSubItem>
                                        );
                                      })}
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
                                  <Link to={item.url ?? "#"}>
                                    {ItemIcon && <ItemIcon className="size-4 text-muted-foreground/80 transition-colors group-hover/menu-button:text-primary group-data-[active=true]/menu-button:text-primary" />}
                                    <span>{item.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </Collapsible>
              )
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* Footer with User Menu */}
      <SidebarFooter>
        <SidebarMenu>
          {/* Theme Toggle */}
          <SidebarMenuItem>
            <div className={cn(
              "flex items-center px-3 py-2",
              isCollapsed ? "justify-center px-0" : "justify-between"
            )}>
              {!isCollapsed && (
                <span className="text-xs font-medium text-muted-foreground">Theme</span>
              )}
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
                aria-label="Toggle dark mode"
                className={isCollapsed ? "h-5 w-9" : undefined}
              />
            </div>
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
