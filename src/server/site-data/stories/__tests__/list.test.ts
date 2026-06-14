// src/server/site-data/stories/__tests__/list.test.ts
import { describe, expect, it } from "vitest";
import { selectStoryArticles } from "../list";
import type { HydratedArticle } from "@modules/articles";

const images = JSON.stringify({
  hero: { alt: "Hero", variants: { md: { r2_key: "h-md.webp", width: 1200, height: 800 } } },
});

function art(over: Record<string, unknown>): HydratedArticle {
  return {
    type: "article", workflow_status: "published", headline: "H", slug: "s",
    short_description: "desc", images_json: images, view_count: 0, ...over,
  } as unknown as HydratedArticle;
}

describe("selectStoryArticles", () => {
  it("keeps only eligible articles, orders by view_count desc, and applies the limit", () => {
    const items = [
      art({ slug: "a", view_count: 5 }),
      art({ slug: "b", view_count: 50 }),
      art({ slug: "c", view_count: 20, workflow_status: "draft" }), // ineligible
      art({ slug: "d", view_count: 30 }),
    ];
    const result = selectStoryArticles(items, 2);
    expect(result.map((a) => a.slug)).toEqual(["b", "d"]);
  });

  it("drops ineligible (no cover image) articles", () => {
    const items = [art({ slug: "a", view_count: 9, images_json: null, image_url: undefined })];
    expect(selectStoryArticles(items, 25)).toHaveLength(0);
  });
});
