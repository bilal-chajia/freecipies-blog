/**
 * Authors Module - API Helpers
 * ==============================
 * Helper functions for API endpoints to handle JSON transformations
 */

import type { ImagesJson, BioJson, SeoJson, BioSocialLink } from '../types/authors.types';
import type { ImageVariants } from '../../articles/types/images.types';

const getBestVariant = (variants?: ImageVariants) => {
    return variants?.lg || variants?.md || variants?.sm || variants?.original || variants?.xs;
};

const normalizeSocialLinks = (value: any): BioSocialLink[] | undefined => {
    if (!value) return undefined;

    if (Array.isArray(value)) {
        return value
            .filter((entry) => entry && typeof entry === 'object')
            .map((entry) => ({
                network: entry.network,
                url: entry.url,
                label: entry.label,
            }))
            .filter((entry) => entry.network && entry.url);
    }

    if (typeof value === 'object') {
        return Object.entries(value)
            .filter(([, url]) => typeof url === 'string' && url.trim().length > 0)
            .map(([network, url]) => ({ network, url: String(url).trim() }));
    }

    return undefined;
};

const normalizeBioJsonObject = (value: any): BioJson => {
    if (!value || typeof value !== 'object') return {};

    const short = value.short ?? value.introduction ?? value.headline ?? undefined;
    const long = value.long ?? value.fullBio ?? value.subtitle ?? undefined;
    const introduction = value.introduction ?? (typeof value.short === 'string' ? value.short : undefined);
    const fullBio = value.fullBio ?? (typeof value.long === 'string' ? value.long : undefined);
    const socials = normalizeSocialLinks(value.socials ?? value.socialLinks);
    const legacySocialLinks =
        value.socialLinks && typeof value.socialLinks === 'object' && !Array.isArray(value.socialLinks)
            ? Object.fromEntries(
                Object.entries(value.socialLinks)
                    .filter(([, url]) => typeof url === 'string' && url.trim().length > 0)
            ) as Record<string, string>
            : undefined;
    const socialLinksFromArray = !legacySocialLinks && socials
        ? Object.fromEntries(socials.map((entry) => [entry.network, entry.url]))
        : undefined;

    const normalized: BioJson = {};
    if (value.headline) normalized.headline = value.headline;
    if (value.subtitle) normalized.subtitle = value.subtitle;
    if (introduction) normalized.introduction = introduction;
    if (fullBio) normalized.fullBio = fullBio;
    if (Array.isArray(value.expertise)) normalized.expertise = value.expertise;
    if (legacySocialLinks && Object.keys(legacySocialLinks).length > 0) {
        normalized.socialLinks = legacySocialLinks;
    } else if (socialLinksFromArray && Object.keys(socialLinksFromArray).length > 0) {
        normalized.socialLinks = socialLinksFromArray;
    }
    if (short) normalized.short = short;
    if (long) normalized.long = long;
    if (socials && socials.length > 0) normalized.socials = socials;

    return normalized;
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

/**
 * Parse and validate ImagesJson from request body
 */
export function parseImagesJson(value: any): string {
    if (!value) return '{}';

    // If already a string, validate and return
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            const images = typeof parsed === 'object' && parsed ? parsed : {};
            const normalized: ImagesJson = {
                avatar: normalizeImageSlot(images.avatar),
                cover: normalizeImageSlot(images.cover),
                banner: normalizeImageSlot(images.banner),
            };
            return JSON.stringify(normalized);
        } catch {
            return '{}';
        }
    }

    // If object, stringify
    if (typeof value === 'object') {
        const normalized: ImagesJson = {
            avatar: normalizeImageSlot(value.avatar),
            cover: normalizeImageSlot(value.cover),
            banner: normalizeImageSlot(value.banner),
        };
        return JSON.stringify(normalized);
    }

    return '{}';
}

/**
 * Parse and validate BioJson from request body
 */
export function parseBioJson(value: any): string {
    if (!value) return '{}';

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return JSON.stringify(normalizeBioJsonObject(parsed));
        } catch {
            return '{}';
        }
    }

    if (typeof value === 'object') {
        return JSON.stringify(normalizeBioJsonObject(value));
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
 * Transform request body to handle both legacy flat fields and new JSON fields
 * This allows backward compatibility during migration
 */
export function transformAuthorRequestBody(body: any): any {
    const transformed = { ...body };
    const hasLegacyImageFields = ['imageUrl', 'imageAlt', 'imageWidth', 'imageHeight']
        .some((key) => Object.prototype.hasOwnProperty.call(body, key));

    // Handle imagesJson - accept both formats
    if (body.imagesJson !== undefined) {
        transformed.imagesJson = parseImagesJson(body.imagesJson);
    } else if (hasLegacyImageFields) {
        // Convert legacy flat fields to imagesJson
        const images: ImagesJson = {};
        if (body.imageUrl) {
            images.avatar = {
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
        // Remove flat fields
        delete transformed.imageUrl;
        delete transformed.imageAlt;
        delete transformed.imageWidth;
        delete transformed.imageHeight;
    }

    // Handle bioJson
    if (body.bioJson !== undefined) {
        transformed.bioJson = parseBioJson(body.bioJson);
    } else if (body.introduction || body.fullBio || body.socialLinks || body.headline || body.subtitle) {
        transformed.bioJson = parseBioJson({
            introduction: body.introduction,
            fullBio: body.fullBio,
            socialLinks: body.socialLinks,
            headline: body.headline,
            subtitle: body.subtitle,
        });
    }

    // Handle seoJson - convert flat fields if needed
    if (body.seoJson !== undefined) {
        transformed.seoJson = parseSeoJson(body.seoJson);
    } else if (body.metaTitle || body.metaDescription || body.canonicalUrl || body.canonical) {
        transformed.seoJson = parseSeoJson({
            metaTitle: body.metaTitle,
            metaDescription: body.metaDescription,
            canonical: body.canonical,
            canonicalUrl: body.canonicalUrl,
        });
        // Keep flat fields for now (backward compat)
    }

    return transformed;
}

/**
 * Transform author response to include both JSON and flat fields for backward compatibility
 */
export function transformAuthorResponse(author: any): any {
    if (!author) return author;

    const response = { ...author };

    // Parse imagesJson and add flat fields
    if (author.imagesJson) {
        try {
            const images: ImagesJson = JSON.parse(author.imagesJson);
            if (images.avatar) {
                const variant = getBestVariant(images.avatar.variants);
                response.imageUrl = variant?.url;
                response.imageAlt = images.avatar.alt;
                response.imageWidth = variant?.width;
                response.imageHeight = variant?.height;
            }
        } catch {
            // Invalid JSON, skip
        }
    }

    // Parse seoJson and add flat fields
    if (author.seoJson) {
        try {
            const seo: SeoJson = JSON.parse(author.seoJson);
            if (!response.metaTitle) response.metaTitle = seo.metaTitle;
            if (!response.metaDescription) response.metaDescription = seo.metaDescription;
            if (!response.canonicalUrl && seo.canonical) response.canonicalUrl = seo.canonical;
        } catch {
            // Invalid JSON, skip
        }
    }

    return response;
}
