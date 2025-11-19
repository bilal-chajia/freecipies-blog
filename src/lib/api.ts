import type { Article, Category, Author, Tag, APIResponse, PaginatedResponse } from '../types';

function getBaseUrl(astroUrl?: URL): URL {
  if (astroUrl) {
    return new URL('/api/', astroUrl.origin);
  }
  // Fallback for client-side usage
  return new URL(import.meta.env.PUBLIC_API_URL || '/api/', window.location.origin);
}

export async function fetchArticles(params?: {
  slug?: string;
  category?: string;
  author?: string;
  tag?: string;
  limit?: number;
  page?: number;
  type?: 'recipe' | 'blog';
}, astroUrl?: URL): Promise<PaginatedResponse<Article>> {
  const searchParams = new URLSearchParams();
  
  if (params?.slug) searchParams.set('slug', params.slug);
  if (params?.category) searchParams.set('category', params.category);
  if (params?.author) searchParams.set('author', params.author);
  if (params?.tag) searchParams.set('tag', params.tag);
  if (params?.limit) searchParams.set('limit', params.limit.toString());
  if (params?.page) searchParams.set('page', params.page.toString());
  if (params?.type) searchParams.set('type', params.type);

  const url = new URL(`articles?${searchParams}`, getBaseUrl(astroUrl));
  const response = await fetch(url.toString());
  return response.json();
}

export async function fetchArticleBySlug(slug: string, astroUrl?: URL): Promise<APIResponse<Article>> {
  const url = new URL(`articles?slug=${slug}`, getBaseUrl(astroUrl));
  const response = await fetch(url.toString());
  return response.json();
}

export async function fetchCategories(slug?: string, astroUrl?: URL): Promise<APIResponse<Category[]>> {
  const path = slug ? `categories?slug=${slug}` : 'categories';
  const url = new URL(path, getBaseUrl(astroUrl));
  const response = await fetch(url.toString());
  return response.json();
}

export async function fetchCategoryBySlug(slug: string, astroUrl?: URL): Promise<APIResponse<Category>> {
  const url = new URL(`categories?slug=${slug}`, getBaseUrl(astroUrl));
  const response = await fetch(url.toString());
  return response.json();
}

export async function fetchAuthors(slug?: string, astroUrl?: URL): Promise<APIResponse<Author[]>> {
  const path = slug ? `authors?slug=${slug}` : 'authors';
  const url = new URL(path, getBaseUrl(astroUrl));
  const response = await fetch(url.toString());
  return response.json();
}

export async function fetchAuthorBySlug(slug: string, astroUrl?: URL): Promise<APIResponse<Author>> {
  const url = new URL(`authors?slug=${slug}`, getBaseUrl(astroUrl));
  const response = await fetch(url.toString());
  return response.json();
}

export async function fetchTags(slug?: string, astroUrl?: URL): Promise<APIResponse<Tag[]>> {
  const path = slug ? `tags?slug=${slug}` : 'tags';
  const url = new URL(path, getBaseUrl(astroUrl));
  const response = await fetch(url.toString());
  return response.json();
}

export async function fetchTagBySlug(slug: string, astroUrl?: URL): Promise<APIResponse<Tag>> {
  const url = new URL(`tags?slug=${slug}`, getBaseUrl(astroUrl));
  const response = await fetch(url.toString());
  return response.json();
}
