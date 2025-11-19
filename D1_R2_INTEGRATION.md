# D1 & R2 Integration Summary

## Overview

The Freecipies blog platform now integrates **Cloudflare D1** (SQLite database) and **Cloudflare R2** (object storage) for a complete, serverless data layer.

## What's Been Implemented

### 1. Database Schema (D1)

**File:** `schema.sql`

Created comprehensive database schema with:
- **categories** table - Recipe categories
- **authors** table - Recipe authors
- **tags** table - Recipe tags
- **recipes** table - Main recipe content
- **recipe_tags** junction table - Many-to-many relationship
- **images** table - R2 image metadata tracking

**Features:**
- Auto-incrementing IDs
- Foreign key constraints
- Indexes for performance
- Triggers for automatic timestamp updates
- Views for complex queries
- Sample data templates

### 2. Database Utilities (D1)

**File:** `src/lib/db.ts`

Comprehensive database operations:

**Recipe Operations:**
- `getRecipes()` - List recipes with filters (category, author, pagination)
- `getRecipeBySlug()` - Get single recipe
- `createRecipe()` - Insert new recipe
- `updateRecipe()` - Update existing recipe
- `deleteRecipe()` - Delete recipe

**Category Operations:**
- `getCategories()` - List all categories
- `getCategoryBySlug()` - Get single category

**Author Operations:**
- `getAuthors()` - List all authors
- `getAuthorBySlug()` - Get single author

**Helper Functions:**
- Row-to-object mapping
- Type-safe conversions
- JSON parsing for complex fields

### 3. Image Storage Utilities (R2)

**File:** `src/lib/r2.ts`

Complete R2 image management:

**Upload Operations:**
- `uploadImage()` - Upload single image
- `uploadImagesBatch()` - Bulk upload
- `validateImage()` - File validation (size, type)
- `processImage()` - Image optimization (placeholder)
- `getImageDimensions()` - Extract dimensions

**Retrieval Operations:**
- `getImage()` - Fetch image from R2
- `listImages()` - List all images with pagination
- `getImageMetadata()` - Get image metadata
- `getImageUrl()` - Generate public URL

**Management:**
- `deleteImage()` - Remove image from R2

### 4. Updated API Endpoints

#### Recipes API (`src/pages/api/recipes.ts`)
- **GET** - Fetch recipes with D1 queries
  - Filter by slug, category, author
  - Pagination support
  - Online status filtering
- **POST** - Create new recipe
- **PUT** - Update recipe
- **DELETE** - Delete recipe

#### Categories API (`src/pages/api/categories.ts`)
- **GET** - Fetch categories from D1
  - Single or all categories
  - Online status filtering
- **POST** - Create new category

#### Authors API (`src/pages/api/authors.ts`)
- **GET** - Fetch authors from D1
  - Single or all authors
  - Online status filtering
- **POST** - Create new author

#### Image Upload API (`src/pages/api/upload-image.ts`)
- **POST** - Upload image to R2
  - File validation
  - Metadata storage in D1
  - Public URL generation
- **GET** - List uploaded images
  - Pagination support

### 5. Configuration Updates

#### wrangler.toml
```toml
# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "freecipies-db"
database_id = "your-database-id"
preview_database_id = "your-preview-database-id"

# R2 Bucket binding
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "freecipies-images"
preview_bucket_name = "freecipies-images-preview"

# Environment variables
[vars]
ENVIRONMENT = "production"
R2_PUBLIC_URL = "https://images.freecipies.com"
```

#### .env.example
Added D1 and R2 configuration:
- `D1_DATABASE_ID`
- `D1_PREVIEW_DATABASE_ID`
- `R2_BUCKET_NAME`
- `R2_PREVIEW_BUCKET_NAME`
- `R2_PUBLIC_URL`

### 6. Migration Tools

#### CSV to D1 Migration Script
**File:** `scripts/migrate-csv-to-d1.js`

Features:
- Import categories from CSV
- Import authors from CSV
- Import recipes from CSV
- Upsert logic (insert or update)
- Progress logging
- Error handling

**Usage:**
```bash
export D1_DATABASE_ID="your-database-id"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
export CLOUDFLARE_API_TOKEN="your-api-token"

pnpm migrate
```

### 7. Documentation

Created comprehensive guides:

1. **D1_R2_SETUP.md** - Complete setup guide
   - D1 database creation
   - R2 bucket creation
   - Schema migration
   - Data migration
   - Testing procedures

2. **D1_R2_INTEGRATION.md** - This file
   - Integration summary
   - Implementation details
   - Usage examples

## How It Works

### Data Flow

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ HTTP Request
       ▼
┌─────────────────────┐
│  Astro.js Frontend  │
└──────────┬──────────┘
           │ API Call
           ▼
