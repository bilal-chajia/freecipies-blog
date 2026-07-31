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
  HomepageQuickFilter,
  HomepageQuickFiltersSection,
  HomepageFeaturedRecipesSection,
  HomepageCategoryBrowseSection,
  HomepageCollectionsSection,
  HomepageSeasonalSpotlightSection,
  HomepageSocialProofSection,
  HomepageLatestSection,
  HomepageAboutAuthorSection,
  HomepageLeadMagnetSection,
  HomepageNewsletterSection,
  HomepageFaqSection,
  HomepageFaqItem,
  HomepageStoredImageSnapshot,
} from '@modules/settings/types/settings.types';

export type HomeSectionVM =
  | { kind: 'stories'; section: HomepageStoriesSection; stories: StoryPreview[] }
  | { kind: 'hero'; section: HomepageHeroSection; recipes: HydratedArticle[] }
  | { kind: 'quick_filters'; section: HomepageQuickFiltersSection; filters: HomepageQuickFilter[] }
  | { kind: 'featured_recipes'; section: HomepageFeaturedRecipesSection; recipes: HydratedArticle[] }
  | { kind: 'category_browse'; section: HomepageCategoryBrowseSection; categories: HydratedCategory[] }
  | { kind: 'collections'; section: HomepageCollectionsSection; roundups: HydratedArticle[] }
  | { kind: 'seasonal_spotlight'; section: HomepageSeasonalSpotlightSection }
  | { kind: 'latest'; section: HomepageLatestSection; recipes: HydratedArticle[] }
  | { kind: 'social_proof'; section: HomepageSocialProofSection }
  | { kind: 'about_author'; section: HomepageAboutAuthorSection; author: Author | null }
  | { kind: 'lead_magnet'; section: HomepageLeadMagnetSection }
  | { kind: 'newsletter'; section: HomepageNewsletterSection }
  | { kind: 'faq'; section: HomepageFaqSection; items: HomepageFaqItem[] };

export interface ResolveContext {
  db: D1Database;
  stories: StoryPreview[];
}

export function getRenderableHomepageFaqItems(
  section: HomepageFaqSection,
): HomepageFaqItem[] {
  return section.items
    .map(({ question, answer }) => ({ question: question.trim(), answer: answer.trim() }))
    .filter(({ question, answer }) => question.length > 0 && answer.length > 0);
}

