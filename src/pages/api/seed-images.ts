import type { APIRoute } from 'astro';
import type { Env } from '../../lib/db';
import { uploadImage } from '../../lib/r2';

export const prerender = false;

const SAMPLE_IMAGES = [
    {
        url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
        filename: 'food-1.jpg',
        alt: 'Delicious food spread',
        attribution: 'Unsplash'
    },
    {
        url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80',
        filename: 'salad.jpg',
        alt: 'Fresh salad',
        attribution: 'Unsplash'
    },
    {
        url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
        filename: 'pizza.jpg',
        alt: 'Homemade pizza',
        attribution: 'Unsplash'
    },
    {
        url: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=800&q=80',
        filename: 'pancakes.jpg',
        alt: 'Fluffy pancakes',
        attribution: 'Unsplash'
    },
    {
        url: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&q=80',
        filename: 'french-toast.jpg',
        alt: 'French toast',
        attribution: 'Unsplash'
    },
    {
        url: 'https://images.unsplash.com/photo-1467003909585-2f8a7270028d?w=800&q=80',
        filename: 'healthy-bowl.jpg',
        alt: 'Healthy food bowl',
        attribution: 'Unsplash'
    },
    {
        url: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800&q=80',
        filename: 'pasta.jpg',
        alt: 'Italian pasta',
        attribution: 'Unsplash'
    },
    {
        url: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=800&q=80',
        filename: 'dessert.jpg',
        alt: 'Sweet dessert',
        attribution: 'Unsplash'
    }
];

export const GET: APIRoute = async ({ locals }) => {
    try {
        const env = locals.runtime.env as Env;
        const bucket = env.IMAGES;
        const db = env.DB;
        const publicUrl = env.R2_PUBLIC_URL || '/images';

        interface UploadedImage {
            key: string;
            url: string;
            filename: string;
            size: number;
            contentType: string;
            alt: string;
            width: number;
            height: number;
            success: boolean;
        }

        const uploadedImages: UploadedImage[] = [];

        // 1. Upload all images
        for (const img of SAMPLE_IMAGES) {
            // Fetch image
            const response = await fetch(img.url);
            const blob = await response.blob();

            // Upload to R2
            const uploadResult = await uploadImage(
                bucket,
                {
                    file: blob,
                    filename: img.filename,
                    contentType: 'image/jpeg',
                    metadata: {
                        alt: img.alt,
                        attribution: img.attribution
                    }
                },
                publicUrl
            );

            // Insert into DB (Media table)
            await db.prepare(`
        INSERT INTO media (
          filename, r2_key, url, mime_type,
          size_bytes, alt_text, attribution, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(r2_key) DO UPDATE SET
          url=excluded.url,
          uploaded_at=CURRENT_TIMESTAMP
      `).bind(
                img.filename,
                uploadResult.key,
                uploadResult.url,
                uploadResult.contentType,
                uploadResult.size,
                img.alt,
                img.attribution,
                'seed-script'
            ).run();

            uploadedImages.push({
                ...uploadResult,
                alt: img.alt,
                width: 800, // Hardcoded for now as we know the source
                height: 600
            });
        }

        // 2. Assign images to Categories
        const { results: categories } = await db.prepare('SELECT id, slug FROM categories').all();

        for (const cat of categories) {
            const randomImage = uploadedImages[Math.floor(Math.random() * uploadedImages.length)];
            await db.prepare(`
                UPDATE categories 
                SET image_url = ?, image_alt = ?, image_width = ?, image_height = ?
                WHERE id = ?
            `).bind(
                randomImage.url,
                randomImage.alt,
                randomImage.width,
                randomImage.height,
                cat.id
            ).run();
        }

        // 3. Assign images to Articles
        const { results: articles } = await db.prepare('SELECT id, slug FROM articles').all();

        for (const article of articles) {
            const randomImage = uploadedImages[Math.floor(Math.random() * uploadedImages.length)];
            const randomCover = uploadedImages[Math.floor(Math.random() * uploadedImages.length)];

            await db.prepare(`
                UPDATE articles 
                SET 
                    image_url = ?, image_alt = ?, image_width = ?, image_height = ?,
                    cover_url = ?, cover_alt = ?, cover_width = ?, cover_height = ?
                WHERE id = ?
            `).bind(
                randomImage.url, randomImage.alt, randomImage.width, randomImage.height,
                randomCover.url, randomCover.alt, randomCover.width, randomCover.height,
                article.id
            ).run();
        }

        return new Response(JSON.stringify({
            success: true,
            message: `Seeded ${uploadedImages.length} images and updated ${categories.length} categories and ${articles.length} articles.`,
            data: uploadedImages
        }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Seeding error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
