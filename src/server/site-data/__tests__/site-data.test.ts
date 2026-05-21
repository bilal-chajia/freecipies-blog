import { describe, expect, it } from "vitest";
import { presentHeaderMenu, presentPopularRecipes, presentStories } from "../presenters";
import type { HydratedArticle } from "@modules/articles";

describe("Site-Data Presenters", () => {
  describe("presentHeaderMenu", () => {
    it("should return DEFAULT_HEADER_MENU if storedMenu is empty, null, or undefined", () => {
      expect(presentHeaderMenu(null)).toHaveLength(6);
      expect(presentHeaderMenu(undefined)).toHaveLength(6);
      expect(presentHeaderMenu([])).toHaveLength(6);
    });

    it("should return storedMenu if it is a valid non-empty array", () => {
      const customMenu = [{ id: "test", label: "Test", type: "link" }];
      const result = presentHeaderMenu(customMenu);
      expect(result).toBe(customMenu);
      expect(result[0].label).toBe("Test");
    });
  });

  describe("presentPopularRecipes", () => {
    const mockRecipes = [
      { id: 1, slug: "recipe-a", headline: "Recipe A" },
      { id: 2, slug: "recipe-b", headline: "Recipe B" },
      { id: 3, slug: "recipe-c", headline: "Recipe C" },
    ] as HydratedArticle[];

    it("should return an empty array if recipes is undefined", () => {
      expect(presentPopularRecipes(undefined, "recipe-a", 5)).toEqual([]);
    });

    it("should filter out the current slug and limit results", () => {
      const result = presentPopularRecipes(mockRecipes, "recipe-b", 2);
      expect(result).toHaveLength(2);
      expect(result[0].slug).toBe("recipe-a");
      expect(result[1].slug).toBe("recipe-c");
    });

    it("should obey the limit correctly", () => {
      const result = presentPopularRecipes(mockRecipes, "", 1);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe("recipe-a");
    });
  });

  describe("presentStories", () => {
    it("should sort stories by viewCount descending and build previews and slides", () => {
      const mockStories = [
        {
          id: 1,
          headline: "Low Views",
          viewCount: 10,
          slug: "low",
          imagesJson: JSON.stringify({
            thumbnail: {
              variants: {
                xs: { r2_key: "low-xs.jpg", width: 120, height: 120 },
              },
            },
          }),
        },
        {
          id: 2,
          headline: "High Views",
          viewCount: 100,
          slug: "high",
          imageUrl: "fallback-high.jpg",
          imagesJson: null,
        },
      ] as unknown as HydratedArticle[];

      const result = presentStories(mockStories);

      // Verify sorting by viewCount descending
      expect(result).toHaveLength(2);
      expect(result[0].headline).toBe("High Views");
      expect(result[1].headline).toBe("Low Views");

      // Verify storyImage selection and fallbacks
      expect(result[0].storyImage).toBe("fallback-high.jpg"); // Falls back to story.imageUrl since there is no imagesJson
      expect(result[1].storyImage).toBe("/api/images/low-xs.jpg"); // Uses preview since no hero and hero fallback is xs

      // Verify storyPreview building
      expect(result[0].storyPreview).toEqual({
        imageUrl: "fallback-high.jpg",
        imageAlt: "High Views",
        imageWidth: 80,
        imageHeight: 80,
        imageStyle: undefined,
        srcSet: "",
      });

      // Verify page layout formatting (with fallback images / swipe page)
      expect(result[0].storyPages).toEqual([
        {
          imageUrl: "fallback-high.jpg",
          title: "High Views",
          text: "",
        },
        {
          imageUrl: "fallback-high.jpg",
          title: "Swipe to continue",
          text: "Tap right to see more",
        },
        {
          imageUrl: "fallback-high.jpg",
          title: "High Views",
          text: "Ready to cook?",
        },
      ]);
    });

    it("should omit the Swipe to continue page if there is no storyImage", () => {
      const mockStories = [
        {
          id: 3,
          headline: "No Image Story",
          viewCount: 5,
          slug: "no-image",
          imagesJson: null,
        },
      ] as unknown as HydratedArticle[];

      const result = presentStories(mockStories);
      expect(result[0].storyPages).toHaveLength(2);
      expect(result[0].storyPages[0].title).toBe("No Image Story");
      expect(result[0].storyPages[1].text).toBe("Ready to cook?");
    });
  });
});
