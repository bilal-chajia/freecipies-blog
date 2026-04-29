import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import { importWithRetry } from '../utils/importWithRetry';

const lazyPage = (loader) => lazy(() => importWithRetry(loader));

export const Dashboard = lazyPage(() => import('@admin/features/dashboard/pages/Dashboard'));
export const Login = lazyPage(() => import('@admin/features/auth/pages/Login'));

export const fullScreenAdminRoutes = [
  {
    path: '/templates',
    Component: lazyPage(() => import('@admin/features/templates/components/editor/TemplateEditor')),
  },
  {
    path: '/templates/new',
    Component: lazyPage(() => import('@admin/features/templates/components/editor/TemplateEditor')),
  },
  {
    path: '/templates/:slug',
    Component: lazyPage(() => import('@admin/features/templates/components/editor/TemplateEditor')),
  },
];

export const adminLayoutRoutes = [
  {
    index: true,
    Component: Dashboard,
  },
  {
    path: 'homepage',
    element: <Navigate to="/homepage/hero" replace />,
  },
  {
    path: 'homepage/:section',
    Component: lazyPage(() => import('@admin/features/homepage/pages/Homepage')),
  },
  {
    path: 'articles',
    Component: lazyPage(() => import('@admin/features/articles/pages/ArticlesList')),
  },
  {
    path: 'articles/new',
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergArticleEditor')),
  },
  {
    path: 'articles/:slug',
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergArticleEditor')),
  },
  {
    path: 'recipes',
    Component: lazyPage(() => import('@admin/features/recipes/pages/RecipesList')),
  },
  {
    path: 'recipes/new',
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergRecipeEditor')),
  },
  {
    path: 'recipes/:slug',
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergRecipeEditor')),
  },
  {
    path: 'roundups',
    Component: lazyPage(() => import('@admin/features/roundups/pages/RoundupsList')),
  },
  {
    path: 'roundups/new',
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergRoundupEditor')),
  },
  {
    path: 'roundups/:slug',
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergRoundupEditor')),
  },
  {
    path: 'categories',
    Component: lazyPage(() => import('@admin/features/categories/pages/CategoriesList')),
  },
  {
    path: 'categories/new',
    Component: lazyPage(() => import('@admin/features/categories/pages/CategoryEditor')),
  },
  {
    path: 'categories/:slug',
    Component: lazyPage(() => import('@admin/features/categories/pages/CategoryEditor')),
  },
  {
    path: 'authors',
    Component: lazyPage(() => import('@admin/features/authors/pages/AuthorsList')),
  },
  {
    path: 'authors/new',
    Component: lazyPage(() => import('@admin/features/authors/pages/AuthorEditor')),
  },
  {
    path: 'authors/:slug',
    Component: lazyPage(() => import('@admin/features/authors/pages/AuthorEditor')),
  },
  {
    path: 'tags',
    Component: lazyPage(() => import('@admin/features/tags/pages/TagsList')),
  },
  {
    path: 'equipment',
    Component: lazyPage(() => import('@admin/features/equipment/pages/EquipmentList')),
  },
  {
    path: 'media',
    Component: lazyPage(() => import('@admin/features/media/pages/MediaLibrary')),
  },
  {
    path: 'redirects',
    Component: lazyPage(() => import('@admin/features/redirects/pages/RedirectsList')),
  },
  {
    path: 'pinterest/boards',
    Component: lazyPage(() => import('@admin/features/pinterest/pages/BoardsList')),
  },
  {
    path: 'pinterest/boards/new',
    Component: lazyPage(() => import('@admin/features/pinterest/pages/BoardEditor')),
  },
  {
    path: 'pinterest/boards/:id',
    Component: lazyPage(() => import('@admin/features/pinterest/pages/BoardEditor')),
  },
  {
    path: 'settings',
    element: <Navigate to="/settings/general" replace />,
  },
  {
    path: 'settings/:tab',
    Component: lazyPage(() => import('@admin/features/settings/pages/Settings')),
  },
];
