/**
 * Categories Module - API Helpers
 * ================================
 * Helper functions for API endpoints to handle JSON transformations
 */

import type { CategoryImagesJson, ImageVariants } from '../../articles/types/images.types';

interface SeoJson {
  metaTitle?: string;
  metaDescription?: string;
  noIndex?: boolean;
  canonical?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  robots?: string;
}

interface ConfigJson {
  postsPerPage?: number;
  tldr?: string;
  showInNav?: boolean;
  showInFooter?: boolean;
  layout?: 'grid' | 'list' | 'masonry';
  cardStyle?: 'compact' | 'full' | 'minimal';
  showSidebar?: boolean;
  showFilters?: boolean;
  showBreadcrumb?: boolean;
  showPagination?: boolean;
  sortBy?: 'publishedAt' | 'title' | 'viewCount';
  sortOrder?: 'asc' | 'desc';
  headerStyle?: 'hero' | 'minimal' | 'none';
  featuredArticleId?: number;
  showFeaturedRecipe?: boolean;
  showHeroCta?: boolean;
  heroCtaText?: string;
  heroCtaLink?: string;
}

const getBestVariant = (variants?: ImageVariants) => {
  return variants?.lg || variants?.md || variants?.sm || variants?.original || variants?.xs;
};

const normalizeImageSlot = (slot: any) => {
  if (!slot || typeof slot !== 'object') return slot;

  if (slot.variants && typeof slot.variants === 'object') {
    return slot;
  }

  if (slot.url) {
    return {
      ...slot,
      variants: {
        original: {
          url: slot.url,
          width: slot.width ?? 0,
          height: slot.height ?? 0,
        },
      },
    };
  }

  return slot;
};

const normalizeSeoJsonObject = (value: any): SeoJson => {
  if (!value || typeof value !== 'object') return {};

  return {
    metaTitle: value.metaTitle,
    metaDescription: value.metaDescription,
    noIndex: value.noIndex,
    canonical: value.canonical ?? value.canonicalUrl,
    ogImage: value.ogImage,
    ogTitle: value.ogTitle,
    ogDescription: value.ogDescription,
    twitterCard: value.twitterCard,
    robots: value.robots,
  };
};

const normalizeConfigJsonObject = (value: any): ConfigJson => {
  if (!value || typeof value !== 'object') return {};

  const postsPerPage = value.postsPerPage ?? value.numEntriesPerPage ?? value.entriesPerPage;
  const layout = value.layout ?? value.layoutMode;
  const featuredArticleIdRaw = value.featuredArticleId ?? value.featured_article_id;
  const featuredArticleId = typeof featuredArticleIdRaw === 'number'
    ? featuredArticleIdRaw
    : typeof featuredArticleIdRaw === 'string'
      ? parseInt(featuredArticleIdRaw, 10)
      : undefined;
  const showFeaturedRecipe = value.showFeaturedRecipe ?? value.show_featured_recipe;
  const showHeroCta = value.showHeroCta ?? value.show_hero_cta;
  const normalized: ConfigJson = {};

  if (typeof postsPerPage === 'number') normalized.postsPerPage = postsPerPage;
  if (typeof value.tldr === 'string') normalized.tldr = value.tldr;
  if (typeof value.showInNav === 'boolean') normalized.showInNav = value.showInNav;
  if (typeof value.showInFooter === 'boolean') normalized.showInFooter = value.showInFooter;
  if (typeof layout === 'string') normalized.layout = layout as ConfigJson['layout'];
  if (typeof value.cardStyle === 'string') normalized.cardStyle = value.cardStyle as ConfigJson['cardStyle'];
  if (typeof value.showSidebar === 'boolean') normalized.showSidebar = value.showSidebar;
  if (typeof value.showFilters === 'boolean') normalized.showFilters = value.showFilters;
  if (typeof value.showBreadcrumb === 'boolean') normalized.showBreadcrumb = value.showBreadcrumb;
  if (typeof value.showPagination === 'boolean') normalized.showPagination = value.showPagination;
  if (typeof value.sortBy === 'string') normalized.sortBy = value.sortBy as ConfigJson['sortBy'];
  if (typeof value.sortOrder === 'string') normalized.sortOrder = value.sortOrder as ConfigJson['sortOrder'];
  if (typeof value.headerStyle === 'string') normalized.headerStyle = value.headerStyle as ConfigJson['headerStyle'];
  if (Number.isFinite(featuredArticleId)) normalized.featuredArticleId = featuredArticleId as number;
  if (typeof showFeaturedRecipe === 'boolean') normalized.showFeaturedRecipe = showFeaturedRecipe;
  if (typeof showHeroCta === 'boolean') normalized.showHeroCta = showHeroCta;
  if (typeof value.heroCtaText === 'string') normalized.heroCtaText = value.heroCtaText;
  if (typeof value.heroCtaLink === 'string') normalized.heroCtaLink = value.heroCtaLink;

  return normalized;
};

