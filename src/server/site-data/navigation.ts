import { getMenuItems } from "@modules/menus/services/menus.service";
import type { MenuItem } from "@modules/menus/types/menus.types";
import { getCloudflareEnv, getSettingsCache } from "@server/cloudflare/env";

const linkItem = (id: string, label: string, href: string): MenuItem => ({
  id,
  label,
  type: "link",
  is_enabled: true,
  visibility: "all",
  highlight: false,
  target: {
    type: "internal_route",
    href,
  },
});

export const DEFAULT_HEADER_MENU: MenuItem[] = [
  linkItem("nav-1", "Categories", "/categories"),
  linkItem("nav-2", "Recipes", "/recipes"),
  linkItem("nav-3", "Bookmarks", "/my-bookmarks"),
  linkItem("nav-4", "Authors", "/authors"),
  linkItem("nav-5", "About", "/about"),
  linkItem("nav-6", "Contact", "/contact"),
];

export const getHeaderMenu = async (): Promise<MenuItem[]> => {
  try {
    const db = getCloudflareEnv().DB;
    if (!db) return DEFAULT_HEADER_MENU;

    const storedMenu = await getMenuItems(db, "header", {
      cache: getSettingsCache(),
    });
    return Array.isArray(storedMenu) && storedMenu.length > 0
      ? storedMenu
      : DEFAULT_HEADER_MENU;
  } catch (error) {
    console.error("Failed to load header menu:", error);
    return DEFAULT_HEADER_MENU;
  }
};
