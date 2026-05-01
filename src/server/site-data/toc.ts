import { getTocSettings } from "@modules/settings/services/settings.service";
import {
  TOC_DEFAULTS,
  type TocSettings,
} from "@modules/settings/types/settings.types";
import { getCloudflareEnv } from "@server/cloudflare/env";

export const getSiteTocSettings = async (): Promise<TocSettings> => {
  try {
    const db = getCloudflareEnv().DB;
    return db ? await getTocSettings(db) : TOC_DEFAULTS;
  } catch (error) {
    console.error("Failed to load TOC settings:", error);
    return TOC_DEFAULTS;
  }
};