const parseConfigJsonValue = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof value === 'object') return value;
  return {};
};

/**
 * Parse and validate ImagesJson from request body
 */
export function parseImagesJson(value: any): string {
  if (!value) return '{}';

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      const images = typeof parsed === 'object' && parsed ? parsed : {};
      const normalized: CategoryImagesJson = {
        thumbnail: normalizeImageSlot(images.thumbnail),
        cover: normalizeImageSlot(images.cover),
      };
      return JSON.stringify(normalized);
    } catch {
      return '{}';
    }
  }

  if (typeof value === 'object') {
    const normalized: CategoryImagesJson = {
      thumbnail: normalizeImageSlot(value.thumbnail),
      cover: normalizeImageSlot(value.cover),
    };
    return JSON.stringify(normalized);
  }

  return '{}';
}

/**
 * Parse and validate SeoJson from request body
 */
export function parseSeoJson(value: any): string {
  if (!value) return '{}';

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(normalizeSeoJsonObject(parsed));
    } catch {
      return '{}';
    }
  }

  if (typeof value === 'object') {
    return JSON.stringify(normalizeSeoJsonObject(value));
  }

  return '{}';
}

/**
 * Parse and validate ConfigJson from request body
 */
export function parseConfigJson(value: any): string {
  if (!value) return '{}';

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(normalizeConfigJsonObject(parsed));
    } catch {
      return '{}';
    }
  }

  if (typeof value === 'object') {
    return JSON.stringify(normalizeConfigJsonObject(value));
  }

  return '{}';
}

/**
 * Transform request body to handle both legacy flat fields and new JSON fields
 */
