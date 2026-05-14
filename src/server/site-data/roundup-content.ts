import { articles } from "@modules/articles/schema/articles.schema";
import { getDb } from "@shared/database/drizzle";
import { hydrateArticles } from "@shared/utils/hydration";
import { getCloudflareEnv } from "@server/cloudflare/env";
import { inArray } from "drizzle-orm";

export type RoundupArticleMap = Record<number, unknown>;

const parseJson = (value: unknown): unknown => {
  if (!value || typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const collectRoundupItems = (article: Record<string, unknown>): unknown[] => {
  const contentJson = parseJson(article.contentJson);
  const blocks = Array.isArray(contentJson)
    ? contentJson
    : Array.isArray((contentJson as { blocks?: unknown[] } | null)?.blocks)
      ? (contentJson as { blocks: unknown[] }).blocks
      : [];
  const roundupJson = parseJson(article.roundupJson);
  const roundupItems = Array.isArray(
    (roundupJson as { items?: unknown[] } | null)?.items,
  )
    ? (roundupJson as { items: unknown[] }).items
    : [];

  return [
    ...roundupItems,
    ...blocks.flatMap((block) => {
      if (!block || typeof block !== "object") return [];
      const typedBlock = block as {
        type?: string;
        items?: unknown[];
        props?: { items?: unknown[]; itemsJson?: string };
      };
      if (typedBlock.type !== "roundup_item") return [];
      const propsItems =
        typeof typedBlock.props?.itemsJson === "string"
          ? parseJson(typedBlock.props.itemsJson)
          : typedBlock.props?.items;
      return Array.isArray(propsItems)
        ? propsItems
        : Array.isArray(typedBlock.items)
          ? typedBlock.items
          : [typedBlock];
    }),
  ];
};

export const getRoundupArticleMap = async (
  article: Record<string, unknown>,
): Promise<RoundupArticleMap> => {
  const ids = [
    ...new Set(
      collectRoundupItems(article)
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const value = item as { articleId?: unknown; article_id?: unknown };
          const id = value.articleId ?? value.article_id;
          return typeof id === "number" ? id : null;
        })
        .filter((id): id is number => id !== null),
    ),
  ];

  if (ids.length === 0) return {};

  try {
    const db = getCloudflareEnv().DB;
    if (!db) return {};

    const drizzle = getDb(db);
    const results = await drizzle
      .select({
        id: articles.id,
        slug: articles.slug,
        headline: articles.headline,
        subtitle: articles.subtitle,
        excerpt: articles.excerpt,
        imagesJson: articles.imagesJson,
        type: articles.type,
        authorId: articles.authorId,
        categoryId: articles.categoryId,
        cachedRecipeJson: articles.cachedRecipeJson,
        cachedRatingJson: articles.cachedRatingJson,
        cachedAuthorJson: articles.cachedAuthorJson,
        shortDescription: articles.shortDescription,
      })
      .from(articles)
      .where(inArray(articles.id, ids));

    return Object.fromEntries(
      hydrateArticles(
        results.map((result) => {
          const cachedRecipe = parseJson(result.cachedRecipeJson) as {
            totalTimeMinutes?: unknown;
            total_time_minutes?: unknown;
            difficulty?: unknown;
          } | null;
          return {
            ...result,
            totalTimeMinutes:
              typeof cachedRecipe?.totalTimeMinutes === "number"
                ? cachedRecipe.totalTimeMinutes
                : typeof cachedRecipe?.total_time_minutes === "number"
                  ? cachedRecipe.total_time_minutes
                  : null,
            difficultyLabel:
              typeof cachedRecipe?.difficulty === "string"
                ? cachedRecipe.difficulty
                : null,
          };
        }),
      ).map((hydrated) => [hydrated.id, hydrated]),
    );
  } catch (error) {
    console.error("Failed to load roundup article data:", error);
    return {};
  }
};
