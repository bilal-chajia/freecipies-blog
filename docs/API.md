# API Documentation

> **Last Updated:** 2026-05-13
> **Base URL:** `/api`
> **Auth:** Bearer Token (Admin endpoints)
> **Version:** Astro 6 + React 19

---

## 🤖 AI Agent Guidelines

> **IMPORTANT:** Follow these conventions when implementing or consuming APIs.

### Request/Response Format

- All requests/responses use **JSON**
- Use `docs/NAMING_CONTRACT.md` for serialized JSON and implementation names.
- Dates are **ISO-8601** format (UTC)
- Empty arrays: `[]`, empty objects: `{}`
- For stored article JSON contracts, use:
  - `docs/CONTENT_JSON_CONTRACT.md` for `content_json`
  - `docs/RECIPE_JSON_CONTRACT.md` for `recipe_json`
  - `docs/ARTICLE_JSON_CONTRACTS.md` for `images_json`, `roundup_json`, `seo_json`, `config_json`
  - `docs/ARTICLE_CACHED_FIELDS_CONTRACT.md` for cached fields

### Authentication

```http
Authorization: Bearer <token>
```

Public endpoints (GET lists, GET by slug) don't require auth.  
Mutations (POST, PUT, DELETE) require admin auth.

---

## Response Formats

### Success Response (Single)

```json
{
  "success": true,
  "data": { ... }
}
```

### Success Response (List)

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 156,
    "totalPages": 13,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Article not found",
  "code": "NOT_FOUND"
}
```

### Validation Error

```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "headline": ["Required field"],
    "slug": ["Must be lowercase kebab-case"]
  }
}
```

---

## Error Codes

| Code               | HTTP Status | Description              |
| ------------------ | ----------- | ------------------------ |
| `NOT_FOUND`        | 404         | Resource doesn't exist   |
| `VALIDATION_ERROR` | 400         | Invalid input data       |
| `DUPLICATE_SLUG`   | 409         | Slug already exists      |
| `UNAUTHORIZED`     | 401         | Missing or invalid auth  |
| `FORBIDDEN`        | 403         | Insufficient permissions |
| `INTERNAL_ERROR`   | 500         | Server error             |

---

## Articles

### GET /api/articles

List articles with pagination and filters.

**Query Parameters:**

| Param      | Type    | Default       | Description                    |
| ---------- | ------- | ------------- | ------------------------------ |
| `page`     | number  | 1             | Page number                    |
| `limit`    | number  | 12            | Items per page (max 100)       |
| `sort`     | string  | `publishedAt` | Sort field                     |
| `order`    | string  | `desc`        | `asc` or `desc`                |
| `type`     | string  | -             | `article`, `recipe`, `roundup` |
| `category` | string  | -             | Category slug                  |
| `author`   | string  | -             | Author slug                    |
| `tag`      | string  | -             | Tag slug (comma-separated)     |
| `online`   | boolean | `true`        | Visibility filter              |
| `featured` | boolean | -             | Featured articles only         |
| `search`   | string  | -             | Full-text search               |

**Example:**

```http
GET /api/articles?type=recipe&category=desserts&limit=6&page=1
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "slug": "chocolate-brownies",
      "type": "recipe",
      "headline": "Best Chocolate Brownies",
      "shortDescription": "Fudgy, rich brownies...",
      "categorySlug": "desserts",
      "categoryLabel": "Desserts",
      "categoryColor": "#8b4513",
      "authorSlug": "jane-doe",
      "authorName": "Jane Doe",
      "imageUrl": "https://cdn.example.com/img-md.webp",
      "publishedAt": "2025-12-15T10:30:00Z",
      "totalTimeMinutes": 45,
      "difficulty": "Easy",
      "route": "/recipes/chocolate-brownies"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 6,
    "total": 24,
    "totalPages": 4,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### GET /api/articles/:slug