export function transformCategoryRequestBody(body: any): any {
  const transformed = { ...body };
  const hasLegacyImageFields = ['imageUrl', 'imageAlt', 'imageWidth', 'imageHeight']
    .some((key) => Object.prototype.hasOwnProperty.call(body, key));
  const configOverrides: Record<string, any> = {};

  if (body.numEntriesPerPage !== undefined) {
    configOverrides.postsPerPage = body.numEntriesPerPage;
    delete transformed.numEntriesPerPage;
  }
  if (body.postsPerPage !== undefined) {
    configOverrides.postsPerPage = body.postsPerPage;
    delete transformed.postsPerPage;
  }
  if (body.tldr !== undefined) {
    configOverrides.tldr = body.tldr;
    delete transformed.tldr;
  }
  if (body.showInNav !== undefined) {
    configOverrides.showInNav = body.showInNav;
    delete transformed.showInNav;
  }
  if (body.showInFooter !== undefined) {
    configOverrides.showInFooter = body.showInFooter;
    delete transformed.showInFooter;
  }
  if (body.layout !== undefined) {
    configOverrides.layout = body.layout;
    delete transformed.layout;
  }
  if (body.layoutMode !== undefined) {
    configOverrides.layout = body.layoutMode;
    delete transformed.layoutMode;
  }
  if (body.cardStyle !== undefined) {
    configOverrides.cardStyle = body.cardStyle;
    delete transformed.cardStyle;
  }
  if (body.showSidebar !== undefined) {
    configOverrides.showSidebar = body.showSidebar;
    delete transformed.showSidebar;
  }
  if (body.showFilters !== undefined) {
    configOverrides.showFilters = body.showFilters;
    delete transformed.showFilters;
  }
  if (body.showBreadcrumb !== undefined) {
    configOverrides.showBreadcrumb = body.showBreadcrumb;
    delete transformed.showBreadcrumb;
  }
  if (body.showPagination !== undefined) {
    configOverrides.showPagination = body.showPagination;
    delete transformed.showPagination;
  }
  if (body.sortBy !== undefined) {
    configOverrides.sortBy = body.sortBy;
    delete transformed.sortBy;
  }
  if (body.sortOrder !== undefined) {
    configOverrides.sortOrder = body.sortOrder;
    delete transformed.sortOrder;
  }
  if (body.headerStyle !== undefined) {
    configOverrides.headerStyle = body.headerStyle;
    delete transformed.headerStyle;
  }
  if (body.featuredArticleId !== undefined) {
    const parsed = typeof body.featuredArticleId === 'string'
      ? parseInt(body.featuredArticleId, 10)
      : body.featuredArticleId;
    configOverrides.featuredArticleId = Number.isFinite(parsed) ? parsed : null;
    delete transformed.featuredArticleId;
  }
  if (body.showFeaturedRecipe !== undefined) {
    configOverrides.showFeaturedRecipe = body.showFeaturedRecipe;
    delete transformed.showFeaturedRecipe;
  }
  if (body.showHeroCta !== undefined) {
    configOverrides.showHeroCta = body.showHeroCta;
    delete transformed.showHeroCta;
  }
  if (body.heroCtaText !== undefined) {
    configOverrides.heroCtaText = body.heroCtaText;
    delete transformed.heroCtaText;
  }
  if (body.heroCtaLink !== undefined) {
    configOverrides.heroCtaLink = body.heroCtaLink;
    delete transformed.heroCtaLink;
  }

  if (body.imagesJson !== undefined) {
    transformed.imagesJson = parseImagesJson(body.imagesJson);
  } else if (hasLegacyImageFields) {
    const images: CategoryImagesJson = {};
    if (body.imageUrl) {
      images.thumbnail = {
        alt: body.imageAlt,
        variants: {
          original: {
            url: body.imageUrl,
            width: body.imageWidth ?? 0,
            height: body.imageHeight ?? 0,
          },
        },
      };
    }
    transformed.imagesJson = JSON.stringify(images);
    delete transformed.imageUrl;
    delete transformed.imageAlt;
    delete transformed.imageWidth;
    delete transformed.imageHeight;
  }

  if (body.seoJson !== undefined) {
    transformed.seoJson = parseSeoJson(body.seoJson);
  } else if (
    body.metaTitle ||
    body.metaDescription ||
    body.canonicalUrl ||
    body.canonical ||
    body.ogImage ||
    body.ogTitle ||
    body.ogDescription ||
    body.twitterCard ||
    body.robots ||
    body.noIndex
  ) {
    transformed.seoJson = parseSeoJson({
      metaTitle: body.metaTitle,
      metaDescription: body.metaDescription,
      canonical: body.canonical,
      canonicalUrl: body.canonicalUrl,
      ogImage: body.ogImage,
      ogTitle: body.ogTitle,
      ogDescription: body.ogDescription,
      twitterCard: body.twitterCard,
      robots: body.robots,
      noIndex: body.noIndex,
    });
  }

  if (body.configJson !== undefined || Object.keys(configOverrides).length > 0) {
    const baseConfig = parseConfigJsonValue(body.configJson);
    transformed.configJson = parseConfigJson({ ...baseConfig, ...configOverrides });
  }

  // Basic required field validation REMOVED to allow partial updates (PATCH)
  // The database schema or specialized Creation validation should handle requirements.
  /*
  const missing: string[] = [];
  if (!transformed.slug) missing.push('slug');
  if (!transformed.label) missing.push('label');
  if (!transformed.shortDescription) missing.push('shortDescription');
  if (missing.length) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    (error as any).code = 'VALIDATION_ERROR';
    throw error;
  }
  */

  return transformed;
}