┌─────────────────────────────┐
│  Cloudflare Workers (API)   │
│  - /api/recipes             │
│  - /api/categories          │
│  - /api/authors             │
│  - /api/upload-image        │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌─────────┐
│   D1    │  │   R2    │
│Database │  │ Storage │
└─────────┘  └─────────┘
```

### Example: Fetch Recipe

```typescript
// API endpoint: /api/recipes?slug=spaghetti-puttanesca
import { getRecipeBySlug } from '../../lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const db = env.DB;
  
  const recipe = await getRecipeBySlug(db, 'spaghetti-puttanesca');
  
  return new Response(JSON.stringify({
    success: true,
    data: recipe
  }));
};
```

### Example: Upload Image

```typescript
// API endpoint: /api/upload-image
import { uploadImage } from '../../lib/r2';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env;
  const bucket = env.IMAGES;
  const publicUrl = env.R2_PUBLIC_URL;
  
  const formData = await request.formData();
  const file = formData.get('file');
  
  const result = await uploadImage(bucket, {
    file,
    filename: file.name
  }, publicUrl);
  
  // Store metadata in D1
  await env.DB.prepare(`
    INSERT INTO images (filename, r2_key, mime_type, size_bytes)
    VALUES (?, ?, ?, ?)
  `).bind(
    result.filename,
    result.key,
    result.contentType,
    result.size
  ).run();
  
  return new Response(JSON.stringify({
    success: true,
    data: { url: result.url }
  }));
};
```

## API Usage Examples

### Fetch All Recipes

```bash
curl "https://freecipies.com/api/recipes?limit=12&page=1"
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 100,
    "totalPages": 9
  }
}
```

### Fetch Recipe by Slug

```bash
curl "https://freecipies.com/api/recipes?slug=spaghetti-puttanesca"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "spaghetti-puttanesca",
    "label": "Spaghetti Puttanesca",
    "categorySlug": "dinner",
    "authorSlug": "katt-lawrence",
    "recipe": {
      "ingredients": [...],
      "instructions": [...],
      "nutrition": {...}
    }
  }
}
```

### Upload Image

```bash
curl -X POST https://freecipies.com/api/upload-image \
  -F "file=@./pasta-image.jpg" \
  -F "alt=Delicious pasta dish" \
  -F "attribution=Photo by John Doe"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://images.freecipies.com/images/1234567890-pasta-image.jpg",
    "key": "images/1234567890-pasta-image.jpg",
    "filename": "pasta-image.jpg",
    "size": 245678,
    "contentType": "image/jpeg"
  }
}
```

## Database Schema Highlights

### Recipes Table

```sql
CREATE TABLE recipes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  category_slug TEXT NOT NULL,
  author_slug TEXT NOT NULL,
  label TEXT NOT NULL,
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  recipe_data TEXT NOT NULL, -- JSON
  is_online BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_slug) REFERENCES categories(slug),
  FOREIGN KEY (author_slug) REFERENCES authors(slug)
);
```

### Images Table

```sql
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT UNIQUE NOT NULL,
  r2_key TEXT UNIQUE NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Performance Optimizations

1. **Indexes** - Added on frequently queried columns
   - `category_slug`, `author_slug`, `is_online`
   - `created_at DESC` for chronological queries

2. **Views** - Pre-joined queries for complex data
   - `v_recipes_full` - Recipes with category and author names

3. **Caching** - API responses cached at edge
   - `Cache-Control: public, max-age=3600`

4. **Pagination** - Limit/offset for large datasets

5. **Edge Computing** - D1 and R2 at Cloudflare edge locations

## Next Steps

### Immediate Tasks

1. **Set up D1 database:**
   ```bash
   wrangler d1 create freecipies-db
   wrangler d1 execute freecipies-db --file=./schema.sql
   ```

2. **Set up R2 bucket:**
   ```bash
   wrangler r2 bucket create freecipies-images
   ```

3. **Migrate data:**
   ```bash
   pnpm migrate
   ```

4. **Test locally:**
   ```bash
   pnpm dev
   curl "http://localhost:4321/api/recipes"
   ```

5. **Deploy to Cloudflare Pages:**
   ```bash
   pnpm build
   wrangler pages deploy dist
   ```

### Future Enhancements

1. **Full-text search** - Use D1 FTS5 extension
2. **Image optimization** - Cloudflare Images integration
3. **Caching layer** - Add KV for frequently accessed data
4. **Analytics** - Track recipe views and popularity
5. **Admin dashboard** - CRUD interface for content management

## Resources

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Astro.js Docs](https://docs.astro.build/)
- [Project README](./PROJECT_README.md)
- [Setup Guide](./D1_R2_SETUP.md)

---

**Integration Complete!** 🚀

Your Freecipies blog now has a fully integrated database and image storage system powered by Cloudflare's edge network.