Get article by slug with full details.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 42,
    "slug": "chocolate-brownies",
    "type": "recipe",
    "headline": "Best Chocolate Brownies",
    "subtitle": "Rich, fudgy, and perfect",
    "shortDescription": "Learn how to make...",
    "excerpt": "These brownies are...",
    "introduction": "Nothing beats homemade brownies...",
    "images": {
      "hero": {
        "alt": "Chocolate brownies",
        "variants": {
          "xs": { "url": "...", "width": 360, "height": 240 },
          "sm": { "url": "...", "width": 720, "height": 480 },
          "md": { "url": "...", "width": 1200, "height": 800 },
          "lg": { "url": "...", "width": 2048, "height": 1365 }
        }
      }
    },
    "content": [
      { "type": "paragraph", "text": "Start by preheating..." },
      { "type": "heading", "level": 2, "text": "Ingredients" }
    ],
    "recipe": {
      "prep": 15,
      "cook": 25,
      "total": 40,
      "servings": 12,
      "recipe_yield": "12 brownies",
      "recipe_category": "Dessert",
      "recipe_cuisine": "American",
      "keywords": ["fudgy brownies", "easy dessert"],
      "difficulty": "Easy",
      "ingredients": [...],
      "instructions": [...],
      "equipment": [
        {
          "id": "eq-chefs-knife",
          "equipment_id": 1,
          "label": "Chef's knife",
          "required": true,
          "notes": null,
          "source_type": "catalog",
          "snapshot": {
            "slug": "chefs-knife-8",
            "name": "Chef's Knife 8\"",
            "affiliate_url": "https://amazon.com/...",
            "image": {
              "media_id": 22,
              "alt": "Chef's knife",
              "variants": {
                "xs": { "url": "https://...", "width": 360, "height": 360 },
                "sm": { "url": "https://...", "width": 720, "height": 720 }
              }
            }
          }
        },
        {
          "id": "eq-large-bowl",
          "equipment_id": null,
          "label": "Large mixing bowl",
          "required": true,
          "notes": null,
          "source_type": "manual",
          "snapshot": null
        }
      ]
    },
    "category": {
      "id": 5,
      "slug": "desserts",
      "label": "Desserts",
      "color": "#8b4513"
    },
    "author": {
      "id": 1,
      "slug": "jane-doe",
      "name": "Jane Doe",
      "jobTitle": "Recipe Developer",
      "avatarUrl": "..."
    },
    "tags": [
      { "slug": "chocolate", "label": "Chocolate" },
      { "slug": "easy", "label": "Easy" }
    ],
    "seo": {
      "metaTitle": "Best Chocolate Brownies Recipe",
      "metaDescription": "..."
    },
    "relatedArticles": [...],
    "publishedAt": "2025-12-15T10:30:00Z",
    "updatedAt": "2025-12-18T14:00:00Z",
    "route": "/recipes/chocolate-brownies"
  }
}
```

Notes:

- `recipe` mirrors the stored `recipe_json` contract.
- Recipe equipment renders from `recipe.equipment[]`; catalog items contain a
  resolved `snapshot`, and manual items use `snapshot: null`.
- API response naming follows `docs/NAMING_CONTRACT.md`.

---

### POST /api/articles

Create new article. **Requires Auth.**

**Request Body:**

```json
{
  "slug": "new-recipe",
  "type": "recipe",
  "headline": "New Recipe Title",
  "short_description": "A delicious new recipe...",
  "category_id": 5,
  "author_id": 1,
  "images_json": { "hero": {...} },
  "content_json": {
    "version": 1,
    "kind": "content_document",
    "blocks": [
      { "id": "intro", "type": "paragraph", "text": "..." },
      { "id": "main-recipe", "type": "main_recipe" }
    ]
  },
  "recipe_json": {
    "prep": 15,
    "cook": 25,
    "total": 40,
    "servings": 4,
    "recipe_yield": "4 servings",
    "recipe_category": "Dinner",
    "recipe_cuisine": "Italian",
    "keywords": ["quick pasta", "weeknight dinner"],
    "ingredients": [],
    "instructions": [],
    "equipment": [
      { "equipment_id": 12, "label": "Stand mixer", "required": true, "notes": null },
      { "label": "Large mixing bowl", "required": true, "notes": null }
    ]
  },
  "tagIds": [1, 5, 12]
}
```

**Response:** `201 Created`

```json
{
  "success": true,
  "data": { "id": 43, "slug": "new-recipe" }
}
```

---

### PUT /api/articles/:id

Update article. **Requires Auth.**

**Request Body:** (partial update - only include fields to change)

```json
{
  "headline": "Updated Title",
  "shortDescription": "Updated description...",
  "isOnline": true
}
```

**Response:**

```json
{
  "success": true,
  "data": { "id": 42, "slug": "chocolate-brownies" }
}
```

---

### DELETE /api/articles/:id

Soft delete article. **Requires Auth.**

**Response:**

```json
{
  "success": true,
  "data": { "id": 42, "deleted": true }
}
```

---

## Categories

### GET /api/categories

List all categories.

**Query Parameters:**

| Param      | Type    | Default | Description           |
| ---------- | ------- | ------- | --------------------- |
| `online`   | boolean | `true`  | Visibility filter     |
| `featured` | boolean | -       | Featured only         |
| `parent`   | number  | -       | Filter by parent_id   |
| `depth`    | number  | -       | Filter by depth level |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "breakfast",
      "label": "Breakfast",
      "headline": "Breakfast Recipes",
      "shortDescription": "Start your day right...",
      "color": "#f59e0b",
      "postCount": 45,
      "imageUrl": "...",
      "route": "/category/breakfast"
    }
  ]
}
```

