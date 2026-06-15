// src/server/site-data/stories/list.ts
import type { D1Database } from "@cloudflare/workers-types";
import { getArticles, getArticleBySlug, type HydratedArticle } from "@modules/articles";
import { getCloudflareEnv } from "@server/cloudflare/env";
import { getPublicOrganizationProfile, getPublicSiteIdentity } from "../settings";
import { isStoryEligible } from "./eligibility";
import { buildStoryPreview } from "./build-preview";
import { buildStory } from "./build-story";
import type { Story, StoryContext, StoryPreview } from "./types";

const STORY_LIMIT = 25;

/** Pure: keep eligible articles, order by trending, and cap to `limit`. */
export function selectStoryArticles(items: HydratedArticle[], limit: number): HydratedArticle[] {
  return items
    .filter(isStoryEligible)
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, limit);
}

/** Resolve publisher + origin context for the AMP page from site settings. */
export async function getStoryContext(options?: { db?: D1Database }): Promise<StoryContext> {
  const [org, identity] = await Promise.all([
    getPublicOrganizationProfile(options),
    getPublicSiteIdentity(options),
  ]);
  return {
    origin: identity.site_url.replace(/\/$/, ""),
    publisher: org.name,
    publisher_logo_url: org.logo_url,
  };
}

/** Ring previews for the homepage bar. */
export async function getStories(options?: { db?: D1Database }): Promise<StoryPreview[]> {
  try {
    const db = options?.db ?? getCloudflareEnv().DB;
    if (!db) return [];

    const recentWindow = new Date();
    recentWindow.setDate(recentWindow.getDate() - 30);

    const trending = await getArticles(db, { workflow_status: "published", publishedAfter: recentWindow, limit: 60 });
    let items = trending.items;
    if (selectStoryArticles(items, STORY_LIMIT).length === 0) {
      const fallback = await getArticles(db, { workflow_status: "published", limit: 60 });
      items = fallback.items;
    }

    return selectStoryArticles(items, STORY_LIMIT)
      .map(buildStoryPreview)
      .filter((p): p is StoryPreview => p !== null);
  } catch (error) {
    console.error("getStories: failed to load stories:", error);
    return [];
  }
}

/** Full story for the AMP page. Returns null when missing or ineligible. */
export async function getStory(slug: string, options?: { db?: D1Database }): Promise<Story | null> {
  const db = options?.db ?? getCloudflareEnv().DB;
  if (!db) return null;

  const article = await getArticleBySlug(db, slug);
  if (!article || !isStoryEligible(article)) return null;

  const ctx = await getStoryContext({ db });
  return buildStory(article, ctx);
}
