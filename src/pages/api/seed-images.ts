import type { APIRoute } from 'astro';
import { uploadImage, createMedia, type NewMedia } from '@modules/media';
import { formatSuccessResponse, formatErrorResponse, AppError, ErrorCodes } from '@shared/utils';
import type { Env } from '@shared/types';
import { extractAuthContext, hasRole, AuthRoles, createAuthError } from '@modules/auth';

// Default seed images for categories
const SEED_IMAGES = [
    { name: 'Breakfast', url: 'https://images.unsplash.com/photo-1533089862017-5614387e0748?w=800&q=80', folder: 'categories', slug: 'breakfast' },
    { name: 'Desserts', url: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80', folder: 'categories', slug: 'desserts' },
    { name: 'Dinner', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80', folder: 'categories', slug: 'dinner' },
    { name: 'Healthy', url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80', folder: 'categories', slug: 'healthy' },
    { name: 'Vegan', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', folder: 'categories', slug: 'vegan' },
    { name: 'Baking', url: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=800&q=80', folder: 'categories', slug: 'baking' }
];

export const POST: APIRoute = async ({ request, locals }) => {
    try {
        const env = (locals as any).runtime?.env as Env;
        if (!env?.IMAGES) { throw new AppError(ErrorCodes.INTERNAL_ERROR, 'Storage not configured', 500); }
        const publicUrl = env.R2_PUBLIC_URL ? env.R2_PUBLIC_URL.replace(/\/$/, '') : '/images';

        // Auth (Admin only)
        const jwtSecret = env.JWT_SECRET || import.meta.env.JWT_SECRET;
        const authContext = await extractAuthContext(request, jwtSecret);
        if (!hasRole(authContext, AuthRoles.ADMIN)) {
            return createAuthError('Insufficient permissions', 403);
        }

        const results = [];

        for (const img of SEED_IMAGES) {
            try {
                // 1. Fetch image
                const response = await fetch(img.url);
                if (!response.ok) {
                    console.warn(`Failed to fetch ${img.url}`);
                    continue;
                }
                const blob = await response.blob();
                
                // 2. Upload to R2
                const uploadResult = await uploadImage(
                    env.IMAGES,
                    {
                        file: blob,
                        filename: `${img.slug}.jpg`,
                        contentType: blob.type,
                        folder: img.folder,
                        metadata: { alt: img.name }
                    },
                    publicUrl
                );

                // 3. Create Media Record
                const variants = {
                    original: { url: uploadResult.url, width: 800, height: 600, sizeBytes: uploadResult.size }, // Approximate
                    lg: { url: uploadResult.url, width: 800, height: 600, sizeBytes: uploadResult.size },
                    md: { url: uploadResult.url, width: 800, height: 600, sizeBytes: uploadResult.size },
                    sm: { url: uploadResult.url, width: 800, height: 600, sizeBytes: uploadResult.size },
                    xs: { url: uploadResult.url, width: 800, height: 600, sizeBytes: uploadResult.size }
                };

                const mediaData: NewMedia = {
                    name: img.name,
                    altText: img.name,
                    caption: `Default cover for ${img.slug}`,
                    credit: 'Unsplash',
                    mimeType: uploadResult.contentType,
                    variantsJson: JSON.stringify(variants),
                    focalPointJson: JSON.stringify({ x: 50, y: 50 }),
                    aspectRatio: '4:3'
                };

                const newMedia = await createMedia(env.DB, mediaData);
                
                if (newMedia) {
                    results.push({ id: newMedia.id, name: newMedia.name });

                    // 4. Update Category Link (if matches)
                    // Construction of the JSON object that goes into categories.images_json (or cover_image_json)
                    // Checking schema.sql for categories table... 
                    // It has `cover_image_json` and `hero_image_json`.
                    
                    const imageJson = JSON.stringify({
                        media_id: newMedia.id,
                        alt: newMedia.altText,
                        placeholder: uploadResult.url, // simplistic placeholder
                        aspectRatio: '4:3',
                        variants: variants
                    });

                    // We update cover_image_json
                    await env.DB.prepare(`UPDATE categories SET cover_image_json = ? WHERE slug = ?`)
                        .bind(imageJson, img.slug)
                        .run();
                }

            } catch (innerError) {
                console.error(`Failed to seed ${img.name}:`, innerError);
            }
        }

        const { body, status, headers } = formatSuccessResponse({ 
            success: true, 
            message: `Seeded ${results.length} images`, 
            seeded: results 
        });
        return new Response(body, { status: 200, headers });

    } catch (error) {
        console.error('Seeding completely failed:', error);
        return new Response(JSON.stringify({ error: 'Seeding failed' }), { status: 500 });
    }
};
