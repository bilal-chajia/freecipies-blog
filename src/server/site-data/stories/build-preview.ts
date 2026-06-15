// src/server/site-data/stories/build-preview.ts
import type { HydratedArticle } from "@modules/articles";
import { PREVIEW_VARIANT_ORDER, slotToStoryImage } from "./images";
import { safeParseJson } from "@shared/utils";
import type { StoryImage, StoryPreview } from "./types";

/**
 * Resolve the ring preview image, smallest-variant-first: the ring renders at
 * ~76px, so serving `xs` (when available) instead of the full-screen `lg`/`sm`
 * keeps the homepage light. Prefer the thumbnail slot, then hero, then content.
 */
function previewImage(article: HydratedArticle): StoryImage | null {
  const headline = article.headline ?? "";
  const parsed = safeParseJson<Record<string, unknown>>(article.images_json);
  if (!parsed) return null;

  const thumb = slotToStoryImage(parsed.thumbnail, headline, PREVIEW_VARIANT_ORDER);
  if (thumb) return thumb;

  const hero = slotToStoryImage(parsed.hero, headline, PREVIEW_VARIANT_ORDER);
  if (hero) return hero;

  const rawContent = parsed.content_images;
  if (rawContent && typeof rawContent === "object") {
    for (const slot of Object.values(rawContent as Record<string, unknown>)) {
      const img = slotToStoryImage(slot, headline, PREVIEW_VARIANT_ORDER);
      if (img) return img;
    }
  }
  return null;
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
