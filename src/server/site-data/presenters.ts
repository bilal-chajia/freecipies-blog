import type { MenuItem } from "@modules/menus/types/menus.types";
import type { HydratedArticle } from "@modules/articles";
import { extractImage, getImageSrcSet } from "@shared/utils";

// --- Navigation Presenters ---

const linkItem = (id: string, label: string, href: string): MenuItem => ({
  id,
  label,
  type: "link",
  is_enabled: true,
  visibility: "all",
  highlight: false,
  target: {
    type: "internal_route",
    href,
  },
});

export const DEFAULT_HEADER_MENU: MenuItem[] = [
  linkItem("nav-1", "Categories", "/categories"),
  linkItem("nav-2", "Recipes", "/recipes"),
  linkItem("nav-3", "Bookmarks", "/my-bookmarks"),
  linkItem("nav-4", "Authors", "/authors"),
  linkItem("nav-5", "About", "/about"),
  linkItem("nav-6", "Contact", "/contact"),
];

export function presentHeaderMenu(storedMenu: unknown): MenuItem[] {
  return Array.isArray(storedMenu) && storedMenu.length > 0
    ? (storedMenu as MenuItem[])
    : DEFAULT_HEADER_MENU;
}

// --- Popular Recipes Presenters ---

export function presentPopularRecipes(
  recipes: HydratedArticle[] | undefined,
  currentSlug: string,
  limit: number
): HydratedArticle[] {
  return (recipes || [])
    .filter((recipe) => recipe.slug !== currentSlug)
    .slice(0, limit);
}

// --- Stories Presenters ---

export interface StoryPreview {
  imageUrl?: string;
  imageAlt?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageStyle?: string;
  srcSet?: string;
}

export type StoryPageData = HydratedArticle & {
  storyImage?: string;
  storyPreview: StoryPreview;
  storyPages: Array<{
    imageUrl?: string;
    title: string;
    text: string;
  }>;
};

export function presentStories(stories: HydratedArticle[]): StoryPageData[] {
  return [...stories]
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
    .map((story) => {
      const preview = extractImage(story.imagesJson, "thumbnail", 120);
      const hero = extractImage(story.imagesJson, "hero", 1200);
      const storyImage = hero.imageUrl || preview.imageUrl || story.imageUrl;

      const storyTextSource = story as HydratedArticle & { tldr?: string };

      return {
        ...story,
        storyImage,
        storyPreview: {
          imageUrl: preview.imageUrl || story.imageUrl,
          imageAlt: preview.imageAlt || story.headline,
          imageWidth: preview.imageWidth || 80,
          imageHeight: preview.imageHeight || 80,
          imageStyle: preview.imageStyle,
          srcSet: getImageSrcSet(story.imagesJson, "thumbnail"),
        },
        storyPages: [
          {
            imageUrl: storyImage,
            title: story.headline,
            text: story.shortDescription || storyTextSource.tldr || "",
          },
          ...(storyImage
            ? [
                {
                  imageUrl: storyImage,
                  title: "Swipe to continue",
                  text: "Tap right to see more",
                },
              ]
            : []),
          {
            imageUrl: storyImage,
            title: story.headline,
            text: "Ready to cook?",
          },
        ],
      };
    });
}
