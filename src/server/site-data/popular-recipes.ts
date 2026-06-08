import { getArticles, type HydratedArticle } from "@modules/articles";
import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareEnv } from "@server/cloudflare/env";
import { presentPopularRecipes } from "./presenters";

export { presentPopularRecipes };

export const getPopularRecipes = async (
  currentSlug = "",
  limit = 5,
  options?: { db?: D1Database }
): Promise<HydratedArticle[]> => {
  try {
    const db = options?.db ?? getCloudflareEnv().DB;
    if (!db) return [];

    const result = await getArticles(db, {
      type: "recipe",
      limit: limit + 1,
    });

    return presentPopularRecipes(result.items, currentSlug, limit);
  } catch (error) {
    console.error("Error loading popular recipes:", error);
    return [];
  }
};
