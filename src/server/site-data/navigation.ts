import { getMenuItems } from "@modules/menus/services/menus.service";
import type { MenuItem } from "@modules/menus/types/menus.types";
import { getCloudflareEnv } from "@server/cloudflare/env";

export const DEFAULT_HEADER_MENU: MenuItem[] = [
  { id: "nav-1", label: "Categories", type: "link", url: "/categories" },
  { id: "nav-2", label: "Recipes", type: "link", url: "/recipes" },
  { id: "nav-3", label: "Bookmarks", type: "link", url: "/my-bookmarks" },
  { id: "nav-4", label: "Authors", type: "link", url: "/authors" },
  { id: "nav-5", label: "About", type: "link", url: "/about" },
  { id: "nav-6", label: "Contact", type: "link", url: "/contact" },
];

export const getHeaderMenu = async (): Promise<MenuItem[]> => {
  try {
    const db = getCloudflareEnv().DB;
    if (!db) return DEFAULT_HEADER_MENU;

    const storedMenu = await getMenuItems(db, "header");
    return Array.isArray(storedMenu) && storedMenu.length > 0
      ? storedMenu
      : DEFAULT_HEADER_MENU;
  } catch (error) {
    console.error("Failed to load header menu:", error);
    return DEFAULT_HEADER_MENU;
  }
};
