# Freecipies Blog - Frontend Implementation Guide

## Overview

This guide covers the implementation of the Astro.js frontend for the Freecipies recipe blog platform. It includes component architecture, page structure, styling approach, and best practices for building a performant, SEO-friendly recipe blog.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Component Architecture](#component-architecture)
3. [Page Structure](#page-structure)
4. [Styling Strategy](#styling-strategy)
5. [Data Fetching](#data-fetching)
6. [SEO Optimization](#seo-optimization)
7. [Performance Optimization](#performance-optimization)
8. [Development Workflow](#development-workflow)

---

## Project Structure

```
src/
├── components/              # Reusable Astro components
│   ├── BaseHead.astro      # SEO meta tags component
│   ├── Header.astro        # Navigation header
│   ├── Footer.astro        # Site footer
│   ├── RecipeCard.astro    # Recipe card display
│   ├── CategoryCard.astro  # Category card display
│   ├── FormattedDate.astro # Date formatting utility
│   ├── HeaderLink.astro    # Navigation link component
│   └── PinterestPins.astro # Pinterest integration
├── layouts/                # Page layouts
│   ├── Layout.astro        # Main layout wrapper
│   ├── RecipeLayout.astro  # Recipe detail page layout
│   └── BlogPost.astro      # Blog post layout
├── pages/                  # Routes and pages
│   ├── index.astro         # Home page
│   ├── about.astro         # About page
│   ├── blog/
│   │   ├── index.astro     # Blog listing
│   │   └── [...slug].astro # Dynamic blog post pages
│   ├── api/                # API endpoints
│   │   ├── articles.ts
│   │   ├── categories.ts
│   │   ├── authors.ts
│   │   └── tags.ts
│   └── rss/                # RSS feeds
├── lib/                    # Utility functions
│   ├── api.ts             # API client functions
│   ├── db.ts              # Database operations
│   ├── utils.ts           # Helper functions
│   ├── error-handler.ts   # Error handling
│   ├── logging.ts         # Request logging
│   ├── rate-limiter.ts    # Rate limiting
│   ├── cache.ts           # Caching strategy
│   └── auth.ts            # Authentication
├── types/                  # TypeScript definitions
│   └── index.ts           # All type definitions
├── styles/                 # Global styles
│   └── global.css         # TailwindCSS imports
└── assets/                 # Static images
    └── blog-placeholder-*.jpg
```

---

## Component Architecture

### Base Components

#### [`BaseHead.astro`](src/components/BaseHead.astro)
Handles all SEO meta tags and head content.

```astro
---
interface Props {
  title: string;
  description: string;
  image?: string;
  canonicalURL?: string;
}

const { title, description, image, canonicalURL } = Astro.props;
---

<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<meta name="description" content={description} />
<title>{title}</title>
{canonicalURL && <link rel="canonical" href={canonicalURL} />}
```

#### [`Header.astro`](src/components/Header.astro)
Main navigation component with responsive design.

**Features:**
- Responsive navigation menu
- Active link highlighting
- Mobile hamburger menu
- Logo/branding

#### [`Footer.astro`](src/components/Footer.astro)
Site footer with links and information.

**Features:**
- Social media links
- Quick navigation
- Copyright information
- Newsletter signup (optional)

### Content Components

#### [`RecipeCard.astro`](src/components/RecipeCard.astro)
Displays recipe summary in card format.

**Props:**
```typescript
interface Props {
  recipe: Article;
  featured?: boolean;
}
```

**Features:**
- Recipe image with lazy loading
- Title and description
- Prep/cook time badges
- Category and author info
- Rating display

#### [`CategoryCard.astro`](src/components/CategoryCard.astro)
Displays category information in card format.

**Props:**
```typescript
interface Props {
  category: Category;
}
```

**Features:**
- Category image
- Title and description
- Recipe count
- Link to category page

### Utility Components

#### [`FormattedDate.astro`](src/components/FormattedDate.astro)
Formats and displays dates consistently.

```astro
---
interface Props {
  date: Date | string;
  format?: 'short' | 'long';
}
---
```

#### [`HeaderLink.astro`](src/components/HeaderLink.astro)
Navigation link with active state detection.

---

## Page Structure

### Home Page ([`index.astro`](src/pages/index.astro))

**Purpose:** Landing page showcasing featured recipes and categories

**Structure:**
```astro
---
import Layout from '../layouts/Layout.astro';
import RecipeCard from '../components/RecipeCard.astro';
import CategoryCard from '../components/CategoryCard.astro';

// Fetch featured recipes and categories
const featuredRecipes = await fetch('/api/articles?limit=6').then(r => r.json());
const categories = await fetch('/api/categories').then(r => r.json());
---

<Layout title="Freecipies - Recipe Blog">
  <!-- Hero section -->
  <!-- Featured recipes grid -->
  <!-- Categories showcase -->
  <!-- Newsletter signup -->
</Layout>
```

**Key Sections:**
1. Hero banner with call-to-action
2. Featured recipes grid (6 items)
3. Category showcase
4. Latest blog posts
5. Newsletter signup form

### Blog Listing ([`blog/index.astro`](src/pages/blog/index.astro))

**Purpose:** Display all blog posts with pagination

**Features:**
- Paginated list of articles
- Filter by category/tag
- Search functionality
- Sort options (newest, popular, trending)

### Dynamic Blog Post ([`blog/[...slug].astro`](src/pages/blog/[...slug].astro))

**Purpose:** Individual blog post/recipe detail page

**Structure:**
```astro
---
import { getCollection } from 'astro:content';
import BlogPost from '../../layouts/BlogPost.astro';

export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post }
  }));
}

const { post } = Astro.props;
const { Content } = await post.render();
---

<BlogPost frontmatter={post.data}>
  <Content />
</BlogPost>
```

### About Page ([`about.astro`](src/pages/about.astro))

**Purpose:** Information about the blog and authors

**Sections:**
- Blog mission/description
- Author profiles
- Contact information
- Social media links

---

## Styling Strategy

### TailwindCSS Configuration

**Approach:** Utility-first CSS with TailwindCSS 4.x

**Key Features:**
- Responsive design (mobile-first)
- Dark mode support
- Custom color palette
- Typography system

### Global Styles ([`global.css`](src/styles/global.css))

```css
@import "tailwindcss";

/* Custom color variables */
:root {
  --color-primary: #f97316;
  --color-secondary: #0ea5e9;
  --color-accent: #ec4899;
}

/* Typography */
body {
  @apply font-sans text-gray-900 dark:text-gray-100;
}

h1 { @apply text-4xl font-bold mb-4; }
h2 { @apply text-3xl font-bold mb-3; }
h3 { @apply text-2xl font-bold mb-2; }

/* Component styles */
.recipe-card {
  @apply bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow;
}
```

### Responsive Design

**Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

**Example:**
```astro
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- Cards -->
</div>
```

---

## Data Fetching

### Client-Side Fetching

Use the API client functions from [`lib/api.ts`](src/lib/api.ts):

```typescript
import { fetchArticles, fetchCategories } from '../lib/api';

// In Astro components (server-side)
const articles = await fetchArticles({ limit: 12, page: 1 });
const categories = await fetchCategories();
```

### Server-Side Rendering

Astro components run on the server by default:

```astro
---
// This runs on the server
const data = await fetch('/api/articles').then(r => r.json());
---

<div>
  {data.map(item => <RecipeCard recipe={item} />)}
</div>
```

### Caching Strategy

**HTTP Caching Headers:**
```typescript
// API responses include cache headers
'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
```

**Browser Caching:**
- Static assets: 1 year
- API responses: 1 hour
- HTML pages: 5 minutes

---

## SEO Optimization

### Meta Tags

Use [`BaseHead.astro`](src/components/BaseHead.astro) for all pages:

```astro
---
import BaseHead from '../components/BaseHead.astro';

const title = 'Delicious Pasta Recipes';
const description = 'Explore our collection of authentic Italian pasta recipes';
const image = '/images/pasta-hero.jpg';
---

<BaseHead 
  title={title}
  description={description}
  image={image}
  canonicalURL={Astro.url.href}
/>
```

### Structured Data (JSON-LD)

Add structured data for recipes:

```astro
<script type="application/ld+json" set:html={JSON.stringify({
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": recipe.label,
  "description": recipe.shortDescription,
  "image": recipe.image?.url,
  "prepTime": recipe.recipeJson?.prepTime,
  "cookTime": recipe.recipeJson?.cookTime,
  "recipeIngredient": recipe.recipeJson?.ingredients,
  "recipeInstructions": recipe.recipeJson?.instructions
})} />
```

### Sitemap

Auto-generated by `@astrojs/sitemap`:

```javascript
// astro.config.mjs
integrations: [sitemap()]
```

### Open Graph Tags

```astro
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:image" content={image} />
<meta property="og:type" content="website" />
```

---

## Performance Optimization

### Image Optimization

**Lazy Loading:**
```astro
<img 
  src={recipe.image.url}
  alt={recipe.image.alt}
  loading="lazy"
  decoding="async"
/>
```

**Responsive Images:**
```astro
<img 
  src={recipe.image.url}
  srcset={`${recipe.image.url}?w=400 400w, ${recipe.image.url}?w=800 800w`}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
  alt={recipe.image.alt}
/>
```

### Code Splitting

Astro automatically code-splits components:

```astro
---
// Only loaded when needed
import HeavyComponent from '../components/Heavy.astro';
---
```

### Critical CSS

Inline critical CSS for above-the-fold content:

```astro
<style is:global>
  /* Critical styles */
</style>

<style>
  /* Component styles */
</style>
```

### Web Vitals Targets

- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

---

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Environment Variables

Create `.env.local`:

```env
PUBLIC_API_URL=http://localhost:4321/api
PUBLIC_SITE_URL=http://localhost:4321
```

### TypeScript

Strict mode enabled in `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "strictNullChecks": true
  }
}
```

### Code Quality

**Linting:**
```bash
pnpm lint
```

**Type Checking:**
```bash
pnpm type-check
```

---

## Best Practices

### Component Guidelines

1. **Keep components small and focused**
   - One responsibility per component
   - Reusable across pages

2. **Use TypeScript interfaces**
   ```astro
   ---
   interface Props {
     title: string;
     description: string;
   }
   ---
   ```

3. **Optimize images**
   - Use WebP format
   - Provide fallbacks
   - Set explicit dimensions

4. **Handle errors gracefully**
   ```astro
   ---
   try {
     const data = await fetch('/api/data');
   } catch (error) {
     console.error('Failed to fetch:', error);
   }
   ---
   ```

### Performance Best Practices

1. **Minimize JavaScript**
   - Use Astro's server-side rendering
   - Only hydrate interactive components

2. **Optimize fonts**
   - Self-host fonts
   - Use `font-display: swap`

3. **Lazy load non-critical content**
   - Images below the fold
   - Heavy components

4. **Use CDN for static assets**
   - Cloudflare CDN
   - Long cache headers

---

## Deployment

### Cloudflare Pages

```bash
# Build
pnpm build

# Deploy
wrangler pages deploy dist
```

### Environment Configuration

**Production:**
```env
PUBLIC_API_URL=https://freecipies.com/api
PUBLIC_SITE_URL=https://freecipies.com
```

**Staging:**
```env
PUBLIC_API_URL=https://staging.freecipies.com/api
PUBLIC_SITE_URL=https://staging.freecipies.com
```

---

## Troubleshooting

### Common Issues

**Issue:** Images not loading
- Check image paths are relative to `public/`
- Verify image format is supported
- Check image dimensions

**Issue:** Slow page loads
- Check Network tab in DevTools
- Optimize images
- Enable caching headers

**Issue:** TypeScript errors
- Run `pnpm type-check`
- Check type definitions in `src/types/`
- Verify imports are correct

---

## Resources

- [Astro Documentation](https://docs.astro.build)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Schema.org Recipe](https://schema.org/Recipe)

