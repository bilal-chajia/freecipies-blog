"use client";

import * as React from "react";
import { useLocation, Link } from "react-router-dom";
import { AnimatedOutlet } from "./AnimatedOutlet";
import PageLoader from "./PageLoader";
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

interface Crumb {
  label: string;
  path: string;
}

const LABEL_MAP: Record<string, string> = {
  articles: "Articles",
  categories: "Categories",
  authors: "Authors",
  tags: "Tags",
  media: "Media",
  redirects: "Redirects",
  settings: "Settings",
  homepage: "Homepage",
  pinterest: "Pinterest",
  boards: "Boards",
  templates: "Templates",
  new: "New",
};

const getBreadcrumbs = (pathname: string): Crumb[] => {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Dashboard", path: "/" }];

  const breadcrumbs: Crumb[] = [{ label: "Dashboard", path: "/" }];
  let currentPath = "";

  if (segments[0] === "settings") {
    breadcrumbs.push({ label: "Settings", path: "/settings/general" });
    return breadcrumbs;
  }

  if (segments[0] === "homepage") {
    breadcrumbs.push({ label: "Homepage", path: "/homepage/hero" });
    return breadcrumbs;
  }

  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    const label = LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    breadcrumbs.push({ label, path: currentPath });
  });

  return breadcrumbs;
};

const AdminLayout: React.FC = () => {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const isSettingsPage = location.pathname.includes("/settings");
  const isHomepagePage = location.pathname.includes("/homepage");
  const isEditorPage = /\/(articles|recipes|roundups)\/(new|[^/]+)$/.test(location.pathname);
  const isPanelLayout = isSettingsPage || isHomepagePage;

  const headerClassName = isPanelLayout
    ? "flex h-11 shrink-0 items-center justify-between border-b px-3 bg-card"
    : "flex h-11 shrink-0 items-center justify-between border-b px-4 bg-card";
  const insetClassName = isEditorPage || isPanelLayout
    ? "min-h-0 overflow-hidden h-[100svh] bg-background"
    : "h-svh overflow-hidden flex flex-col bg-background";
  const mainClassName = isPanelLayout
    ? "flex-1 overflow-hidden min-h-0 flex flex-col"
    : isEditorPage
      ? "flex-1 overflow-hidden min-h-0 flex flex-col"
      : "flex-1 overflow-auto overscroll-y-contain p-4 lg:p-6 bg-background";
  const contentClassName = isPanelLayout
    ? "w-full h-full flex-1 min-h-0 overflow-hidden flex flex-col"
    : isEditorPage
      ? "mx-auto w-full max-w-none flex-1 min-h-0 overflow-hidden flex flex-col"
      : "mx-auto max-w-7xl";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className={insetClassName}>
        {!isEditorPage && (
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
                        <BreadcrumbLink asChild>
                          <Link to={crumb.path}>
                            {crumb.label}
                          </Link>
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
        )}

        <main className={mainClassName}>
          <div className={contentClassName}>
            <React.Suspense fallback={<PageLoader />}>
              <AnimatedOutlet />
            </React.Suspense>
          </div>
        </main>
      </SidebarInset>
      <SessionMonitor />
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </SidebarProvider>
  );
};

export default AdminLayout;
