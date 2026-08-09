export const getProtectedRouteDestination = (isAuthenticated: boolean): '/login' | null =>
  isAuthenticated ? null : '/login';

export const isEditorRoute = (pathname: string): boolean =>
  /^\/(articles|recipes|roundups)\/(new|[^/]+)$/.test(pathname);

export const getAnimatedOutletKey = (pathname: string): string | null =>
  isEditorRoute(pathname) ? null : pathname;