---

### GET /api/categories/:slug

Get category with articles.

**Query Parameters:**

| Param   | Type   | Default | Description       |
| ------- | ------ | ------- | ----------------- |
| `page`  | number | 1       | Articles page     |
| `limit` | number | 12      | Articles per page |

**Response:**

```json
{
  "success": true,
  "data": {
    "category": {
      "id": 1,
      "slug": "breakfast",
      "label": "Breakfast",
      "headline": "Breakfast Recipes",
      "shortDescription": "...",
      "images": {...},
      "color": "#f59e0b",
      "seo": {...}
    },
    "articles": [...],
    "pagination": {...}
  }
}
```

---

### POST /api/categories

Create category. **Requires Auth.**

```json
{
  "slug": "new-category",
  "label": "New Category",
  "shortDescription": "...",
  "color": "#10b981"
}
```

---

### PUT /api/categories/:id

Update category. **Requires Auth.**

---

### DELETE /api/categories/:id

Soft delete category. **Requires Auth.**

> **Note:** Cannot delete category with articles. Reassign articles first.

---

## Authors

### GET /api/authors

List authors.

**Query Parameters:**

| Param      | Type    | Default | Description       |
| ---------- | ------- | ------- | ----------------- |
| `online`   | boolean | `true`  | Visibility filter |
| `featured` | boolean | -       | Featured only     |
| `role`     | string  | -       | Filter by role    |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "jane-doe",
      "name": "Jane Doe",
      "jobTitle": "Senior Editor",
      "shortDescription": "...",
      "avatarUrl": "...",
      "postCount": 42,
      "route": "/author/jane-doe"
    }
  ]
}
```

---

### GET /api/authors/:slug

Get author with articles.

---

### POST /api/authors

Create author. **Requires Auth.**

```json
{
  "slug": "new-author",
  "name": "New Author",
  "email": "author@example.com",
  "jobTitle": "Guest Contributor"
}
```

---

### PUT /api/authors/:id

Update author. **Requires Auth.**

---

### DELETE /api/authors/:id

Soft delete author. **Requires Auth.**

> **Note:** Cannot delete author with articles.

---

## Tags

### GET /api/tags

List all tags.

**Query Parameters:**

| Param   | Type   | Default | Description            |
| ------- | ------ | ------- | ---------------------- |
| `group` | string | -       | Filter by filter group |
| `sort`  | string | `label` | `label`, `postCount`   |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "vegan",
      "label": "Vegan",
      "description": "...",
      "filterGroups": ["Diet"],
      "postCount": 28,
      "color": "#10b981",
      "route": "/tags/vegan"
    }
  ]
}
```

---

### GET /api/tags/:slug

Get tag with articles.

---

### POST /api/tags

Create tag. **Requires Auth.**

```json
{
  "slug": "new-tag",
  "label": "New Tag",
  "filterGroupsJson": ["Diet", "Lifestyle"],
  "styleJson": {
    "color": "#10b981",
    "variant": "solid",
    "svg_code": "<svg viewBox='0 0 24 24'><path d='...'/></svg>"
  }
}
```

---

## Media

### GET /api/media

List media assets.

**Query Parameters:**

| Param    | Type   | Default | Description         |
| -------- | ------ | ------- | ------------------- |
| `page`   | number | 1       | Page                |
| `limit`  | number | 24      | Per page            |
| `search` | string | -       | Search name/alt     |
| `mime`   | string | -       | Filter by mime type |

---

### GET /api/media/:id

Get media details.

---

### POST /api/media/upload

Upload new media. **Requires Auth.**

**Request:** `multipart/form-data`

