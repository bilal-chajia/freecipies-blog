import { describe, expect, it } from 'vitest';
import { matchRoutes } from 'react-router';
import { adminNavigationTargets } from '../admin-navigation';
import { adminLayoutRoutes, fullScreenAdminRoutes } from '../routes';
import {
  getAnimatedOutletKey,
  getProtectedRouteDestination,
  isEditorRoute,
} from '../route-contract';

const adminRouteTree = [
  {
    path: '/',
    children: adminLayoutRoutes.map((route) =>
      route.index ? { index: true } : { path: route.path }
    ),
  },
  ...fullScreenAdminRoutes.map((route) => ({ path: route.path })),
];

describe('admin Router 8 contract', () => {
  it('redirects unauthenticated traffic to login', () => {
    expect(getProtectedRouteDestination(false)).toBe('/login');
    expect(getProtectedRouteDestination(true)).toBeNull();
  });

  it('recognizes only supported editor destinations', () => {
    expect(isEditorRoute('/recipes/new')).toBe(true);
    expect(isEditorRoute('/articles/chili')).toBe(true);
    expect(isEditorRoute('/articles/chili/revision')).toBe(false);
  });

  it('does not animate editor route transitions', () => {
    expect(getAnimatedOutletKey('/articles/chili')).toBeNull();
    expect(getAnimatedOutletKey('/settings/general')).toBe('/settings/general');
  });

  it('keeps every sidebar navigation target matched by an admin route', () => {
    const unmatchedTargets = adminNavigationTargets.filter(
      (target) => matchRoutes(adminRouteTree, target) === null
    );

    expect(unmatchedTargets).toEqual([]);
  });
});
