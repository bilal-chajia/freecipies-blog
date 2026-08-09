import React, { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate } from 'react-router';
import { importWithRetry } from '../utils/importWithRetry';

const lazyPage = <T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
): LazyExoticComponent<T> => lazy(() => importWithRetry(loader));

export const Dashboard = lazyPage(() => import('@admin/features/dashboard/pages/Dashboard'));
export const Login = lazyPage(() => import('@admin/features/auth/pages/Login'));

interface FullScreenRoute {
  path: string;
  Component: LazyExoticComponent<ComponentType<any>>;
}

export const fullScreenAdminRoutes: FullScreenRoute[] = [
  {
    path: '/templates/:slug?',
    Component: lazyPage(() => import('@admin/features/templates/components/editor/TemplateEditor')),
  },
];

interface AdminLayoutRouteWithComponent {
  index?: boolean;
  path?: string;
  Component: LazyExoticComponent<ComponentType<any>>;
}

interface AdminLayoutRouteWithElement {
  index?: boolean;
  path?: string;
  element: React.ReactElement;
}

export type AdminLayoutRoute = AdminLayoutRouteWithComponent | AdminLayoutRouteWithElement;

export const adminLayoutRoutes: AdminLayoutRoute[] = [
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
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergEditor')),
  },
  {
    path: 'articles/:slug',
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergEditor')),
  },
  {
    path: 'recipes',
    Component: lazyPage(() => import('@admin/features/recipes/pages/RecipesList')),
  },
  {
    path: 'recipes/new',
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergEditor')),
  },
  {
    path: 'recipes/:slug',
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergEditor')),
  },
  {
    path: 'roundups',
    Component: lazyPage(() => import('@admin/features/roundups/pages/RoundupsList')),
  },
  {
    path: 'roundups/new',
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergEditor')),
  },
  {
    path: 'roundups/:slug',
    Component: lazyPage(() => import('@admin/features/articles/pages/GutenbergEditor')),
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