export function getRenderableQuickFilters(
  section: HomepageQuickFiltersSection,
): HomepageQuickFilter[] {
  return section.filters
    .map(({ label, href }) => ({ label: label.trim(), href: href.trim() }))
    .filter(({ label, href }) => label.length > 0 && /^\/recipes(?:[/?#]|$)/.test(href));
}

function isSafeHomepageCtaHref(href: string): boolean {
  if (href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/\\')) return true;

  try {
    return new URL(href).protocol === 'https:';
  } catch {
    return false;
  }
}

function isCompleteHomepageImageSnapshot(
  image: HomepageStoredImageSnapshot | null,
): image is HomepageStoredImageSnapshot {
  if (!image || !image.alt.trim() || !image.placeholder.trim()) return false;

  return [image.variants?.sm, image.variants?.md, image.variants?.lg].every((variant) => (
    typeof variant?.r2_key === 'string'
    && variant.r2_key.length > 0
    && Number.isInteger(variant.width)
    && variant.width > 0
    && Number.isInteger(variant.height)
    && variant.height > 0
  ));
}

export function getRenderableSeasonalSpotlight(
  section: HomepageSeasonalSpotlightSection,
): HomepageSeasonalSpotlightSection | null {
  const title = section.title.trim();
  const body = section.body.trim();
  const ctaLabel = section.cta.label.trim();
  const ctaHref = section.cta.href.trim();
  const image = section.image;

  if (!title || !body || !ctaLabel || !ctaHref || !isSafeHomepageCtaHref(ctaHref)) {
    return null;
  }
  if (!isCompleteHomepageImageSnapshot(image)) return null;

  return {
    ...section,
    title,
    body,
    image: { ...image, alt: image.alt.trim() },
    cta: { label: ctaLabel, href: ctaHref },
  };
}

export function getRenderableSocialProof(
  section: HomepageSocialProofSection,
): HomepageSocialProofSection | null {
  const title = section.title.trim();
  const stats = section.stats
    .map(({ value, label }) => ({ value: value.trim(), label: label.trim() }))
    .filter(({ value, label }) => value.length > 0 && label.length > 0);
  const testimonials = section.testimonials
    .map(({ quote, name, role }) => ({ quote: quote.trim(), name: name.trim(), role: role?.trim() }))
    .filter(({ quote, name }) => quote.length > 0 && name.length > 0)
    .map(({ quote, name, role }) => (role ? { quote, name, role } : { quote, name }));
  const logos = section.logos
    .filter((logo) => isCompleteHomepageImageSnapshot(logo.image) && logo.name.trim().length > 0)
    .map((logo) => ({
      name: logo.name.trim(),
      image: { ...logo.image!, alt: logo.image!.alt.trim() },
    }));

  if (!title || (stats.length === 0 && testimonials.length === 0 && logos.length === 0)) {
    return null;
  }

  return {
    ...section,
    eyebrow: section.eyebrow.trim(),
    title,
    stats,
    testimonials,
    logos,
  };
}

export function getRenderableLeadMagnet(
  section: HomepageLeadMagnetSection,
): HomepageLeadMagnetSection | null {
  const eyebrow = section.eyebrow.trim();
  const title = section.title.trim();
  const body = section.body.trim();
  const ctaLabel = section.cta.label.trim();
  const ctaHref = section.cta.href.trim();
  const image = section.image;

  if (!eyebrow || !title || !body || !ctaLabel || !ctaHref || !isSafeHomepageCtaHref(ctaHref)) {
    return null;
  }
  if (!isCompleteHomepageImageSnapshot(image)) return null;

  return {
    ...section,
    eyebrow,
    title,
    body,
    image: { ...image, alt: image.alt.trim() },
    cta: { label: ctaLabel, href: ctaHref },
  };
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
          ? await getArticlesByIds(db, section.refs.map((ref) => ref.article_id), {
              type: 'recipe',
              workflow_status: 'published',
            })
          : await trendingRecipes(4);
        vms.push({ kind: 'hero', section, recipes });
        break;
      }

      case 'quick_filters': {
        const filters = getRenderableQuickFilters(section);
        if (filters.length > 0) {
          vms.push({ kind: 'quick_filters', section, filters });
        }
        break;
      }

      case 'featured_recipes': {
        let recipes: HydratedArticle[];
        if (section.source === 'manual' && section.refs.length > 0) {
          recipes = await getArticlesByIds(db, section.refs.map((ref) => ref.article_id), {
            type: 'recipe',
            workflow_status: 'published',
          });
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
          ? await getArticlesByIds(db, section.refs.map((ref) => ref.roundup_id), {
              type: 'roundup',
              workflow_status: 'published',
            })
          : (await getArticles(db, { type: 'roundup', workflow_status: 'published', limit: 6 })).items;
        vms.push({ kind: 'collections', section, roundups });
        break;
      }

      case 'seasonal_spotlight': {
        const renderable = getRenderableSeasonalSpotlight(section);
        if (renderable) {
          vms.push({ kind: 'seasonal_spotlight', section: renderable });
        }
        break;
      }

      case 'social_proof': {
        const renderable = getRenderableSocialProof(section);
        if (renderable) {
          vms.push({ kind: 'social_proof', section: renderable });
        }
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

      case 'lead_magnet': {
        const renderable = getRenderableLeadMagnet(section);
        if (renderable) {
          vms.push({ kind: 'lead_magnet', section: renderable });
        }
        break;
      }

      case 'newsletter':
        vms.push({ kind: 'newsletter', section });
        break;

      case 'faq': {
        const items = getRenderableHomepageFaqItems(section);
        if (items.length > 0) {
          vms.push({ kind: 'faq', section, items });
        }
        break;
      }
    }
  }

  return vms;
}
