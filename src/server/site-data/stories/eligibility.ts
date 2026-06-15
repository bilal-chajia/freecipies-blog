// src/server/site-data/stories/eligibility.ts
import type { HydratedArticle, RecipeContent } from "@modules/articles";
import type { RecipeJson } from "@modules/articles/types/recipes.types";
import { buildImagePool } from "./images";

function hasCoverImage(article: HydratedArticle): boolean {
  const pool = buildImagePool(article.images_json, article.headline ?? "");
  if (pool.hero) return true;
  // Fall back to the legacy flat image_url some rows still carry.
  return typeof (article as { image_url?: string }).image_url === "string"
    && (article as { image_url?: string }).image_url!.trim() !== "";
}

function recipeHasContent(recipe: RecipeJson | null | undefined): boolean {
  if (!recipe) return false;
  const stepCount = (recipe.instructions ?? []).reduce((n, s) => n + (s.steps?.length ?? 0), 0);
  const ingredientCount = (recipe.ingredients ?? []).reduce((n, g) => n + (g.items?.length ?? 0), 0);
  return stepCount > 0 || ingredientCount > 0;
}

function nonRecipeHasContent(article: HydratedArticle): boolean {
  if (typeof article.short_description === "string" && article.short_description.trim() !== "") return true;
  const content = article.content_json;
  return typeof content === "string" && content.includes('"blocks":') && !content.includes('"blocks":[]');
}

/** A published article is eligible when it has a cover image and usable content. */
export function isStoryEligible(article: HydratedArticle | null | undefined): boolean {
  if (!article) return false;
  if (article.workflow_status !== "published") return false;
  if (!hasCoverImage(article)) return false;

  if (article.type === "recipe") {
    const typed = article as RecipeContent;
    const recipe = typed.recipe ?? typed.recipe_json ?? null;
    return recipeHasContent(recipe);
  }
  return nonRecipeHasContent(article);
}