export function transformCategoryResponse(category: any): any {
  if (!category) return category;

  const response = { ...category };
  if (!response.iconSvg && (category as any).icon_svg) {
    response.iconSvg = (category as any).icon_svg;
  }

  if (category.imagesJson) {
    try {
      const images: CategoryImagesJson = JSON.parse(category.imagesJson);
      const primarySlot = images.thumbnail ?? images.cover;
      const variant = getBestVariant(primarySlot?.variants);
      response.imageUrl = variant?.url;
      response.imageAlt = primarySlot?.alt;
      response.imageWidth = variant?.width;
      response.imageHeight = variant?.height;
    } catch {
      // Invalid JSON, skip
    }
  }

  if (category.seoJson) {
    try {
      const seo: SeoJson = JSON.parse(category.seoJson);
      if (!response.metaTitle) response.metaTitle = seo.metaTitle;
      if (!response.metaDescription) response.metaDescription = seo.metaDescription;
      if (!response.canonicalUrl && seo.canonical) response.canonicalUrl = seo.canonical;
      if (response.ogImage === undefined && seo.ogImage !== undefined) response.ogImage = seo.ogImage;
      if (response.ogTitle === undefined && seo.ogTitle !== undefined) response.ogTitle = seo.ogTitle;
      if (response.ogDescription === undefined && seo.ogDescription !== undefined) response.ogDescription = seo.ogDescription;
      if (response.twitterCard === undefined && seo.twitterCard !== undefined) response.twitterCard = seo.twitterCard;
      if (response.robots === undefined && seo.robots !== undefined) response.robots = seo.robots;
      if (response.noIndex === undefined && seo.noIndex !== undefined) response.noIndex = seo.noIndex;
    } catch {
      // Invalid JSON, skip
    }
  }

  if (category.configJson) {
    try {
      const config: ConfigJson = JSON.parse(category.configJson);
      const configIconSvg = (config as any)?.iconSvg ?? (config as any)?.icon_svg;
      if (!response.iconSvg && typeof configIconSvg === 'string') {
        response.iconSvg = configIconSvg;
      }
      if (response.numEntriesPerPage === undefined && typeof config.postsPerPage === 'number') {
        response.numEntriesPerPage = config.postsPerPage;
      }
      if (response.tldr === undefined && typeof config.tldr === 'string') {
        response.tldr = config.tldr;
      }
      if (response.showInNav === undefined && typeof config.showInNav === 'boolean') {
        response.showInNav = config.showInNav;
      }
      if (response.showInFooter === undefined && typeof config.showInFooter === 'boolean') {
        response.showInFooter = config.showInFooter;
      }
      if (response.layoutMode === undefined && typeof config.layout === 'string') {
        response.layoutMode = config.layout;
      }
      if (response.cardStyle === undefined && typeof config.cardStyle === 'string') {
        response.cardStyle = config.cardStyle;
      }
      if (response.showSidebar === undefined && typeof config.showSidebar === 'boolean') {
        response.showSidebar = config.showSidebar;
      }
      if (response.showFilters === undefined && typeof config.showFilters === 'boolean') {
        response.showFilters = config.showFilters;
      }
      if (response.showBreadcrumb === undefined && typeof config.showBreadcrumb === 'boolean') {
        response.showBreadcrumb = config.showBreadcrumb;
      }
      if (response.showPagination === undefined && typeof config.showPagination === 'boolean') {
        response.showPagination = config.showPagination;
      }
      if (response.sortBy === undefined && typeof config.sortBy === 'string') {
        response.sortBy = config.sortBy;
      }
      if (response.sortOrder === undefined && typeof config.sortOrder === 'string') {
        response.sortOrder = config.sortOrder;
      }
      if (response.headerStyle === undefined && typeof config.headerStyle === 'string') {
        response.headerStyle = config.headerStyle;
      }
      if (response.featuredArticleId === undefined && typeof config.featuredArticleId === 'number') {
        response.featuredArticleId = config.featuredArticleId;
      }
      if (response.showFeaturedRecipe === undefined && typeof config.showFeaturedRecipe === 'boolean') {
        response.showFeaturedRecipe = config.showFeaturedRecipe;
      }
      if (response.showHeroCta === undefined && typeof config.showHeroCta === 'boolean') {
        response.showHeroCta = config.showHeroCta;
      }
      if (response.heroCtaText === undefined && typeof config.heroCtaText === 'string') {
        response.heroCtaText = config.heroCtaText;
      }
      if (response.heroCtaLink === undefined && typeof config.heroCtaLink === 'string') {
        response.heroCtaLink = config.heroCtaLink;
      }
    } catch {
      // Invalid JSON, skip
    }
  }

  return response;
}
