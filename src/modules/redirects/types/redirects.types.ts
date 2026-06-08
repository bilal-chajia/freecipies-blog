/**
 * Redirects Module - TypeScript Types
 */

import type { Redirect } from '../schema/redirects.schema';

export interface RedirectFilter {
  is_active?: boolean;
  search?: string;
}

export type HydratedRedirect = Redirect & {
  // Add any virtual fields here if needed in the future
};
