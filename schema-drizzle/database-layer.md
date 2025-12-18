### 🧠 TypeScript Definition: Generic Settings (Flexible)

**Constraint:**
The `value` column must be flexible. It stores different JSON structures depending on the `key` (e.g., 'socials' is an object of URLs, 'features' is an object of booleans).

**Implementation:**
We use `Record<string, any>` to define the column type. This tells TypeScript "This is a JSON object", but allows any structure inside. Type validation will happen at the Application level (React/Astro), not the Database level.

**Code for `packages/db/src/schema.ts`:**

```typescript
import { sqliteTable, text, integer, sql } from 'drizzle-orm/sqlite-core';

export const siteSettings = sqliteTable('site_settings', {
  // The key (e.g., "social_links", "seo_config")
  key: text('key').primaryKey(),
  
  // GENERIC JSON TYPE
  // We use Record<string, any> to allow any JSON object.
  // We do NOT hardcode interfaces here to keep the DB schema agnostic.
  value: text('value', { mode: 'json' })
    .$type<Record<string, any>>() 
    .notNull(),
    
  description: text('description'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// apps/admin/src/lib/settingsTypes.ts

// 1. Define known shapes (Optional, just for autocomplete)
export interface SocialSettings {
  facebook: string;
  twitter: string;
}

export interface GeneralSettings {
  siteName: string;
  contactEmail: string;
}

// 2. Helper to cast the generic DB result to a specific type
// Usage: const socials = settings.value as SocialSettings;
### Why this is better for you?

1.  **Database Layer (Drizzle):** It's robust. It just knows "I save Objects". It won't crash if you save a new setting it doesn't know about.
2.  **Application Layer (React):** You can cast the types *if you want to*, but you are not forced to.
    * *Example:* If you create a new setting "Christmas Theme" in your Admin, you can just save `{ "snow": true }` without touching any TypeScript file.


    -------------------------------------------------------------------------
La Forme Idéale de l'URL
Pour un site de contenu (Blog/Recettes), je recommande cette structure standardisée :

https://{domaine}/{année}/{mois}/{slug}-{timestamp}-{taille}.webp

Exemple concret : https://assets.freecipies.com/2025/03/tarte-pommes-1740589200-lg.webp

    // packages/db/src/types.ts

/**
 * Represents a single physical file stored on Cloudflare R2.
 */
export interface R2File {
  url: string;      // Public CDN URL (assets.domain.com/...)
  r2Key: string;    // Internal Key (2025/03/file-lg.webp) for deletion
  width: number;
  height: number;   // Calculated during client-side compression
}

/**
 * The JSON Payload stored in `media.variants_json`.
 * Maps to the "Mobile-First" breakpoint strategy.
 */
export interface MediaVariants {
  variants: {
    xs: R2File; // 360px width
    sm: R2File; // 720px width
    md: R2File; // 1200px width
    lg: R2File; // 2048px width
  };
  placeholder: string; // Base64 Blur string (< 100 chars)
}

/**
 * The JSON Payload stored in `media.focal_point_json`.
 * Used for CSS: object-position: {x}% {y}%;
 */
export interface FocalPoint {
  x: number; // 0 to 100
  y: number; // 0 to 100
}

// packages/db/src/schema.ts

export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  
  // Metadata
  name: text('name').notNull(),
  altText: text('alt_text'),
  caption: text('caption'),
  credit: text('credit'),
  mimeType: text('mime_type').default('image/webp'),
  
  // JSON Columns
  variants: text('variants_json', { mode: 'json' })
    .$type<MediaVariants>()
    .notNull(),
    
  focalPoint: text('focal_point_json', { mode: 'json' })
    .$type<FocalPoint>()
    .default({ x: 50, y: 50 }),
    
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

3. Business Logic Rules (For the Agent)
⚠️ CRITICAL IMPLEMENTATION DETAILS:

Deletion Safety: When deleting a row from media, the backend MUST read variants_json first. It must extract the r2Key for all 4 variants (xs, sm, md, lg) and send a DeleteObject command to the R2 Bucket. Only then should the SQL row be deleted. This prevents "Orphaned Files" (ghost files) on the storage.

// packages/db/src/types.ts

export interface FocalPoint {
  x: number; // Pourcentage horizontal (0-100)
  y: number; // Pourcentage vertical (0-100)
}

// packages/db/src/schema.ts

export const media = sqliteTable('media', {
  // ... autres champs
  
  caption: text('caption'),
  credit: text('credit'),
  
  focalPoint: text('focal_point_json', { mode: 'json' })
    .$type<FocalPoint>()
    .default({ x: 50, y: 50 }), // Centre par défaut
});

Focal Point UI: In the Admin React Component, when editing an image, allow the user to click on the preview image.

Calculate the click position as a percentage (X%, Y%).
Save this to focal_point_json.
Visual feedback: Show a small dot overlay on the image.
Search: The Media Library search bar should query name, alt_text, and credit using OR logic (e.g., WHERE name LIKE %q% OR alt_text LIKE %q%).

