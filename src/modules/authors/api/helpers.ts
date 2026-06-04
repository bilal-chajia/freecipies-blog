/**
 * Authors Module - API Helpers
 * ==============================
 * Helper functions for API endpoints to handle JSON transformations
 */

import type { ImagesJson, BioJson, PersonaJson, SeoJson, BioSocialLink } from '../types/authors.types';
import type { ImageVariants } from '../../articles/types/images.types';
import type { StoredImageSlot } from '@shared/types/images';
import { resolveVariantUrl } from '@shared/types/images';
import {
    buildAuthorCreditSnapshot,
    serializeAuthorCreditForAdmin,
} from '@shared/images/image-contract';

const getBestVariant = (variants?: ImageVariants) => {
    return variants?.lg || variants?.md || variants?.sm || variants?.original || variants?.xs;
};

const extractR2KeyFromUrl = (url: string): string | null => {
    if (!url) return null;
    const proxyMatch = url.match(/^\/api\/images\/(.+)$/);
    if (proxyMatch) return proxyMatch[1];
    const r2Match = url.match(/^https:\/\/pub-[a-f0-9]+\.r2\.dev\/(.+)$/i);
    if (r2Match) return r2Match[1];
    const localMatch = url.match(/^https?:\/\/[^\/]+\/api\/images\/(.+)$/);
    if (localMatch) return localMatch[1];
    return null;
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
    if (value.content && typeof value.content === 'object') normalized.content = value.content;
    if (value.headline) normalized.headline = value.headline;
    if (value.subtitle) normalized.subtitle = value.subtitle;
    if (value.introduction) normalized.introduction = value.introduction;
    if (value.fullBio) normalized.fullBio = value.fullBio;
    if (Array.isArray(value.expertise)) normalized.expertise = value.expertise;
    if (legacySocialLinks && Object.keys(legacySocialLinks).length > 0) {
        normalized.socialLinks = legacySocialLinks;
    } else if (socialLinksFromArray && Object.keys(socialLinksFromArray).length > 0) {
        normalized.socialLinks = socialLinksFromArray;
    }
    if (socials && socials.length > 0) normalized.socials = socials;

    return normalized;
};

const normalizePersonaJsonObject = (value: any): PersonaJson => {
    if (!value || typeof value !== 'object') return {};

    const normalized: PersonaJson = {};
    if (typeof value.voice === 'string') normalized.voice = value.voice;
    if (typeof value.audience === 'string') normalized.audience = value.audience;
    if (typeof value.point_of_view === 'string') normalized.point_of_view = value.point_of_view;
    if (Array.isArray(value.expertise)) normalized.expertise = value.expertise;
    if (Array.isArray(value.avoid)) normalized.avoid = value.avoid;

    return normalized;
};

const normalizeSeoJsonObject = (value: any): SeoJson => {
    if (!value || typeof value !== 'object') return {};

    return {
        meta_title: value.meta_title ?? null,
        meta_description: value.meta_description ?? null,
        no_index: Boolean(value.no_index ?? false),
        canonical: value.canonical ?? null,
        og_image: value.og_image ?? null,
        og_title: value.og_title ?? null,
        og_description: value.og_description ?? null,
        twitter_card: value.twitter_card ?? 'summary_large_image',
    };
};

const normalizeStoredVariant = (variant: any) => {
    if (!variant || typeof variant !== 'object') return null;
    const r2Key = typeof variant.r2_key === 'string'
        ? variant.r2_key
        : typeof variant.url === 'string'
            ? extractR2KeyFromUrl(variant.url)
            : null;
    if (!r2Key) return null;

    const width = Number(variant.width);
    const height = Number(variant.height);
    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) return null;

    return {
        r2_key: r2Key,
        width,
        height,
        ...(Number.isFinite(Number(variant.size_bytes))
            ? { size_bytes: Number(variant.size_bytes) }
            : {}),
    };
};

type AuthorStoredImagesJson = {
    avatar?: StoredImageSlot;
    hero?: StoredImageSlot;
};

