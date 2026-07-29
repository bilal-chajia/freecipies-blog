export interface RecipeListingUrlInput {
  category?: string;
  tag?: string;
  search?: string;
  page?: number;
}

export const normalizeRecipeSearch = (value: string | null | undefined): string =>
  value?.trim() ?? '';

export function buildRecipeListingUrl(input: RecipeListingUrlInput): string {
  const params = new URLSearchParams();
  const category = input.category?.trim();
  const tag = input.tag?.trim();
  const search = normalizeRecipeSearch(input.search);

  if (category) params.set('category', category);
  if (tag) params.set('tag', tag);
  if (search) params.set('search', search);
  if (input.page && input.page > 1) params.set('page', String(input.page));

  const query = params.toString();
  return query ? `/recipes?${query}` : '/recipes';
}
