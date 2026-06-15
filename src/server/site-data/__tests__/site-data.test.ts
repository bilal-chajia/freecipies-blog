import { describe, expect, it } from "vitest";
import { presentHeaderMenu, presentPopularRecipes } from "../presenters";
import type { HydratedArticle } from "@modules/articles";

describe("Site-Data Presenters", () => {
  describe("presentHeaderMenu", () => {
    it("should return DEFAULT_HEADER_MENU if storedMenu is empty, null, or undefined", () => {
      expect(presentHeaderMenu(null)).toHaveLength(6);
      expect(presentHeaderMenu(undefined)).toHaveLength(6);
      expect(presentHeaderMenu([])).toHaveLength(6);
    });

    it("should return normalized menu if it is a valid non-empty array", () => {
      const customMenu = [{ id: "test", label: "Test", type: "link" }];
      const result = presentHeaderMenu(customMenu);
      expect(result).toEqual([
        {
          id: "test",
          label: "Test",
          type: "link",
          is_enabled: true,
          visibility: "all",
          highlight: false,
          open_in_new_tab: false,
        }
      ]);
    });

    it("should filter out items that have is_enabled: false", () => {
      const input = [
        { id: "item-1", label: "Enabled Link", type: "link", is_enabled: true },
        { id: "item-2", label: "Disabled Link", type: "link", is_enabled: false },
      ];
      const result = presentHeaderMenu(input);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("item-1");
    });

    it("should filter out items that lack an id or type", () => {
      const input = [
        { label: "No ID", type: "link" },
        { id: "no-type", label: "No Type" },
        { id: "valid", label: "Valid", type: "link" },
      ];
      const result = presentHeaderMenu(input);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("valid");
    });

    it("should preserve valid standard link items with correct defaults", () => {
      const input = [
        {
          id: "nav-1",
          type: "link",
          label: "Home",
          target: { type: "internal_route", href: "/" },
          highlight: true,
          open_in_new_tab: true,
          visibility: "desktop",
        }
      ];
      const result = presentHeaderMenu(input);
      expect(result).toEqual([
        {
          id: "nav-1",
          type: "link",
          label: "Home",
          is_enabled: true,
          visibility: "desktop",
          highlight: true,
          open_in_new_tab: true,
          target: { type: "internal_route", href: "/" },
        }
      ]);
    });

    it("should preserve groups with recursively nested child items", () => {
      const input = [
        {
          id: "group-1",
          type: "group",
          label: "Parent Group",
          items: [
            { id: "child-1", type: "link", label: "Child 1", is_enabled: true },
            { id: "child-2", type: "link", label: "Child 2", is_enabled: false }, // should be filtered out
          ],
        }
      ];
      const result = presentHeaderMenu(input);
      expect(result).toEqual([
        {
          id: "group-1",
          type: "group",
          label: "Parent Group",
          is_enabled: true,
          visibility: "all",
          highlight: false,
          open_in_new_tab: false,
          items: [
            {
              id: "child-1",
              type: "link",
              label: "Child 1",
              is_enabled: true,
              visibility: "all",
              highlight: false,
              open_in_new_tab: false,
            }
          ],
        }
      ]);
    });

    it("should preserve mega menus with nested columns[].items", () => {
      const input = [
        {
          id: "mega-1",
          type: "mega",
          label: "Recipes Mega",
          layout: "columns",
          columns: [
            {
              id: "col-1",
              title: "By Meal",
              items: [
                { id: "col-item-1", type: "link", label: "Breakfast" },
                { id: "col-item-2", type: "link", label: "Dinner", is_enabled: false }, // should be filtered out
              ],
            }
          ],
        }
      ];
      const result = presentHeaderMenu(input);
      expect(result).toEqual([
        {
          id: "mega-1",
          type: "mega",
          label: "Recipes Mega",
          is_enabled: true,
          visibility: "all",
          highlight: false,
          open_in_new_tab: false,
          layout: "columns",
          columns: [
            {
              id: "col-1",
              title: "By Meal",
              items: [
                {
                  id: "col-item-1",
                  type: "link",
                  label: "Breakfast",
                  is_enabled: true,
                  visibility: "all",
                  highlight: false,
                  open_in_new_tab: false,
                }
              ],
            }
          ],
        }
      ]);
    });

    it("should preserve mega menus with nested featured_items including images", () => {
      const input = [
        {
          id: "mega-2",
          type: "mega",
          label: "Featured Mega",
          featured_items: [
            {
              id: "feat-1",
              type: "featured_item",
              label: "Avocado Toast",
              description: "Healthy and yummy",
              disclosure_label: "View Recipe",
              target: { type: "article", href: "/recipes/avocado-toast", id: 42, slug: "avocado-toast" },
              image: {
                media_id: 101,
                alt: "Avocado Toast on plate",
                placeholder: "data:image/svg+xml;...",
                variants: {
                  xs: { r2_key: "toast-xs.jpg", width: 150, height: 150, size_bytes: 5000 },
                  sm: { r2Key: "toast-sm.jpg", width: 300, height: 300 },
                }
              }
            }
          ]
        }
      ];
      const result = presentHeaderMenu(input);
      expect(result).toEqual([
        {
          id: "mega-2",
          type: "mega",
          label: "Featured Mega",
          is_enabled: true,
          visibility: "all",
          highlight: false,
          open_in_new_tab: false,
          featured_items: [
            {
              id: "feat-1",
              type: "featured_item",
              label: "Avocado Toast",
              description: "Healthy and yummy",
              disclosure_label: "View Recipe",
              target: {
                type: "article",
                href: "/recipes/avocado-toast",
                id: 42,
                slug: "avocado-toast",
              },
              image: {
                media_id: 101,
                alt: "Avocado Toast on plate",
                placeholder: "data:image/svg+xml;...",
                variants: {
                  xs: { r2_key: "toast-xs.jpg", width: 150, height: 150, size_bytes: 5000 },
                  sm: { r2_key: "toast-sm.jpg", width: 300, height: 300 },
                }
              }
            }
          ]
        }
      ]);
    });

    it("should fallback to DEFAULT_HEADER_MENU if the input array contains absolutely no valid items", () => {
      const input = [
        { label: "No ID or Type" },
        { id: "disabled-only", type: "link", is_enabled: false },
      ];
      const result = presentHeaderMenu(input);
      expect(result).toHaveLength(6);
      expect(result).toEqual(presentHeaderMenu(null));
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

});
