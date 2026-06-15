// src/server/site-data/stories/__tests__/build-story.test.ts
import { describe, expect, it } from "vitest";
import { buildStory } from "../build-story";
import type { HydratedArticle } from "@modules/articles";
import type { StoryContext } from "../types";

const ctx: StoryContext = {
  origin: "https://site.com",
  publisher: "Freecipies",
  publisher_logo_url: "https://site.com/logo.png",
};

const heroImages = JSON.stringify({
  hero: { alt: "Hero", variants: { md: { r2_key: "hero-md.webp", width: 1200, height: 800 } } },
  recipe_steps: {
    "s1": { alt: "Step one", variants: { sm: { r2_key: "s1-sm.webp", width: 720, height: 480 } } },
  },
});

function recipeArticle(recipe: Record<string, unknown>): HydratedArticle {
  return {
    type: "recipe",
    slug: "easy-pasta",
    headline: "Easy Pasta",
    short_description: "A quick weeknight pasta.",
    route: "/recipes/easy-pasta",
    images_json: heroImages,
    recipe,
  } as unknown as HydratedArticle;
}

describe("buildStory — recipe", () => {
  const story = buildStory(recipeArticle({
    total: 30, servings: 4,
    aggregate_rating: { rating_value: 4.8, rating_count: 12 },
    ingredients: [{ group_title: "Main", items: Array.from({ length: 10 }, (_, i) => ({ amount: 1, unit: "cup", name: `ing ${i + 1}`, is_optional: false })) }],
    instructions: [{ section_title: "Cook", steps: Array.from({ length: 9 }, (_, i) => ({ text: `Step ${i + 1} text`, ...(i === 0 ? { image_ref: "s1" } : {}) })) }],
    nutrition: { basis: "per_serving", serving_size: { label: "1 plate", grams: 300 }, servings_per_recipe: 4, calories: 520, total_fat_g: 18, sodium_mg: 600, total_carbohydrate_g: 60, protein_g: 22, status: "validated" },
  }), ctx);

  it("starts with a cover carrying headline, description and meta", () => {
    expect(story.slides[0].kind).toBe("cover");
    expect(story.slides[0].heading).toBe("Easy Pasta");
    expect(story.slides[0].meta).toMatchObject({ total_time: "30 min", servings: "4 servings", rating: "4.8" });
  });

  it("caps ingredients at 8 with a '+N autres' trailing item", () => {
    const ing = story.slides.find((s) => s.kind === "ingredients");
    expect(ing?.items).toHaveLength(9); // 8 + summary line
    expect(ing?.items?.[8]).toBe("+2 more");
  });

  it("caps steps at 7 and resolves a step image when present", () => {
    const steps = story.slides.filter((s) => s.kind === "step");
    expect(steps).toHaveLength(7);
    expect(steps[0].image?.url).toBe("/api/images/s1-sm.webp");
    expect(steps[0].heading).toBe("Step 1");
  });

  it("falls back to the hero image for steps without a dedicated step image", () => {
    const steps = story.slides.filter((s) => s.kind === "step");
    // Only step 1 carries an image_ref ("s1"); the rest reuse the hero, never
    // borrowing unrelated body images.
    expect(steps[1].image?.url).toBe("/api/images/hero-md.webp");
  });

  it("adds a nutrition info slide before the CTA when validated", () => {
    const kinds = story.slides.map((s) => s.kind);
    expect(kinds).toContain("info");
    expect(kinds[kinds.length - 1]).toBe("cta");
    const nutrition = story.slides.find((s) => s.id === "nutrition");
    expect(nutrition?.body).toContain("520");
  });

  it("ends with a CTA targeting the full article", () => {
    const cta = story.slides[story.slides.length - 1];
    expect(cta.kind).toBe("cta");
    expect(story.target_url).toBe("/recipes/easy-pasta");
  });

  it("sets canonical and poster from context and hero", () => {
    expect(story.canonical_url).toBe("https://site.com/stories/easy-pasta");
    expect(story.publisher).toBe("Freecipies");
    expect(story.poster_portrait_url).toBe("https://site.com/api/images/hero-md.webp");
  });
});

describe("buildStory — non-recipe and fallback", () => {
  it("builds cover + cta for an article with only a description", () => {
    const article = {
      type: "article", slug: "guide", headline: "Knife Guide",
      short_description: "How to choose a knife.", route: "/articles/guide", images_json: heroImages,
    } as unknown as HydratedArticle;
    const story = buildStory(article, ctx);
    expect(story.slides.map((s) => s.kind)).toEqual(["cover", "cta"]);
  });

  it("inserts an info slide from the subtitle for a non-recipe", () => {
    const article = {
      type: "article", slug: "guide", headline: "Knife Guide",
      short_description: "How to choose a knife.", subtitle: "A buyer's guide to kitchen knives.",
      route: "/articles/guide", images_json: heroImages,
    } as unknown as HydratedArticle;
    const story = buildStory(article, ctx);
    expect(story.slides.map((s) => s.kind)).toEqual(["cover", "info", "cta"]);
  });

  it("falls back to non-recipe composition when a recipe has no steps/ingredients", () => {
    const story = buildStory(recipeArticle({ ingredients: [], instructions: [] }), ctx);
    expect(story.slides.some((s) => s.kind === "ingredients" || s.kind === "step")).toBe(false);
    expect(story.slides[0].kind).toBe("cover");
    expect(story.slides[story.slides.length - 1].kind).toBe("cta");
  });
});
