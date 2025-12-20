/**
 * Authors Module - TypeScript Types
 */

import type { Author } from '../schema/authors.schema';
import type { ExtractedImage, ExtractedSeo } from '@shared/utils';

export type HydratedAuthor = Author & ExtractedImage & ExtractedSeo & {
  job: string | null | undefined; // Alias for jobTitle
  route: string;
};

export interface AuthorImages {
  avatar?: {
    url: string;
    alt?: string;
  };
  cover?: {
    url: string;
    alt?: string;
  };
}

export interface AuthorBio {
  short?: string;
  full?: string;
  credentials?: string[];
}

export interface AuthorSeo {
  title?: string;
  description?: string;
  ogImage?: string;
}
