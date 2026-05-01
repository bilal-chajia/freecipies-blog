import { getArticles, type HydratedArticle } from "@modules/articles";
import { extractImage, getImageSrcSet } from "@shared/utils";
import { getCloudflareEnv } from "@server/cloudflare/env";

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

export const getStories = async (): Promise<StoryPageData[]> => {
  try {
    const db = getCloudflareEnv().DB;
    if (!db) return [];

    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const result = await getArticles(db, {
      isOnline: true,
      publishedAfter: oneDayAgo,
      limit: 15,
    });

    let stories = result.items;
    if (stories.length === 0) {
      const fallback = await getArticles(db, { limit: 12 });
      stories = fallback.items;
    }

    return stories
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .map((story) => {
        const preview = extractImage(story.imagesJson, "thumbnail", 120);
        const cover = extractImage(story.imagesJson, "cover", 1200);
        const storyImage = cover.imageUrl || preview.imageUrl || story.imageUrl;

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
  } catch (error) {
    console.error("StoriesBar: Error fetching stories:", error);
    return [];
  }
};