| Field     | Type   | Description  |
| --------- | ------ | ------------ |
| `file`    | File   | Image file   |
| `name`    | string | Display name |
| `altText` | string | Alt text     |

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 123,
    "name": "recipe-photo.webp",
    "variants": {
      "xs": { "url": "...", "width": 360 },
      "sm": { "url": "...", "width": 720 },
      "md": { "url": "...", "width": 1200 },
      "lg": { "url": "...", "width": 2048 }
    }
  }
}
```

> **Note:** Upload/client pipeline payloads must use `size_bytes` in serialized JSON. TypeScript implementation variables use `sizeBytes` internally.

---

### PUT /api/media/:id

Update media metadata. **Requires Auth.**

```json
{
  "name": "Updated Name",
  "altText": "Updated alt text",
  "caption": "Photo caption"
}
```

---

### DELETE /api/media/:id

Delete media and R2 files. **Requires Auth.**

> **Warning:** This permanently deletes files from R2 storage.

---

## Search

### GET /api/search

Full-text search across articles.

**Query Parameters:**

| Param   | Type   | Required | Description    |
| ------- | ------ | -------- | -------------- |
| `q`     | string | ✅       | Search query   |
| `type`  | string | -        | Filter by type |
| `limit` | number | 20       | Max results    |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 42,
      "slug": "chocolate-brownies",
      "type": "recipe",
      "headline": "Best Chocolate Brownies",
      "shortDescription": "...",
      "imageUrl": "...",
      "route": "/recipes/chocolate-brownies",
      "relevance": 0.95
    }
  ]
}
```

---

## Site Settings

### GET /api/settings

Get all site settings. **Requires Auth.**

---

### GET /api/settings/:key

Get specific setting.

**Response:**

```json
{
  "success": true,
  "data": {
    "key": "site_info",
    "value": {
      "name": "SaaS Blog",
      "tagline": "Delicious recipes..."
    }
  }
}
```

---

### PUT /api/settings/:key

Update setting. **Requires Auth.**

```json
{
  "value": { "name": "New Site Name", "tagline": "..." }
}
```

---

## Pinterest

### GET /api/pinterest/boards

List Pinterest boards.

---

### GET /api/pinterest/pins

List pins with filters.

**Query Parameters:**

| Param       | Type   | Description                                   |
| ----------- | ------ | --------------------------------------------- |
| `boardId`   | number | Filter by board                               |
| `status`    | string | `draft`, `scheduled`, `exported`, `published` |
| `articleId` | number | Filter by article                             |

---

### POST /api/pinterest/pins

Create pin. **Requires Auth.**

```json
{
  "articleId": 42,
  "boardId": 1,
  "imageUrl": "https://...",
  "title": "Pin Title",
  "description": "Pin description..."
}
```

---

### POST /api/pinterest/export

Export pins to CSV. **Requires Auth.**

```json
{
  "pinIds": [1, 2, 3, 4, 5]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "csvUrl": "https://...",
    "exportedCount": 5,
    "batchId": "2025-12-19-pm"
  }
}
```

---

## Templates

### GET /api/templates

List pin templates.

**Query Parameters:**

| Param       | Type    | Default | Description      |
| ----------- | ------- | ------- | ---------------- |
| `is_active` | boolean | `true`  | Filter by active |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "recipe-pin-1000x1500",
      "name": "Recipe Pin - 2:3",
      "width": 1000,
      "height": 1500,
      "thumbnailUrl": "https://...",
      "isActive": true
    }
  ]
}
```

---

### GET /api/templates/:slug

Get template by slug with full element data.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "recipe-pin-1000x1500",
    "name": "Recipe Pin - 2:3",
    "width": 1000,
    "height": 1500,
    "backgroundColor": "#ffffff",
    "thumbnailUrl": "https://...",
    "elementsJson": [
      {
        "id": "text-1",
        "type": "text",
        "x": 50,
        "y": 100,
        "text": "{{article.title}}",
        "fontSize": 48,
        "fontFamily": "Inter",
        "fill": "#000000"
      },
      {
        "id": "image-1",
        "type": "imageSlot",
        "x": 0,
        "y": 0,
        "width": 1000,
        "height": 700,
        "binding": "{{article.image}}"
      }
    ]
  }
}
```

---

### POST /api/templates

Create template. **Requires Auth.**

```json
{
  "name": "New Template",
  "slug": "new-template",
  "width": 1000,
  "height": 1500,
  "backgroundColor": "#ffffff",
  "elementsJson": [...]
}
```

---

### PUT /api/templates/:slug

Update template. **Requires Auth.**

```json
{
  "name": "Updated Name",
  "elementsJson": [...]
}
```

---

