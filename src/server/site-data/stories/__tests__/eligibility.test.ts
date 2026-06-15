// src/server/site-data/stories/__tests__/eligibility.test.ts
import { describe, expect, it } from "vitest";
import { isStoryEligible } from "../eligibility";
import type { HydratedArticle } from "@modules/articles";

const heroImages = JSON.stringify({
  hero: { alt: "Hero", variants: { md: { r2_key: "hero-md.webp", width: 1200, height: 800 } } },
});

function article(overrides: Record<string, unknown>): HydratedArticle {
  return {
    type: "article",
    headline: "Headline",
    slug: "slug",
    workflow_status: "published",
    short_description: "A tasty thing",
    images_json: heroImages,
    ...overrides,
  } as unknown as HydratedArticle;
}

describe("isStoryEligible", () => {
  it("accepts a published non-recipe with a cover image and a description", () => {
    expect(isStoryEligible(article({}))).toBe(true);
  });

  it("rejects unpublished articles", () => {
    expect(isStoryEligible(article({ workflow_status: "draft" }))).toBe(false);
  });

  it("rejects when there is no usable cover image", () => {
    expect(isStoryEligible(article({ images_json: null, image_url: undefined }))).toBe(false);
  });

  it("rejects a non-recipe with no description and no content", () => {
    expect(isStoryEligible(article({ short_description: "", content_json: null }))).toBe(false);
  });

  it("accepts a recipe with at least one instruction step", () => {
    const recipe = article({
      type: "recipe",
      recipe: { ingredients: [], instructions: [{ section_title: "S", steps: [{ text: "Do it" }] }] },
    });
    expect(isStoryEligible(recipe)).toBe(true);
  });

  it("rejects a recipe with no steps and no ingredients", () => {
    const recipe = article({ type: "recipe", recipe: { ingredients: [], instructions: [] } });
    expect(isStoryEligible(recipe)).toBe(false);
  });
});
