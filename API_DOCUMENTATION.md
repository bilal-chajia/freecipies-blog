# Freecipies Blog Platform - API Documentation

## Overview

Comprehensive API documentation for the Freecipies Blog Platform.
*   **Base URL**: `/api`
*   **Format**: JSON
*   **Authentication**: Bearer Token (JWT) required for CUD operations (Create, Update, Delete).

---

## Constants & Enums

### Image Sizes
Images are stored in R2 and served with flat URL strings.
*   **Article Cover**: `1200x675` (16:9)
*   **Author Avatar**: `300x300` (1:1)
*   **Category Cover**: `800x600` (4:3)

### HTTP Status Codes
*   `200 OK`: Success
*   `201 Created`: Resource created
*   `400 Bad Request`: Validation error
*   `401 Unauthorized`: Missing token
*   `403 Forbidden`: Insufficient permissions
*   `404 Not Found`: Resource unknown
*   `500 Internal Error`: Server/Database failure

---

## Endpoints

### 1. Articles & Recipes
Primary content endpoints. Differentiated by `type` ('article' vs 'recipe').

#### `GET /api/articles`
Search and list articles.
*   **Params**: `limit`, `page`, `category` (slug), `author` (slug), `search` (text), `type`.

#### `GET /api/articles/:slug`
Retrieve full details (content, JSON-LD data) for a single article.

**Response (Recipe)**:
```json
{
  "success": true,
  "data": {
    "id": "uuid-string",
    "slug": "fluffy-pancakes",
    "label": "Fluffy Pancakes",
    "headline": "Perfect Fluffy Pancakes Recipe",
    "content": "<p>HTML Content...</p>",
    "type": "recipe",
    
    // Flat Image Schema
    "imageUrl": "https://cdn.recipes-saas.com/images/pancakes.webp",
    "imageWidth": 1200,
    "imageHeight": 675,
    "imageAlt": "Stack of pancakes",
    
    // Structured Data
    "recipeJson": {
      "prepTime": "PT15M",
      "cookTime": "PT20M",
      "yield": "4 servings",
      "ingredients": ["1 cup flour", "1 egg"]
    },
    "faqsJson": [
      { "question": "Can I freeze?", "answer": "Yes." }
    ],
    
    // Metadata
    "viewCount": 1542,
    "isOnline": true,
    "publishedAt": "2024-03-20T10:00:00Z"
  }
}
```

#### `POST /api/articles` (Admin)
Create a new drafted article.
*   **Body**: JSON object matching schema.

#### `PUT /api/articles/:slug` (Admin)
Update an existing article.

#### `DELETE /api/articles/:slug` (Admin)
Permanently remove an article.

---

### 2. Categories

#### `GET /api/categories`
List all categories with metadata.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "slug": "breakfast",
      "label": "Breakfast",
      "color": "#ff9900", // Hex color for UI badges
      "imageUrl": "https://cdn.recipes-saas.com/images/cat-breakfast.webp",
      "imageWidth": 800,
      "imageHeight": 600,
      "totalArticles": 45
    }
  ]
}
```

#### `GET /api/categories/:slug`
Get single category details.

---

### 3. Authors

#### `GET /api/authors`
List all authors.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "slug": "chef-john",
      "name": "Chef John",
      "job": "Head Chef",
      "imageUrl": "https://cdn.recipes-saas.com/images/john.webp"
    }
  ]
}
```

---

### 4. Admin & Utilities

#### `POST /api/media` (Admin)
Direct upload endpoint for Cloudflare R2.
*   **Content-Type**: `multipart/form-data`
*   **Response**: `{ "url": "https://...", "r2Key": "..." }`

#### `GET /api/stats/popular`
Returns trending articles based on view count.
*   **Usage**: Used for client-side "Popular Recipes" widgets.

#### `GET /api/pins` (Admin)
Manage Pinterest marketing assets linked to articles.

---

## Authentication

**Header**:
`Authorization: Bearer <JWT_TOKEN>`

Tokens are issued via the `/admin/login` flow (Cloudflare Access or custom auth service) and verified by middleware on all write operations.

## Rate Limiting
*   **Public**: 100 req/min/IP
*   **Admin**: Unlimited
