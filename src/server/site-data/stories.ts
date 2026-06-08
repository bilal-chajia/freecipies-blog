import { getArticles, type HydratedArticle } from "@modules/articles";
import type { D1Database } from "@cloudflare/workers-types";
import { getCloudflareEnv } from "@server/cloudflare/env";
import { presentStories, type StoryPreview, type StoryPageData } from "./presenters";

export { presentStories };
export type { StoryPreview, StoryPageData };

export const getStories = async (options?: { db?: D1Database }): Promise<StoryPageData[]> => {
  try {
    const db = options?.db ?? getCloudflareEnv().DB;
    if (!db) return [];

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const result = await getArticles(db, {
      workflow_status: 'published',
      publishedAfter: oneDayAgo,
      limit: 15,
    });

    let stories = result.items;
    if (stories.length === 0) {
      const fallback = await getArticles(db, { limit: 12 });
      stories = fallback.items;
    }

    return presentStories(stories);
  } catch (error) {
    console.error("StoriesBar: Error fetching stories:", error);
    return [];
  }
};
