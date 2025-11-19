# Freecipies Blog Platform - Architecture Documentation

## Executive Summary

This document outlines the comprehensive architecture for the Freecipies blog platform, built using **Astro.js** for the frontend and **Cloudflare services** for deployment, performance optimization, and security. The platform supports recipe management with a JSON-based content system and includes an admin dashboard for content management.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Data Storage Strategy](#data-storage-strategy)
6. [API Design](#api-design)
7. [Security Architecture](#security-architecture)
8. [Performance Optimization](#performance-optimization)
9. [Deployment Strategy](#deployment-strategy)
10. [Admin Dashboard](#admin-dashboard)
11. [Scalability Considerations](#scalability-considerations)

---

## 1. System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Users/Browsers                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare CDN/Edge                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │     WAF      │  │  DDoS Prot.  │  │ Rate Limiting│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────────┬────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
┌───────────────────────┐    ┌───────────────────────┐
│  Cloudflare Pages     │    │  Cloudflare Workers   │
│  (Static/SSR)         │    │  (API Endpoints)      │
│                       │    │                       │
│  ┌─────────────────┐ │    │  ┌─────────────────┐  │
│  │  Astro.js App   │ │    │  │  API Routes     │  │
│  │  - Components   │ │    │  │  - /api/recipes │  │
│  │  - Layouts      │ │    │  │  - /api/cats    │  │
│  │  - Pages        │ │    │  │  - /api/authors │  │
│  └─────────────────┘ │    │  └─────────────────┘  │
└───────────────────────┘    └──────────┬────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────┐
                        │  Cloudflare Workers KV    │
                        │  ┌─────────────────────┐  │
                        │  │  RECIPES Namespace  │  │
                        │  │  CATEGORIES NS      │  │
                        │  │  AUTHORS NS         │  │
                        │  │  TAGS NS            │  │
                        │  └─────────────────────┘  │
                        └───────────────────────────┘
                                        │
                                        ▼
                        ┌───────────────────────────┐
                        │  Cloudflare D1 (Optional) │
                        │  ┌─────────────────────┐  │
                        │  │  Relational Data    │  │
                        │  │  - Recipes Table    │  │
                        │  │  - Categories Table │  │
                        │  │  - Authors Table    │  │
                        │  └─────────────────────┘  │
                        └───────────────────────────┘
```

### Architecture Principles

1. **Separation of Concerns**: Clear distinction between frontend (Astro.js) and backend (Cloudflare Workers)
2. **Edge-First**: Leverage Cloudflare's global edge network for low latency
3. **Serverless**: No server management, automatic scaling
4. **Security by Design**: Multiple layers of security (WAF, DDoS, authentication)
5. **Performance Optimized**: CDN caching, static generation, edge computing
6. **Modular Design**: Independent, reusable components and services

---

## 2. Technology Stack

### Frontend
- **Framework**: Astro.js 5.x
  - Server-side rendering (SSR)
  - Static site generation (SSG)
  - Partial hydration for interactivity
- **Styling**: TailwindCSS 4.x
  - Utility-first CSS
  - Responsive design
  - Dark mode support
- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite (bundled with Astro)

### Backend
- **Runtime**: Cloudflare Workers
  - V8 isolates (faster than containers)
  - Edge computing
  - Serverless functions
- **API**: RESTful endpoints
- **Language**: TypeScript

### Data Storage
- **Primary**: Cloudflare Workers KV
  - Key-value store
  - Global replication
  - Low latency reads
- **Optional**: Cloudflare D1
  - SQLite-based relational database
  - SQL queries
  - Serverless

### Deployment & Infrastructure
- **Hosting**: Cloudflare Pages
- **CDN**: Cloudflare CDN
- **Security**: Cloudflare WAF, DDoS Protection
- **CI/CD**: Git-based automatic deployments

---

## 3. Frontend Architecture

### Astro.js Configuration

The frontend uses Astro.js with the following configuration:

```javascript
// astro.config.mjs
export default defineConfig({
  site: 'https://freecipies.com', // Your production URL
  integrations: [sitemap()],
  adapter: cloudflare({
    mode: 'directory',
    routes: {
      extend: {
        include: [{ pattern: '/api/*' }],
      }
    }
  }),
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
  },
});
```

### Component Structure

```
src/components/
├── RecipeCard.astro       # Recipe display card
├── CategoryCard.astro     # Category display card
├── Header.astro           # Site header with navigation
├── Footer.astro           # Site footer
├── BaseHead.astro         # SEO meta tags
└── FormattedDate.astro    # Date formatting utility
```

### Layout System

```
src/layouts/
├── Layout.astro           # Main layout wrapper
├── RecipeLayout.astro     # Recipe detail page layout
└── BlogPost.astro         # Blog post layout
```

### Routing Strategy

- **Static Routes**: Pre-rendered at build time
  - `/` - Home page
  - `/about` - About page
  - `/categories` - Categories listing

- **Dynamic Routes**: Server-rendered on demand
  - `/recipes/[slug]` - Recipe detail pages
  - `/categories/[slug]` - Category pages
  - `/authors/[slug]` - Author pages

- **API Routes**: Cloudflare Workers endpoints
  - `/api/recipes` - Recipe data
  - `/api/categories` - Category data
  - `/api/authors` - Author data

### SEO Optimization

- **Server-Side Rendering**: Dynamic content is SEO-friendly
- **Meta Tags**: Comprehensive meta tags for each page
- **Sitemap**: Auto-generated XML sitemap
- **Structured Data**: JSON-LD for rich snippets
- **Open Graph**: Social media sharing optimization

---

## 4. Backend Architecture

### Cloudflare Workers API

The backend consists of serverless edge functions deployed as Cloudflare Workers:

```
src/pages/api/
├── recipes.ts       # Recipe CRUD operations
├── categories.ts    # Category operations
├── authors.ts       # Author operations
└── tags.ts          # Tag operations
```

### API Endpoint Structure

Each API endpoint follows this pattern:

```typescript
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  
  try {
    // Fetch from KV or D1
    const data = await fetchFromKV(slug);
    
    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};
```

### Request Flow

1. **Request Received**: User requests a page or API endpoint
2. **Edge Routing**: Cloudflare routes to nearest edge location
3. **Worker Execution**: Cloudflare Worker processes the request
4. **Data Fetch**: Worker retrieves data from KV or D1
5. **Response**: JSON or HTML returned to client
6. **Caching**: Response cached at edge for subsequent requests

---

## 5. Data Storage Strategy

### Cloudflare Workers KV

**Use Cases:**
- Recipe data storage
- Category and tag metadata
- Author profiles
- Static content caching

**Structure:**
```
Key Format: {type}:{slug}
Examples:
- recipe:spaghetti-puttanesca
- category:breakfast-and-brunch
- author:katt-lawrence
```

**Advantages:**
- Global replication
- Low latency reads (<1ms)
- Automatic scaling
- No database management

**Limitations:**
- Eventually consistent
- Limited query capabilities
- Best for read-heavy workloads

### Cloudflare D1 (Optional)

**Use Cases:**
- Complex queries
- Relational data
- Analytics and reporting
- User-generated content

**Schema Example:**
```sql
CREATE TABLE recipes (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  category_slug TEXT,
  author_slug TEXT,
  label TEXT,
  meta_title TEXT,
  meta_description TEXT,
  data JSON,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE INDEX idx_category ON recipes(category_slug);
CREATE INDEX idx_author ON recipes(author_slug);
```

### Data Migration from Google Sheets

The existing Google Apps Script code can be adapted to push data to Cloudflare:

```javascript
// Modified postRecipes() function
function postRecipes() {
  const payload = {
    // ... recipe data
  };
  
  const options = {
    method: 'PUT',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
    },
    payload: JSON.stringify(payload)
  };
  
  // Push to Cloudflare KV via API
  const response = UrlFetchApp.fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${NAMESPACE_ID}/values/${key}`,
    options
  );
}
```

---

## 6. API Design

### RESTful Endpoints

#### Recipes API

```
GET /api/recipes
  Query Parameters:
    - slug: string (optional)
    - category: string (optional)
    - author: string (optional)
    - tag: string (optional)
    - limit: number (default: 12)
    - page: number (default: 1)
  
  Response:
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

#### Categories API

```
GET /api/categories
  Query Parameters:
    - slug: string (optional)
  
  Response:
    {
      "success": true,
      "data": [...]
    }
```

#### Authors API

```
GET /api/authors
  Query Parameters:
    - slug: string (optional)
  
  Response:
    {
      "success": true,
      "data": [...]
    }
```

### Error Handling

All API endpoints follow a consistent error response format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Rate Limiting

Implemented via Cloudflare:
- **Anonymous Users**: 100 requests/minute
- **Authenticated Users**: 1000 requests/minute
- **Admin Users**: Unlimited

---

## 7. Security Architecture

### Multi-Layer Security

#### 1. Cloudflare WAF (Web Application Firewall)
- OWASP Top 10 protection
- Custom rule sets
- Bot detection
- IP reputation filtering

#### 2. DDoS Protection
- Automatic mitigation
- Traffic analysis
- Rate limiting
- Challenge pages for suspicious traffic

#### 3. Authentication & Authorization

**Admin Dashboard:**
```typescript
// Middleware for protected routes
export async function onRequest(context) {
  const token = context.request.headers.get('Authorization');
  
  if (!token || !await verifyToken(token)) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  return context.next();
}
```

**JWT Token Structure:**
```json
{
  "sub": "user_id",
  "role": "admin",
  "exp": 1234567890,
  "iat": 1234567890
}
```

#### 4. Content Security Policy (CSP)

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self' https://api.freecipies.com;
```

#### 5. HTTPS Enforcement
- Automatic HTTPS redirects
- HSTS headers
- TLS 1.3 minimum

---

## 8. Performance Optimization

### Caching Strategy

#### Edge Caching (Cloudflare CDN)
```
Static Assets (CSS, JS, Images):
  Cache-Control: public, max-age=31536000, immutable

API Responses:
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400

HTML Pages:
  Cache-Control: public, max-age=300, stale-while-revalidate=3600
```

#### Browser Caching
- Service Worker for offline support
- Local Storage for user preferences
- IndexedDB for offline recipe storage

### Image Optimization

1. **Cloudflare Images** (Optional):
   - Automatic format conversion (WebP, AVIF)
   - Responsive images
   - Lazy loading

2. **Sharp** (Build-time):
   - Image compression
   - Thumbnail generation
   - Format conversion

### Code Optimization

- **Code Splitting**: Automatic via Vite
- **Tree Shaking**: Remove unused code
- **Minification**: CSS and JavaScript
- **Critical CSS**: Inline above-the-fold styles

### Core Web Vitals Targets

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

---

## 9. Deployment Strategy

### Cloudflare Pages Deployment

#### Automatic Deployment (Git Integration)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy dist
```

#### Manual Deployment

```bash
# Build the project
pnpm build

# Deploy to Cloudflare Pages
wrangler pages deploy dist
```

### Environment Configuration

```bash
# Production
ENVIRONMENT=production
PUBLIC_API_URL=https://freecipies.com/api

# Staging
ENVIRONMENT=staging
PUBLIC_API_URL=https://staging.freecipies.com/api

# Development
ENVIRONMENT=development
PUBLIC_API_URL=http://localhost:4321/api
```

### Rollback Strategy

1. **Automatic Rollback**: On build failure
2. **Manual Rollback**: Via Cloudflare dashboard
3. **Version Control**: Git-based rollback

---

## 10. Admin Dashboard

### Architecture

```
/admin
├── /login          # Authentication
├── /dashboard      # Overview
├── /recipes        # Recipe management
│   ├── /new        # Create recipe
│   ├── /[id]/edit  # Edit recipe
│   └── /[id]       # View recipe
├── /categories     # Category management
├── /authors        # Author management
└── /settings       # Configuration
```

### Features

1. **Recipe Management**
   - WYSIWYG editor for content
   - Image upload with optimization
   - SEO metadata editor
   - Preview before publish
   - Schedule publishing

2. **Category & Tag Management**
   - Create/edit/delete categories
   - Assign recipes to categories
   - Tag management

3. **Author Management**
   - Author profiles
   - Social media links
   - Author bio and image

4. **Analytics Dashboard**
   - Page views
   - Popular recipes
   - User engagement metrics

### Authentication Flow

```
1. User visits /admin
2. Redirect to /admin/login
3. User enters credentials
4. Server validates with Cloudflare Access
5. JWT token issued
6. Token stored in httpOnly cookie
7. Subsequent requests include token
8. Middleware validates token
9. Access granted/denied
```

---

## 11. Scalability Considerations

### Horizontal Scaling

- **Cloudflare Workers**: Automatically scales to handle traffic
- **Edge Locations**: 300+ data centers globally
- **No Cold Starts**: V8 isolates start in <1ms

### Vertical Scaling

- **KV Storage**: Unlimited keys, 25 MB per value
- **D1 Database**: Up to 10 GB per database
- **Workers CPU**: 50ms CPU time per request (can be increased)

### Traffic Handling

- **Concurrent Requests**: Unlimited (auto-scaling)
- **Bandwidth**: Unlimited on Cloudflare
- **Request Rate**: 100,000+ requests/second

### Future Enhancements

1. **Search Functionality**
   - Algolia or Meilisearch integration
   - Full-text search
   - Faceted filtering

2. **User Features**
   - User accounts
   - Recipe favorites
   - Comments and ratings
   - Recipe collections

3. **Internationalization**
   - Multi-language support
   - Localized content
   - Regional recipes

4. **Mobile App**
   - React Native app
   - Offline recipe access
   - Shopping list feature

---

## Conclusion

This architecture provides a robust, scalable, and secure foundation for the Freecipies blog platform. By leveraging Astro.js for the frontend and Cloudflare services for the backend, the platform achieves:

- **Performance**: Sub-second page loads globally
- **Scalability**: Automatic scaling to handle traffic spikes
- **Security**: Multi-layer protection against threats
- **Developer Experience**: Modern tooling and TypeScript
- **Cost Efficiency**: Serverless pricing model

The modular design allows for easy maintenance and future enhancements, while the separation of concerns ensures that frontend and backend can evolve independently.
