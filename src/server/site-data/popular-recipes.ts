import { getArticles, type HydratedArticle } from "@modules/articles";
import { getCloudflareEnv } from "@server/cloudflare/env";

export const getPopularRecipes = async (
  currentSlug = "",
  limit = 5,
): Promise<HydratedArticle[]> => {
  try {
    const db = getCloudflareEnv().DB;
    if (!db) return [];

    const result = await getArticles(db, {
      type: "recipe",
      limit: limit + 1,
    });

    return (result.items || [])
      .filter((recipe) => recipe.slug !== currentSlug)
      .slice(0, limit);
  } catch (error) {
    console.error("Error loading popular recipes:", error);
    return [];
  }
};