const normalizeImageSlot = (slot: any, variantKeys: string[], fallbackAspectRatio: string): StoredImageSlot | undefined => {
    if (!slot || typeof slot !== 'object') return undefined;

    const variants: Record<string, unknown> = {};
    const sourceVariants = slot.variants && typeof slot.variants === 'object' ? slot.variants : {};

    for (const key of variantKeys) {
        const normalized = normalizeStoredVariant(sourceVariants[key]);
        if (normalized) variants[key] = normalized;
    }

    if (Object.keys(variants).length !== variantKeys.length) return undefined;

    const normalized: StoredImageSlot = {
        ...(typeof slot.media_id === 'number' ? { media_id: slot.media_id } : {}),
        alt: typeof slot.alt === 'string' && slot.alt.trim() ? slot.alt : '',
        placeholder: typeof slot.placeholder === 'string' ? slot.placeholder : '',
        aspect_ratio: typeof slot.aspect_ratio === 'string'
            ? slot.aspect_ratio
            : fallbackAspectRatio,
        variants,
    };

    if (slot.focal_point && typeof slot.focal_point === 'object') normalized.focal_point = slot.focal_point as StoredImageSlot['focal_point'];

    return normalized;
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
            const normalized: AuthorStoredImagesJson = {
                avatar: normalizeImageSlot(images.avatar, ['xs', 'sm'], '1:1'),
                hero: normalizeImageSlot(images.hero, ['sm', 'md', 'lg'], '16:9'),
            };
            return JSON.stringify(normalized);
        } catch {
            return '{}';
        }
    }

    // If object, stringify
    if (typeof value === 'object') {
        const normalized: AuthorStoredImagesJson = {
            avatar: normalizeImageSlot(value.avatar, ['xs', 'sm'], '1:1'),
            hero: normalizeImageSlot(value.hero, ['sm', 'md', 'lg'], '16:9'),
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
 * Parse and validate PersonaJson from request body
 */
export function parsePersonaJson(value: any): string {
    if (!value) return '{}';

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return JSON.stringify(normalizePersonaJsonObject(parsed));
        } catch {
            return '{}';
        }
    }

    if (typeof value === 'object') {
        return JSON.stringify(normalizePersonaJsonObject(value));
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
 * Transform request body to handle flat author fields and snake_case JSON fields.
 */
export function transformAuthorRequestBody(body: any): any {
    const transformed = { ...body };
    const hasLegacyImageFields = ['image_url', 'imageAlt', 'imageWidth', 'imageHeight']
        .some((key) => Object.prototype.hasOwnProperty.call(body, key));

    // Handle images_json
    if (body.images_json !== undefined) {
        transformed.images_json = parseImagesJson(body.images_json);
    } else if (hasLegacyImageFields) {
        // Convert legacy flat fields to images_json
        const images: Partial<Record<'avatar', unknown>> = {};
        if (body.image_url) {
            const r2Key = extractR2KeyFromUrl(body.image_url);
            images.avatar = {
                alt: body.imageAlt,
                variants: {
                    xs: {
                        ...(r2Key ? { r2_key: r2Key } : { url: body.image_url }),
                        width: body.imageWidth ?? 0,
                        height: body.imageHeight ?? 0,
                    },
                    sm: {
                        ...(r2Key ? { r2_key: r2Key } : { url: body.image_url }),
                        width: body.imageWidth ?? 0,
                        height: body.imageHeight ?? 0,
                    },
                },
            };
        }
        transformed.images_json = JSON.stringify(images);
        // Remove flat fields
        delete transformed.image_url;
        delete transformed.imageAlt;
        delete transformed.imageWidth;
        delete transformed.imageHeight;
    }

    // Handle bio_json
    if (body.bio_json !== undefined) {
        transformed.bio_json = parseBioJson(body.bio_json);
    } else if (body.introduction || body.fullBio || body.social_links || body.headline || body.subtitle) {
        transformed.bio_json = parseBioJson({
            introduction: body.introduction,
            fullBio: body.fullBio,
            socialLinks: body.social_links,
            headline: body.headline,
            subtitle: body.subtitle,
        });
    }

    if (body.persona_json !== undefined) {
        transformed.persona_json = parsePersonaJson(body.persona_json);
    }

    // Handle seo_json - convert flat fields if needed
    if (body.seo_json !== undefined) {
        transformed.seo_json = parseSeoJson(body.seo_json);
    } else if ([
        'metaTitle',
        'metaDescription',
        'canonicalUrl',
        'canonical',
        'ogImage',
        'ogTitle',
        'ogDescription',
        'twitterCard',
        'noIndex',
    ].some((key) => Object.prototype.hasOwnProperty.call(body, key))) {
        transformed.seo_json = parseSeoJson({
            meta_title: body.metaTitle,
            meta_description: body.metaDescription,
            canonical: body.canonical ?? body.canonicalUrl,
            og_image: body.ogImage,
            og_title: body.ogTitle,
            og_description: body.ogDescription,
            twitter_card: body.twitterCard,
            no_index: body.noIndex,
        });
        // Keep flat fields for now (backward compat)
    }

    return transformed;
}

/**
 * Transform author response to include flat display fields derived from snake_case JSON.
 */
export function transformAuthorResponse(author: any): any {
    if (!author) return author;

    const response = { ...author };
    response.mediaCredit = serializeAuthorCreditForAdmin(buildAuthorCreditSnapshot(author));

    // Parse images_json and add flat fields
    if (author.images_json) {
        try {
            const images: ImagesJson = JSON.parse(author.images_json);
            if (images.avatar) {
                const variant = getBestVariant(images.avatar.variants);
                response.image_url = resolveVariantUrl(variant);
                response.imageAlt = images.avatar.alt;
                response.imageWidth = variant?.width;
                response.imageHeight = variant?.height;
            }
        } catch {
            // Invalid JSON, skip
        }
    }

    // Parse seo_json and add flat fields
    if (author.seo_json) {
        try {
            const seo: SeoJson = JSON.parse(author.seo_json);
            if (response.meta_title === undefined && seo.meta_title !== undefined) response.meta_title = seo.meta_title ?? undefined;
            if (response.meta_description === undefined && seo.meta_description !== undefined) response.meta_description = seo.meta_description ?? undefined;
            if (response.canonical === undefined && seo.canonical) response.canonical = seo.canonical;
            if (response.og_image === undefined && seo.og_image !== undefined) response.og_image = seo.og_image;
            if (response.og_title === undefined && seo.og_title !== undefined) response.og_title = seo.og_title;
            if (response.og_description === undefined && seo.og_description !== undefined) response.og_description = seo.og_description;
            if (response.twitter_card === undefined && seo.twitter_card !== undefined) response.twitter_card = seo.twitter_card;
            if (response.no_index === undefined && seo.no_index !== undefined) response.no_index = seo.no_index;
        } catch {
            // Invalid JSON, skip
        }
    }

    return response;
}
