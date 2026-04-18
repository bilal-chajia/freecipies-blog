# Freecipies - Recipe Blog SaaS Platform

A modern, full-featured recipe and food blog platform built with **Astro 6**, **React 19**, and deployed on **Cloudflare**. Features a public-facing recipe site with SEO-optimized pages and a comprehensive admin panel for content management.

---

## Features

### Public Site
- **Recipe Discovery** - Browse recipes with category, tag, and author filters
- **Fully Responsive** - Mobile-first design with responsive images (5 breakpoints)
- **SEO Optimized** - Dynamic sitemaps, JSON-LD structured data, RSS feeds
- **Rich Content** - Block-based article editor with images, videos, tip boxes, and more
- **Bookmarking** - Save favorite recipes locally
- **Lightning Fast** - SSR with zero-join rendering using cached denormalized fields
- **Web Stories** - Interactive story format for recipe browsing
- **Roundups** - Curated listicle format for recipe collections
- **About, Contact & FAQ Pages** - Static pages for site information
- **RSS Feeds** - Recipe and Pinterest-specific XML feeds
- **Smart Redirects** - Database-driven 301/302 redirect management with hit tracking

### Admin Panel
- **Block Editor** - Create articles, recipes, and roundups with @blocknote/react
- **Media Library** - Upload images with auto-generated responsive variants, focal point selection, and blur placeholders
- **Category Management** - Hierarchical taxonomy with color/icon configuration
- **Author Management** - Profile management with social links
- **Tag System** - Flexible labeling with filter groups
- **Equipment Management** - Kitchen tools with affiliate links
- **Redirect Management** - Create and manage 301/302 redirects with hit tracking
- **Pinterest Integration** - Board management, pin creation, and CSV export
- **Template Editor** - Canvas-based pin template designer with Konva
- **Analytics Dashboard** - Content metrics and popular content tracking with recharts
- **AI Content Generation** - Multi-provider AI support (OpenAI, Anthropic, Gemini)
- **Homepage Builder** - Customize hero sections and layouts
- **Branding Manager** - Logo, favicon, and site appearance configuration
- **Global Search** - Search across all content types with command palette (cmdk)
- **Dark Mode** - Full theme support with next-themes
- **Session Monitoring** - Auto-refresh JWT tokens and session management
- **Bulk Import** - AI model migration and bulk content import

---

## Tech Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **Astro** | 6.1.4 | SSR framework with islands architecture |
| **React** | 19.2.4 | Admin panel SPA |
| **TypeScript** | 6.0.2 | Full type safety |
| **TailwindCSS** | 4.2.2 | Utility-first styling |

### Cloudflare Infrastructure
| Service | Purpose |
|---------|---------|
| **D1** | SQLite database (primary data store) |
| **R2** | Object storage for images with responsive variants |
| **KV** | Session storage for authentication |
| **Workers** | Edge runtime via @astrojs/cloudflare |

### Key Libraries
- **Database**: Drizzle ORM
- **UI Components**: Radix UI + shadcn/ui (New York style)
- **State Management**: Zustand
- **Forms**: react-hook-form + zod
- **Block Editor**: @blocknote/react + @blocknote/mantine
- **Data Tables**: @tanstack/react-table
- **Canvas Editor**: Konva + react-konva
- **Charts**: recharts
- **Drag & Drop**: @dnd-kit
- **Animation**: motion (Framer Motion)
- **Authentication**: jose (JWT)
- **Image Processing**: @jsquash/webp, @jsquash/avif (WASM-based)
- **Image Cropping**: react-easy-crop
- **Icons**: lucide-react
- **Command Palette**: cmdk
- **Toast Notifications**: sonner
- **Drawer**: vaul
- **Code Editor**: @monaco-editor/react
- **Date Handling**: date-fns
- **Routing**: react-router-dom
- **Carousel**: embla-carousel-react
- **HTTP Client**: axios

---

## Getting Started

### Prerequisites
- **Node.js** 18+
- **pnpm** (required - do not use npm/yarn)
- **Cloudflare account** (for production deployment with D1/R2/KV)

### Installation

