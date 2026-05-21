import { getMenuItems } from "@modules/menus/services/menus.service";
import type { MenuItem } from "@modules/menus/types/menus.types";
import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { getCloudflareEnv, getSettingsCache } from "@server/cloudflare/env";
import { presentHeaderMenu, DEFAULT_HEADER_MENU } from "./presenters";

export { presentHeaderMenu };

export const getHeaderMenu = async (options?: {
  db?: D1Database;
  cache?: KVNamespace | null;
}): Promise<MenuItem[]> => {
  try {
    const db = options?.db ?? getCloudflareEnv().DB;
    if (!db) return DEFAULT_HEADER_MENU;

    const cache = options?.cache !== undefined ? options.cache : getSettingsCache();

    const storedMenu = await getMenuItems(db, "header", { cache });
    return presentHeaderMenu(storedMenu);
  } catch (error) {
    console.error("Failed to load header menu:", error);
    return DEFAULT_HEADER_MENU;
  }
};
