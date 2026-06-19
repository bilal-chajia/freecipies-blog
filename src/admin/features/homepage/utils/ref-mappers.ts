import type { HomepageRecipeRef, HomepageRoundupRef } from '@modules/settings/types/settings.types';

interface ArticleApiItem { id: number | string; title: string; slug: string; }

export function mapArticleToRecipeRef(item: ArticleApiItem): HomepageRecipeRef {
  return {
    article_id: Number(item.id),
    headline: item.title,
    route: `/recipes/${item.slug}`,
  };
}

export function mapArticleToRoundupRef(item: ArticleApiItem): HomepageRoundupRef {
  return {
    roundup_id: Number(item.id),
    title: item.title,
    route: `/roundups/${item.slug}`,
  };
}

export function addRecipeRef(existing: HomepageRecipeRef[], next: HomepageRecipeRef): HomepageRecipeRef[] {
  if (existing.some((r) => r.article_id === next.article_id)) return existing;
  return [...existing, next];
}

export function addRoundupRef(existing: HomepageRoundupRef[], next: HomepageRoundupRef): HomepageRoundupRef[] {
  if (existing.some((r) => r.roundup_id === next.roundup_id)) return existing;
  return [...existing, next];
}
