import * as React from "react";

export interface SidebarContextValue {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  isMobile: boolean;
  openMobile: boolean;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
}

export function useSidebar(): SidebarContextValue;

interface SidebarProviderProps {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const SidebarProvider: React.FC<SidebarProviderProps>;

interface SidebarProps {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
  className?: string;
  children?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps>;

interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const SidebarTrigger: React.FC<SidebarTriggerProps>;
export const SidebarRail: React.FC<React.HTMLAttributes<HTMLButtonElement>>;
export const SidebarInset: React.FC<React.HTMLAttributes<HTMLElement>>;
export const SidebarInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>>;
export const SidebarHeader: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export const SidebarFooter: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export const SidebarSeparator: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export const SidebarContent: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export const SidebarGroup: React.FC<React.HTMLAttributes<HTMLDivElement>>;

interface SidebarGroupLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

export const SidebarGroupLabel: React.FC<SidebarGroupLabelProps>;

interface SidebarGroupActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const SidebarGroupAction: React.FC<SidebarGroupActionProps>;
export const SidebarGroupContent: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export const SidebarMenu: React.FC<React.HTMLAttributes<HTMLUListElement>>;
export const SidebarMenuItem: React.FC<React.HTMLAttributes<HTMLLIElement>>;

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  is_active?: boolean;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  tooltip?: React.ReactNode;
  className?: string;
}

export const SidebarMenuButton: React.FC<SidebarMenuButtonProps>;
export const SidebarMenuAction: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean; showOnHover?: boolean; className?: string }>;
export const SidebarMenuBadge: React.FC<React.HTMLAttributes<HTMLDivElement>>;
export const SidebarMenuSkeleton: React.FC<{ showIcon?: boolean; className?: string }>;
export const SidebarMenuSub: React.FC<React.HTMLAttributes<HTMLUListElement>>;
export const SidebarMenuSubItem: React.FC<React.HTMLAttributes<HTMLLIElement>>;

interface SidebarMenuSubButtonProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  asChild?: boolean;
  size?: "md" | "sm";
  is_active?: boolean;
  className?: string;
}

export const SidebarMenuSubButton: React.FC<SidebarMenuSubButtonProps>;