```bash
# Clone the repository
git clone https://github.com/bilal-chajia/freecipies-blog.git
cd freecipies-blog

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
```

### Development

```bash
# Start development server (with local D1/R2 bindings via Vite)
pnpm dev

# Production build
pnpm build

# Preview with full Cloudflare bindings (D1/R2 work)
pnpm preview
```

### Database Setup

```bash
# Run migrations
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

> **Note**: The database schema source of truth is `db/schema.sql`. Drizzle schemas in `src/modules/*/schema/` should be kept in sync.

### Other Commands

```bash
# Astro CLI passthrough
pnpm astro

# Deploy to Cloudflare
pnpm deploy

# CSV to D1 migration
pnpm migrate
```

---

## Project Structure

```
src/
├── modules/              # Domain-driven feature modules
│   ├── articles/         # Articles, recipes, roundups (polymorphic)
│   ├── categories/       # Hierarchical taxonomy
│   ├── authors/          # Content creator profiles
│   ├── tags/             # Flexible labeling system
│   ├── equipment/        # Kitchen tools with affiliate links
│   ├── media/            # Media library & R2 storage
│   ├── auth/             # JWT authentication
│   ├── settings/         # Site configuration
│   ├── menus/            # Navigation menus
│   ├── pinterest/        # Pinterest boards & pins
│   ├── templates/        # Canvas pin template editor
│   ├── redirects/        # 301/302 redirect management
│   ├── ai/               # Multi-provider AI integration
│   └── index.ts          # Barrel exports
├── shared/               # Cross-cutting concerns
│   ├── database/         # Drizzle client + schema
│   ├── types/            # Global TypeScript types
│   ├── utils/            # Shared utilities
│   └── constants/        # Shared constants
├── admin/                # React Admin SPA (/admin)
│   ├── AdminApp.jsx      # Entry point
│   ├── components/       # React UI components
│   │   ├── BlockEditor/  # BlockNote article editor
│   │   ├── ImageEditor/  # Image editing with focal points
│   │   ├── ImageUploader/# Multi-upload with variants
│   │   ├── pins/         # Pinterest pin management
│   │   ├── settings/     # Settings page components
│   │   ├── shared/       # Reusable admin components
│   │   └── ...           # Other feature components
│   ├── pages/            # Admin route pages
│   │   ├── dashboard/    # Analytics dashboard
│   │   ├── articles/     # Article editor
│   │   ├── recipes/      # Recipe editor
│   │   ├── roundups/     # Roundup editor
│   │   ├── media/        # Media library
│   │   ├── categories/   # Category management
│   │   ├── authors/      # Author profiles
│   │   ├── tags/         # Tag management
│   │   ├── equipment/    # Equipment management
│   │   ├── pinterest/    # Pinterest boards & pins
│   │   ├── homepage/     # Homepage builder
│   │   ├── settings/     # Site settings
│   │   ├── redirects/    # Redirect management
│   │   └── auth/         # Login page
│   ├── services/         # API client
│   ├── store/            # Zustand stores
│   ├── ui/               # shadcn/ui components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Admin utilities
│   └── utils/            # Admin helper functions
├── components/           # Public site Astro components
│   ├── Header.astro      # Site navigation with mega menu
│   ├── Footer.astro      # Site footer
│   ├── SEO.astro         # Meta tags & JSON-LD
│   ├── RecipeCard.astro  # Recipe listing card
│   ├── ArticleCard.astro # Article listing card
│   ├── StoriesBar.astro  # Web Stories carousel
│   ├── WebStoryViewer.astro # Full story viewer
│   ├── content/          # Content block renderers
│   └── ...               # Other public components
├── layouts/              # Astro layouts
│   ├── Layout.astro      # Base layout
│   ├── ArticleLayout.astro
│   ├── RecipeLayout.astro
│   └── RoundupLayout.astro
├── pages/                # Astro pages & API routes
│   ├── index.astro       # Homepage
│   ├── about.astro       # About page
│   ├── contact.astro     # Contact page
│   ├── faqs.astro        # FAQs page
│   ├── my-bookmarks.astro # Saved recipes
│   ├── 404.astro         # Not found
│   ├── 500.astro         # Server error
│   ├── recipes/          # Recipe listing + detail
│   ├── articles/         # Article detail pages
│   ├── roundups/         # Roundup listing + detail
│   ├── categories/       # Category archives
│   ├── authors/          # Author pages
│   ├── tags/             # Tag archives
│   ├── feed/             # RSS feed routes
│   ├── rss/              # Recipe & Pinterest XML feeds
│   ├── images/           # Image proxy routes
│   ├── api/              # REST API (50 endpoints)
│   └── sitemap.ts        # Dynamic sitemap
├── middleware.ts          # CORS, CSP, redirects, security headers
├── lib/                  # Shared utilities
├── utils/                # Canvas & image compression helpers
├── scripts/              # Client-side scripts (bookmarks)
└── styles/               # Global CSS
```

---

## Database Architecture

**Database**: Cloudflare D1 (SQLite)
**ORM**: Drizzle ORM
**Schema Source**: `db/schema.sql`

### Key Tables
| Table | Purpose |
|-------|---------|
| `site_settings` | Global key-value config store |
| `media` | Asset library with responsive variants (xs/sm/md/lg/original) |
| `categories` | Hierarchical taxonomy with cached counts |
| `authors` | Creator profiles with social links |
| `tags` | Flexible labeling with filter groups |
| `equipment` | Kitchen tools with affiliate links |
| `articles` | Core content (polymorphic: article/recipe/roundup) |
| `articles_to_tags` | Many-to-many junction (articles <-> tags) |
| `pinterest_boards` | Pinterest board targets |
| `pinterest_pins` | Pin assets for export |
| `pin_templates` | Canvas template definitions |
| `redirects` | 301/302 redirect management with hit tracking |

### FTS5 Virtual Tables
| Table | Purpose |
|-------|---------|
| `idx_articles_search` | Full-text search for articles |
| `idx_media_search_fts` | Full-text search for media library |

### Design Patterns
- **Soft Deletes**: All tables use `deleted_at`; queries filter `WHERE deleted_at IS NULL`
- **Zero-Join Rendering**: Cached JSON fields for instant rendering without JOINs
- **SQL Triggers**: Auto-timestamps, FTS5 sync, soft delete protection
- **Polymorphic Articles**: Supports `article`, `recipe`, and `roundup` types

---

## Image System

Sophisticated responsive image system with:
- **5 Breakpoints**: xs (360px), sm (720px), md (1200px), lg (2048px), original
- **WASM Encoding**: @jsquash/webp and @jsquash/avif for client-side encoding
- **Focal Point Selection**: CSS object-position control per image
- **Blur Placeholders**: Base64 LQIP for progressive loading
- **Image Cropping**: react-easy-crop for precise focal point selection
- **Storage Isolation**: `r2_key` stripped from API responses

---

## API

**Base Path**: `/api/`
**Endpoints**: 50 across 20+ resource directories

### Response Format
```typescript
// Success
{ success: true, data: T | T[] }

// Error
{ success: false, error: string, code: string, details?: Record }

// Paginated
{ success: true, data: T[], pagination: { page, limit, total, totalPages, hasNext, hasPrev } }
```

### Authentication
- **Public**: GET endpoints for listings
- **Protected**: POST/PUT/DELETE require Bearer token (JWT)

### API Resources
| Resource | Endpoints | Purpose |
|----------|-----------|---------|
| `articles` | CRUD + slug | Article management |
| `recipes` | CRUD + slug + rating | Recipe management |
| `roundups` | CRUD + slug | Roundup management |
| `categories` | CRUD + slug | Category taxonomy |
| `tags` | CRUD + slug | Tag system |
| `authors` | CRUD + slug | Author profiles |
| `equipment` | CRUD | Kitchen tools |
| `media` | CRUD + upload + bulk delete | Media library |
| `pinterest-boards` | CRUD | Pinterest boards |
| `pins` | CRUD + upload | Pinterest pins |
| `templates` | CRUD + slug | Pin templates |
| `redirects` | CRUD | URL redirects |
| `settings` | Appearance, menus, image upload | Site configuration |
| `stats` | Dashboard, popular | Analytics |
| `auth` | Login, refresh, verify | Authentication |
| `ai` | Generate, models, providers, settings | AI content |
| `branding` | Logo, favicon | Site branding |
| `content` | Index | Content queries |
| `views` | By slug | Page view tracking |
| `upload` | Image, thumbnail, font, from URL | File uploads |

---

## Security

- **Middleware**: CORS, Content Security Policy, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Cross-Origin policies
- **JWT Authentication**: jose library for admin auth with auto-refresh
- **Secrets Management**: JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD stored in Cloudflare Secrets (not in code)
- **Soft Deletes**: Prevents accidental data loss
- **Input Validation**: Zod schemas for all API inputs
- **Session Monitoring**: Automatic token refresh and session expiry handling
- **CSP**: Stricter production policy vs relaxed dev policy

---

## Configuration

| File | Purpose |
|------|---------|
| `astro.config.mjs` | Astro: React integration, Cloudflare adapter, SSR output |
| `wrangler.toml` | Cloudflare: D1/R2/KV bindings, dev env vars |
| `tsconfig.json` | Path aliases (`@/*`, `@modules/*`, `@shared/*`, etc.) |
| `drizzle.config.ts` | Drizzle: SQLite dialect, schema location |
| `components.json` | shadcn/ui: New York style, zinc base |
| `db/schema.sql` | **Source of truth** for database schema |
| `.dev.vars` | Local dev secrets (JWT_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD) |

---

## Documentation

- [Database Schema](db/DATABASE_SCHEMA.md) - Comprehensive database documentation
- [Architecture](docs/ARCHITECTURE.md) - System architecture overview
- [API Reference](docs/API.md) - Complete API documentation
- [Articles API](docs/articles-api.md) - Articles-specific API docs
- [Multi-Language SaaS](docs/MULTI_LANGUAGE_SAAS.md) - Multi-language support planning
- [Recipe JSON Review](docs/RECIPE_JSON_REVIEW.md) - Recipe JSON structure review
- [Agent Instructions](AGENTS.md) - AI coding agent guidelines

---

## Content Types

The `articles` table supports three polymorphic content types:

| Type | Description | Required Fields |
|------|-------------|-----------------|
| `article` | Blog/editorial content | `content_json` |
| `recipe` | Structured recipes | `content_json` + `recipe_json` |
| `roundup` | Curated listicles | `content_json` + `roundup_json` |

### Content Blocks
Articles use a block-based JSON structure with support for:
- **Text**: paragraph, heading, blockquote, list
- **Media**: image, video
- **Callouts**: tip_box
- **Embeds**: embed, recipe_card, product_card
- **Layout**: divider, spacer, ad_slot, table
- **Food Blog**: before_after, ingredient_spotlight, faq_section, related_content

---

## Deployment

### Cloudflare Workers

```bash
# Production build
pnpm build

# Deploy to Cloudflare
pnpm deploy
# or
wrangler deploy
```

### Environment Variables

| Variable | Purpose | Location |
|----------|---------|----------|
| `JWT_SECRET` | Auth token signing | Cloudflare Secrets |
| `ADMIN_USERNAME` | Admin login username | Cloudflare Secrets |
| `ADMIN_PASSWORD` | Admin login password | Cloudflare Secrets |
| `DB` | D1 Database binding | wrangler.toml |
| `IMAGES` | R2 Storage binding | wrangler.toml |
| `SESSION` | KV namespace binding | wrangler.toml |
| `PUBLIC_CORS_ORIGINS` | Additional CORS origins | wrangler.toml |

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Message Format

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `refactor:` - Code change that neither fixes a bug nor adds a feature
- `perf:` - Performance improvement
- `test:` - Adding tests
- `chore:` - Build process, dependencies, tooling

---

## Contact

- **GitHub**: [bilal-chajia](https://github.com/bilal-chajia)
- **Project Link**: [https://github.com/bilal-chajia/freecipies-blog](https://github.com/bilal-chajia/freecipies-blog)

---

## License

This project is open source and available under the MIT License.
