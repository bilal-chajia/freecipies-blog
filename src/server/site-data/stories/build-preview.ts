// src/server/site-data/stories/build-preview.ts
import type { HydratedArticle } from "@modules/articles";
import { buildImagePool, slotToStoryImage } from "./images";
import { safeParseJson } from "@shared/utils";
import type { StoryImage, StoryPreview } from "./types";

/** Prefer the thumbnail slot for the ring; fall back to hero, then content. */
function previewImage(article: HydratedArticle): StoryImage | null {
  const headline = article.headline ?? "";
  const parsed = safeParseJson<Record<string, unknown>>(article.images_json);
  const thumb = parsed ? slotToStoryImage(parsed.thumbnail, headline) : null;
  if (thumb) return thumb;
  const pool = buildImagePool(article.images_json, headline);
  return pool.hero ?? pool.content[0] ?? null;
}

export function buildStoryPreview(article: HydratedArticle): StoryPreview | null {
  const image = previewImage(article);
  if (!image) return null;
  return {
    slug: article.slug,
    headline: article.headline ?? "",
    image,
    href: `/stories/${article.slug}`,
  };
}
