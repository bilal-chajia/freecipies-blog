# API Documentation

> **Last Updated:** 2025-12-19  
> **Base URL:** `/api`  
> **Auth:** Bearer Token (Admin endpoints)

---

## 🤖 AI Agent Guidelines

> **IMPORTANT:** Follow these conventions when implementing or consuming APIs.

### Request/Response Format

- All requests/responses use **JSON**
- Use **camelCase** for JSON keys
- Dates are **ISO-8601** format (UTC)
- Empty arrays: `[]`, empty objects: `{}`

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
      "cover": {
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
      "prepTime": "PT15M",
      "cookTime": "PT25M",
      "difficulty": "Easy",
      "ingredients": [...],
      "instructions": [...]
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

---

### POST /api/articles

Create new article. **Requires Auth.**

**Request Body:**

```json
{
  "slug": "new-recipe",
  "type": "recipe",
  "headline": "New Recipe Title",
  "shortDescription": "A delicious new recipe...",
  "categoryId": 5,
  "authorId": 1,
  "imagesJson": { "cover": {...} },
  "contentJson": [...],
  "recipeJson": {...},
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
  "styleJson": { "color": "#10b981" }
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
      "name": "Freecipies",
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
