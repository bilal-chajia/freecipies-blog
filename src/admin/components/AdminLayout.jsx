"use client";

import * as React from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/breadcrumb";
import { Button } from "@/ui/button";
import { SidebarProvider, SidebarInset } from "@/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import SessionMonitor from "./SessionMonitor";
import GlobalSearch from "./GlobalSearch";
import { Search } from "lucide-react";

// Generate breadcrumb items from current path
const getBreadcrumbs = (pathname) => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard", path: "/" }];

  const breadcrumbs = [{ label: "Dashboard", path: "/" }];
  let currentPath = "";

  const labelMap = {
    articles: "Articles",
    categories: "Categories",
    authors: "Authors",
    tags: "Tags",
    media: "Media",
    settings: "Settings",
    homepage: "Homepage",
    pinterest: "Pinterest",
    boards: "Boards",
    templates: "Templates",
    new: "New",
  };

  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    const label = labelMap[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, path: currentPath });
  });

  return breadcrumbs;
};

const AdminLayout = () => {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const isSettingsPage = location.pathname.includes("/settings");
  const headerClassName = isSettingsPage
    ? "flex h-12 shrink-0 items-center justify-between border-b px-2"
    : "flex h-12 shrink-0 items-center justify-between border-b px-4";
  const mainClassName = isSettingsPage
    ? "flex-1 overflow-auto px-2 py-4"
    : "flex-1 overflow-auto p-6";
  const contentClassName = isSettingsPage
    ? "mx-auto w-full max-w-none"
    : "mx-auto max-w-6xl";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header with Breadcrumb */}
        <header className={headerClassName}>
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={crumb.path}>
                  {index > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink href={`/admin${crumb.path}`}>
                        {crumb.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>

          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-2 text-xs text-muted-foreground"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search...</span>
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              <span className="text-xs">⌘</span>K
            </kbd>
          </Button>
        </header>

        {/* Main Content */}
        <main className={mainClassName}>
          <div className={contentClassName}>
            <Outlet />
          </div>
        </main>
      </SidebarInset>
      <SessionMonitor />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
};

export default AdminLayout;
