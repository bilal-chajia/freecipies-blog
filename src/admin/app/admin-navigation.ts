export const adminNavigation = {
  dashboard: '/',
  homepage: '/homepage',
  media: '/media',
  articles: '/articles',
  recipes: '/recipes',
  roundups: '/roundups',
  categories: '/categories',
  authors: '/authors',
  tags: '/tags',
  equipment: '/equipment',
  pinterestBoards: '/pinterest/boards',
  templates: '/templates',
  settings: '/settings/general',
  redirects: '/redirects',
} as const;

export const adminNavigationTargets = Object.freeze(Object.values(adminNavigation));
