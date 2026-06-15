// src/server/site-data/stories/__tests__/images.test.ts
import { describe, expect, it } from "vitest";
import { slotToStoryImage, buildImagePool } from "../images";

describe("slotToStoryImage", () => {
  it("picks the largest available variant and resolves its public url", () => {
    const slot = {
      alt: "Bowl of pasta",
      variants: {
        xs: { r2_key: "p-xs.webp", width: 360, height: 240 },
        md: { r2_key: "p-md.webp", width: 1200, height: 800 },
      },
    };
    expect(slotToStoryImage(slot, "fallback")).toEqual({
      url: "/api/images/p-md.webp",
      alt: "Bowl of pasta",
      width: 1200,
      height: 800,
    });
  });

  it("uses the fallback alt when the slot has none", () => {
    const slot = { variants: { sm: { r2_key: "p-sm.webp", width: 720, height: 480 } } };
    expect(slotToStoryImage(slot, "My Headline")?.alt).toBe("My Headline");
  });

  it("returns null when there is no usable variant", () => {
    expect(slotToStoryImage(null, "x")).toBeNull();
    expect(slotToStoryImage({ variants: {} }, "x")).toBeNull();
  });
});

describe("buildImagePool", () => {
  it("extracts hero, recipe step images (keyed by ref), and content images", () => {
    const images_json = JSON.stringify({
      hero: { alt: "Hero", variants: { md: { r2_key: "hero-md.webp", width: 1200, height: 800 } } },
      recipe_steps: {
        "boil-water": { alt: "Boiling", variants: { sm: { r2_key: "boil-sm.webp", width: 720, height: 480 } } },
      },
      content_images: {
        "img-1": { alt: "In content", variants: { sm: { r2_key: "c1-sm.webp", width: 720, height: 480 } } },
      },
    });
    const pool = buildImagePool(images_json, "Headline");
    expect(pool.hero?.url).toBe("/api/images/hero-md.webp");
    expect(pool.steps["boil-water"]?.url).toBe("/api/images/boil-sm.webp");
    expect(pool.content.map((i) => i.url)).toEqual(["/api/images/c1-sm.webp"]);
  });

  it("returns empty structures for null/garbage images_json", () => {
    const pool = buildImagePool(null, "Headline");
    expect(pool.hero).toBeNull();
    expect(pool.steps).toEqual({});
    expect(pool.content).toEqual([]);
  });

  it("falls back to thumbnail when hero slot is absent", () => {
    const images_json = JSON.stringify({
      thumbnail: { alt: "Thumb", variants: { sm: { r2_key: "t-sm.webp", width: 720, height: 480 } } },
    });
    const pool = buildImagePool(images_json, "Title");
    expect(pool.hero?.url).toBe("/api/images/t-sm.webp");
  });

  it("preserves content image order across multiple images", () => {
    const images_json = JSON.stringify({
      content_images: {
        "img-1": { alt: "One", variants: { sm: { r2_key: "c1.webp", width: 720, height: 480 } } },
        "img-2": { alt: "Two", variants: { sm: { r2_key: "c2.webp", width: 720, height: 480 } } },
      },
    });
    const pool = buildImagePool(images_json, "Title");
    expect(pool.content.map((i) => i.url)).toEqual(["/api/images/c1.webp", "/api/images/c2.webp"]);
  });
});
