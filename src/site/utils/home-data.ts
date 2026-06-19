import type { D1Database } from '@cloudflare/workers-types';
import { getArticles, getArticlesByIds } from '@modules/articles';
import { getCategories } from '@modules/categories';
import { getAuthors } from '@modules/authors';
import { hydrateCategory } from '@shared/utils/hydration';
import type { HydratedArticle } from '@modules/articles/types/articles.types';
import type { HydratedCategory } from '@modules/categories/types/categories.types';
import type { Author } from '@modules/authors/schema/authors.schema';
import type { StoryPreview } from '@server/site-data/stories/types';
import type {
  HomepageSection,
  HomepageStoriesSection,
  HomepageHeroSection,
  HomepageFeaturedRecipesSection,
  HomepageCategoryBrowseSection,
  HomepageCollectionsSection,
  HomepageLatestSection,
  HomepageAboutAuthorSection,
  HomepageNewsletterSection,
} from '@modules/settings/types/settings.types';

export type HomeSectionVM =
  | { kind: 'stories'; section: HomepageStoriesSection; stories: StoryPreview[] }
  | { kind: 'hero'; section: HomepageHeroSection; recipes: HydratedArticle[] }
  | { kind: 'featured_recipes'; section: HomepageFeaturedRecipesSection; recipes: HydratedArticle[] }
  | { kind: 'category_browse'; section: HomepageCategoryBrowseSection; categories: HydratedCategory[] }
  | { kind: 'collections'; section: HomepageCollectionsSection; roundups: HydratedArticle[] }
  | { kind: 'latest'; section: HomepageLatestSection; recipes: HydratedArticle[] }
  | { kind: 'about_author'; section: HomepageAboutAuthorSection; author: Author | null }
  | { kind: 'newsletter'; section: HomepageNewsletterSection };

export interface ResolveContext {
  db: D1Database;
  stories: StoryPreview[];
}

/** Turn the ordered, enabled homepage sections into ordered, data-loaded view-models. */
export async function resolveHomeData(
  sections: HomepageSection[],
  ctx: ResolveContext,
): Promise<HomeSectionVM[]> {
  const { db, stories } = ctx;

  let latestCache: HydratedArticle[] | null = null;
  const latestRecipes = async (count: number): Promise<HydratedArticle[]> => {
    if (latestCache === null) {
      const { items } = await getArticles(db, { type: 'recipe', workflow_status: 'published', limit: 24 });
      latestCache = items;
    }
    return latestCache.slice(0, count);
  };

  // Distinct from latest: ranked by view_count so a hero with no curated refs
  // surfaces the most-seen recipes instead of duplicating the latest grid below.
  let trendingCache: HydratedArticle[] | null = null;
  const trendingRecipes = async (count: number): Promise<HydratedArticle[]> => {
    if (trendingCache === null) {
      const { items } = await getArticles(db, {
        type: 'recipe',
        workflow_status: 'published',
        sortBy: 'view_count',
        sort_order: 'desc',
        limit: 24,
      });
      trendingCache = items;
    }
    return trendingCache.slice(0, count);
  };

  const vms: HomeSectionVM[] = [];

  for (const section of sections) {
    if (!section.enabled) continue;

    switch (section.type) {
      case 'stories':
        vms.push({ kind: 'stories', section, stories });
        break;

      case 'hero': {
        const recipes = section.refs.length > 0
          ? await getArticlesByIds(db, section.refs.map((ref) => ref.article_id))
          : await trendingRecipes(4);
        vms.push({ kind: 'hero', section, recipes });
        break;
      }

      case 'featured_recipes': {
        let recipes: HydratedArticle[];
        if (section.source === 'manual' && section.refs.length > 0) {
          recipes = await getArticlesByIds(db, section.refs.map((ref) => ref.article_id));
        } else if (section.source === 'category' && section.category_slug) {
          const { items } = await getArticles(db, { type: 'recipe', workflow_status: 'published', categorySlug: section.category_slug, limit: section.count });
          recipes = items;
        } else {
          recipes = await latestRecipes(section.count);
        }
        vms.push({ kind: 'featured_recipes', section, recipes });
        break;
      }

      case 'category_browse': {
        const raw = await getCategories(db, { workflow_status: 'published' });
        const categories = raw.map(hydrateCategory).slice(0, section.max);
        vms.push({ kind: 'category_browse', section, categories });
        break;
      }

      case 'collections': {
        const roundups = section.refs.length > 0
          ? await getArticlesByIds(db, section.refs.map((ref) => ref.roundup_id))
          : (await getArticles(db, { type: 'roundup', workflow_status: 'published', limit: 6 })).items;
        vms.push({ kind: 'collections', section, roundups });
        break;
      }

      case 'latest': {
        const recipes = await latestRecipes(section.count);
        vms.push({ kind: 'latest', section, recipes });
        break;
      }

      case 'about_author': {
        const authorsList = await getAuthors(db, { workflow_status: 'published' });
        const author = section.author_id != null
          ? authorsList.find((a) => a.id === section.author_id) ?? null
          : authorsList.find((a) => a.is_featured) ?? authorsList[0] ?? null;
        vms.push({ kind: 'about_author', section, author });
        break;
      }

      case 'newsletter':
        vms.push({ kind: 'newsletter', section });
        break;

      case 'faq':
        break;
    }
  }

  return vms;
}
