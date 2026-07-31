export const LIVE_RECIPE_SEARCH_LIMIT = 100;

export interface LiveRecipeSearchThumbnail {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export interface LiveRecipeSearchItem {
  slug: string;
  headline: string;
  thumbnail: LiveRecipeSearchThumbnail | null;
  category: {
    label?: string;
  } | null;
}

export interface LiveRecipeSearchResponse {
  success: boolean;
  data?: {
    items?: LiveRecipeSearchItem[];
    pagination?: {
      total?: number;
    };
  };
}

export function normalizeLiveRecipeSearch(query: string): string {
  return query.trim().replace(/\s+/g, ' ');
}

export function buildLiveRecipeSearchUrl(query: string): string | null {
  const normalizedQuery = normalizeLiveRecipeSearch(query);

  if (!normalizedQuery) {
    return null;
  }

  const params = new URLSearchParams({
    search: normalizedQuery,
    limit: String(LIVE_RECIPE_SEARCH_LIMIT),
  });

  return `/api/recipes?${params.toString()}`;
}

export function canApplyLiveRecipeSearchResponse(
  responseQuery: string,
  currentQuery: string,
): boolean {
  return normalizeLiveRecipeSearch(responseQuery) === normalizeLiveRecipeSearch(currentQuery);
}
