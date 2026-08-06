import type { RoundupJson } from '@modules/articles/types/roundups.types';

type JsonObject = Record<string, unknown>;

export interface SiteAuthorRenderModel {
  name: string;
  slug: string;
  job: string | null;
  images_json: string | null;
  avatar: unknown;
  image_url: string | null;
}

export interface SiteCategoryRenderModel {
  label: string;
  slug: string;
  color: string | null;
}

/**
 * Render-only article model shared by public layouts and content blocks.
 * It accepts both hydrated article rows and the deliberately sparse preview
 * payload without changing any persisted/API JSON contract.
 */
export interface SiteArticleRenderModel {
  id: number | string;
  slug: string;
  type: string;
  headline: string;
  short_description: string;
  introduction: string | null;
  tldr: string | null;
  content_json: unknown;
  recipe_json: unknown;
  roundup_json: RoundupJson | string | null;
  faqs_json: unknown;
  images_json: string | null;
  cached_toc_json: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  image_url: string | null;
  imageAlt: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  published_at: string | null;
  created_at: string | null;
  view_count: number;
  author: SiteAuthorRenderModel | null;
  category: SiteCategoryRenderModel | null;
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function stringOrEmpty(value: unknown): string {
  return stringOrNull(value) ?? '';
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeJsonText(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (!isRecord(value)) return null;
  return JSON.stringify(value);
}

export function normalizeAuthorForRender(value: unknown): SiteAuthorRenderModel | null {
  if (!isRecord(value)) return null;

  const name = stringOrNull(value.name);
  if (!name) return null;

  return {
    name,
    slug: stringOrEmpty(value.slug),
    job: stringOrNull(value.job) ?? stringOrNull(value.job_title),
    images_json: normalizeJsonText(value.images_json),
    avatar: value.avatar ?? null,
    image_url: stringOrNull(value.image_url) ?? stringOrNull(value.avatar_url),
  };
}

export function normalizeCategoryForRender(value: unknown): SiteCategoryRenderModel | null {
  if (!isRecord(value)) return null;

  const label = stringOrNull(value.label);
  if (!label) return null;

  return {
    label,
    slug: stringOrEmpty(value.slug),
    color: stringOrNull(value.color),
  };
}

export function normalizeArticleForRender(
  value: unknown,
  related: { author?: unknown; category?: unknown } = {},
): SiteArticleRenderModel {
  const article = isRecord(value) ? value : {};
  const relatedAuthor = related.author === undefined ? article.author : related.author;
  const relatedCategory = related.category === undefined ? article.category : related.category;
  const numericId = numberOrNull(article.id);
  const stringId = stringOrEmpty(article.id);

  return {
    id: numericId ?? (stringId || 'preview'),
    slug: stringOrEmpty(article.slug) || 'preview',
    type: stringOrEmpty(article.type) || 'recipe',
    headline: stringOrEmpty(article.headline),
    short_description: stringOrEmpty(article.short_description),
    introduction: stringOrNull(article.introduction),
    tldr: stringOrNull(article.tldr),
    content_json: article.content_json ?? null,
    recipe_json: article.recipe_json ?? null,
    roundup_json: typeof article.roundup_json === 'string' || isRecord(article.roundup_json)
      ? article.roundup_json as RoundupJson | string
      : null,
    faqs_json: article.faqs_json ?? null,
    images_json: normalizeJsonText(article.images_json),
    cached_toc_json: normalizeJsonText(article.cached_toc_json),
    metaTitle: stringOrNull(article.metaTitle),
    metaDescription: stringOrNull(article.metaDescription),
    image_url: stringOrNull(article.image_url),
    imageAlt: stringOrNull(article.imageAlt),
    imageWidth: numberOrNull(article.imageWidth),
    imageHeight: numberOrNull(article.imageHeight),
    published_at: stringOrNull(article.published_at),
    created_at: stringOrNull(article.created_at),
    view_count: numberOrNull(article.view_count) ?? 0,
    author: normalizeAuthorForRender(relatedAuthor),
    category: normalizeCategoryForRender(relatedCategory),
  };
}
