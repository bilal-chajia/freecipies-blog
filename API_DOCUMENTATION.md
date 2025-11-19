# Freecipies Blog Platform - API Documentation

## Overview

This document provides comprehensive API documentation for the Freecipies Blog Platform. All endpoints are RESTful and return JSON responses.

## Base URL

```
Production: https://freecipies.com/api
Staging: https://staging.freecipies.com/api
Development: http://localhost:4321/api
```

## Authentication

### API Key Authentication
Include your API key in the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

### JWT Token Authentication
For admin endpoints, include JWT token:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 100,
    "totalPages": 9
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `INTERNAL_ERROR` | 500 | Server error |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INVALID_REQUEST` | 400 | Malformed request |

## Rate Limiting

- **Anonymous Users**: 100 requests/minute
- **Authenticated Users**: 1000 requests/minute
- **Admin Users**: Unlimited

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1634567890
```

## Endpoints

### Articles

#### GET /api/articles
Retrieve a list of articles with optional filtering.

**Query Parameters:**
- `slug` (string, optional): Get single article by slug
- `category` (string, optional): Filter by category slug
- `author` (string, optional): Filter by author slug
- `tag` (string, optional): Filter by tag slug
- `limit` (number, optional): Items per page (default: 12, max: 100)
- `page` (number, optional): Page number (default: 1)

**Example Request:**
```bash
GET /api/articles?category=breakfast&limit=20&page=1
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "fluffy-pancakes",
      "type": "recipe",
      "label": "Fluffy Pancakes",
      "headline": "Perfect Fluffy Pancakes Recipe",
      "metaTitle": "Fluffy Pancakes - Easy Recipe",
      "metaDescription": "Learn how to make perfect fluffy pancakes...",
      "categorySlug": "breakfast",
      "authorSlug": "john-doe",
      "isOnline": true,
      "publishedAt": "2024-01-15T10:00:00Z",
      "viewCount": 1250,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid parameters
- `500`: Server error

---

### Categories

#### GET /api/categories
Retrieve all categories or a specific category.

**Query Parameters:**
- `slug` (string, optional): Get single category by slug

**Example Request:**
```bash
GET /api/categories
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "breakfast",
      "label": "Breakfast",
      "headline": "Breakfast Recipes",
      "metaTitle": "Breakfast Recipes",
      "metaDescription": "Delicious breakfast recipes...",
      "shortDescription": "Start your day right",
      "tldr": "Breakfast ideas",
      "collectionTitle": "Breakfast Collection",
      "numEntriesPerPage": 12,
      "sortOrder": 1,
      "isOnline": true,
      "isFavorite": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Authors

#### GET /api/authors
Retrieve all authors or a specific author.

**Query Parameters:**
- `slug` (string, optional): Get single author by slug

**Example Request:**
```bash
GET /api/authors?slug=john-doe
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "slug": "john-doe",
    "name": "John Doe",
    "email": "john@example.com",
    "job": "Chef",
    "metaTitle": "John Doe - Chef",
    "metaDescription": "Learn from Chef John Doe...",
    "shortDescription": "Professional chef with 10 years experience",
    "tldr": "Expert chef",
    "isOnline": true,
    "isFavorite": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

### Tags

#### GET /api/tags
Retrieve all tags.

**Example Request:**
```bash
GET /api/tags
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "slug": "vegetarian",
      "label": "Vegetarian",
      "headline": "Vegetarian Recipes",
      "metaTitle": "Vegetarian Recipes",
      "metaDescription": "Delicious vegetarian recipes...",
      "shortDescription": "Plant-based recipes",
      "tldr": "Vegetarian options",
      "collectionTitle": "Vegetarian Collection",
      "numEntriesPerPage": 12,
      "isOnline": true,
      "isFavorite": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

## Caching Strategy

### Cache Headers

All GET endpoints return appropriate cache headers:

```
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

**Cache Durations:**
- Single resource (article, category, author): 1 hour
- List endpoints: 30 minutes
- Search results: 15 minutes

### Cache Invalidation

Cache is automatically invalidated when:
- Content is updated via admin API
- Content is published/unpublished
- Scheduled content goes live

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `limit`: Items per page (1-100, default: 12)
- `page`: Page number (default: 1)

**Response:**
```json
{
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 100,
    "totalPages": 9
  }
}
```

---

## Filtering

### By Category
```bash
GET /api/articles?category=breakfast
```

### By Author
```bash
GET /api/articles?author=john-doe
```

### By Tag
```bash
GET /api/articles?tag=vegetarian
```

### Combined Filters
```bash
GET /api/articles?category=breakfast&author=john-doe&tag=vegetarian&limit=20&page=1
```

---

## Sorting

Articles are sorted by:
1. Published date (newest first)
2. View count (for trending)
3. Creation date (fallback)

---

## Common Errors

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid pagination parameters",
  "code": "VALIDATION_ERROR",
  "details": {
    "limit": "Must be between 1 and 100"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Article not found",
  "code": "NOT_FOUND"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to fetch articles",
  "code": "DATABASE_ERROR",
  "details": {
    "originalError": "Connection timeout"
  }
}
```

---

## Best Practices

### 1. Use Pagination
Always use pagination for list endpoints to improve performance:
```bash
GET /api/articles?limit=20&page=1
```

### 2. Cache Responses
Implement client-side caching to reduce API calls:
```javascript
const cache = new Map();
const cacheKey = `articles-${category}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

### 3. Handle Errors Gracefully
Always check the `success` field and handle errors:
```javascript
const response = await fetch('/api/articles');
const data = await response.json();
if (!data.success) {
  console.error(data.error);
}
```

### 4. Use Appropriate HTTP Methods
- `GET`: Retrieve data
- `POST`: Create data (admin only)
- `PUT`: Update data (admin only)
- `DELETE`: Delete data (admin only)

### 5. Monitor Rate Limits
Check rate limit headers and implement backoff:
```javascript
const remaining = response.headers.get('X-RateLimit-Remaining');
if (remaining < 10) {
  // Implement backoff strategy
}
```

---

## Webhooks (Future)

Webhooks will be available for:
- Article published
- Article updated
- Article deleted
- Comment posted
- Rating submitted

---

## SDK & Libraries

### JavaScript/TypeScript
```typescript
import { FreecipiesAPI } from '@freecipies/api-client';

const api = new FreecipiesAPI({
  baseUrl: 'https://freecipies.com/api',
  apiKey: 'YOUR_API_KEY'
});

const articles = await api.articles.list({ category: 'breakfast' });
```

---

## Support

For API support, contact: api-support@freecipies.com

---

## Changelog

### v1.0.0 (2024-01-15)
- Initial API release
- Articles, Categories, Authors, Tags endpoints
- Pagination and filtering support
- Rate limiting implemented