### DELETE /api/templates/:slug

Delete template. **Requires Auth.**

---

## Equipment

### GET /api/equipment

List kitchen equipment catalog entries with optional affiliate links.

**Query Parameters:**

| Param      | Type    | Default | Description       |
| ---------- | ------- | ------- | ----------------- |
| `page`     | number  | 1       | Page number       |
| `limit`    | number  | 24      | Per page          |
| `category` | string  | -       | Filter by category|
| `isActive` | boolean | `true`  | Active equipment filter |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Chef's Knife 8\"",
      "slug": "chefs-knife-8",
      "description": "Professional grade chef's knife",
      "affiliateUrl": "https://amazon.com/...",
      "affiliateProvider": "Amazon",
      "affiliateNote": "Affiliate link",
      "imageUrl": "https://...",
      "category": "tools",
      "isActive": true,
      "route": "/equipment/chefs-knife-8"
    }
  ],
  "pagination": {...}
}
```

---

### POST /api/equipment

Create equipment entry. **Requires Auth.**

```json
{
  "name": "New Equipment",
  "slug": "new-equipment",
  "description": "Description...",
  "affiliateUrl": "https://...",
  "affiliateProvider": "Amazon",
  "affiliateNote": "Affiliate link",
  "category": "tools",
  "isActive": true
}
```

---

### PUT /api/equipment/:id

Update equipment. **Requires Auth.**

---

### DELETE /api/equipment/:id

Soft delete equipment. **Requires Auth.**

---

## Menus

### GET /api/menus

List navigation menus.

**Query Parameters:**

| Param    | Type   | Default | Description              |
| -------- | ------ | ------- | ------------------------ |
| `location` | string | -     | Filter by menu location  |

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Main Navigation",
      "location": "header",
      "items": [
        {
          "label": "Home",
          "url": "/",
          "target": "_self"
        },
        {
          "label": "Recipes",
          "url": "/recipes",
          "target": "_self"
        }
      ]
    }
  ]
}
```

---

### POST /api/menus

Create menu. **Requires Auth.**

```json
{
  "name": "Footer Menu",
  "location": "footer",
  "items": [
    { "label": "About", "url": "/about" },
    { "label": "Contact", "url": "/contact" }
  ]
}
```

---

### PUT /api/menus/:id

Update menu. **Requires Auth.**

---

### DELETE /api/menus/:id

Delete menu. **Requires Auth.**

---

## Authentication

### POST /api/auth/login

Authenticate admin user.

**Request Body:**

```json
{
  "email": "admin@example.com",
  "password": "securepassword"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "admin@example.com",
      "name": "Admin User"
    }
  }
}
```

---

### POST /api/auth/verify

Verify JWT token.

**Headers:**

```http
Authorization: Bearer <token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "id": 1,
      "email": "admin@example.com"
    }
  }
}
```

---

## AI Content Generation

### POST /api/ai/generate

Generate content using AI. **Requires Auth.**

**Request Body:**

```json
{
  "provider": "openai",
  "model": "gpt-4",
  "prompt": "Write a recipe introduction for chocolate brownies",
  "context": {
    "articleType": "recipe",
    "topic": "chocolate brownies"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "content": "These decadent chocolate brownies...",
    "usage": {
      "promptTokens": 45,
      "completionTokens": 120
    }
  }
}
```

**Supported Providers:**
- `openai` - OpenAI (GPT-4, GPT-3.5-turbo)
- `anthropic` - Anthropic (Claude 3, Claude 3.5)
- `google` - Google Gemini (gemini-pro, gemini-1.5-pro)

---

## Redirects

### GET /api/redirects

List all redirects. **Requires Auth.**

---

### POST /api/redirects

Create redirect. **Requires Auth.**

```json
{
  "fromPath": "/old-recipe",
  "toPath": "/recipes/new-recipe",
  "statusCode": 301
}
```

---

### DELETE /api/redirects/:id

Delete redirect. **Requires Auth.**

---

## Webhooks (Internal)

### POST /api/webhooks/rebuild-cache

Trigger cache rebuild for article. **Internal use only.**

```json
{
  "articleId": 42,
  "caches": ["tags", "category", "author", "toc", "faqs", "jsonld"]
}
```

---

## Rate Limits

| Endpoint Type | Limit   |
| ------------- | ------- |
| Public GET    | 100/min |
| Auth GET      | 300/min |
| Auth POST/PUT | 60/min  |
| Upload        | 20/min  |
| Search        | 30/min  |
