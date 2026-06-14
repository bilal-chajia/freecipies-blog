// src/server/site-data/stories/__tests__/build-preview.test.ts
import { describe, expect, it } from "vitest";
import { buildStoryPreview } from "../build-preview";
import type { HydratedArticle } from "@modules/articles";

const images = JSON.stringify({
  thumbnail: { alt: "Thumb", variants: { sm: { r2_key: "t-sm.webp", width: 720, height: 720 } } },
});

describe("buildStoryPreview", () => {
  it("builds a ring with slug, headline, public image and story href", () => {
    const article = { type: "recipe", slug: "easy-pasta", headline: "Easy Pasta", images_json: images } as unknown as HydratedArticle;
    expect(buildStoryPreview(article)).toEqual({
      slug: "easy-pasta",
      headline: "Easy Pasta",
      image: { url: "/api/images/t-sm.webp", alt: "Thumb", width: 720, height: 720 },
      href: "/stories/easy-pasta",
    });
  });

  it("never leaks an r2_key in the preview image url", () => {
    const article = { type: "article", slug: "guide", headline: "Guide", images_json: images } as unknown as HydratedArticle;
    const preview = buildStoryPreview(article);
    expect(preview?.image.url.includes("r2")).toBe(false);
    expect(preview?.image.url.startsWith("/api/images/")).toBe(true);
  });

  it("returns null when no usable cover image exists", () => {
    const article = { type: "article", slug: "x", headline: "X", images_json: null } as unknown as HydratedArticle;
    expect(buildStoryPreview(article)).toBeNull();
  });
});
