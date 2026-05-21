import { getTocSettings } from "@modules/settings/services/settings.service";
import {
  TOC_DEFAULTS,
  type TocSettings,
} from "@modules/settings/types/settings.types";
import type { D1Database, KVNamespace } from "@cloudflare/workers-types";
import { getCloudflareEnv, getSettingsCache } from "@server/cloudflare/env";

export const getSiteTocSettings = async (options?: {
  db?: D1Database;
  cache?: KVNamespace | null;
}): Promise<TocSettings> => {
  try {
    const db = options?.db ?? getCloudflareEnv().DB;
    if (!db) return TOC_DEFAULTS;

    const cache = options?.cache !== undefined ? options.cache : getSettingsCache();
    return await getTocSettings(db, { cache });
  } catch (error) {
    console.error("Failed to load TOC settings:", error);
    return TOC_DEFAULTS;
  }
};
