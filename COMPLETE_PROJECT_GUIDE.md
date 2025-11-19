# Freecipies Blog Platform - Complete Project Guide

## 🎯 Project Overview

A comprehensive blog platform built with **Astro.js**, **Cloudflare D1** (database), **Cloudflare R2** (image storage), and a **React admin panel** for content management. The platform supports both recipe articles and regular blog posts with full SEO optimization, Pinterest integration, and RSS feeds.

---

## 📁 Project Structure

```
freecipies-blog/                 # Main Astro.js frontend
├── src/
│   ├── components/              # Reusable Astro components
│   │   ├── Header.astro        # Navigation with search
│   │   ├── Footer.astro        # 3-column footer with social links
│   │   ├── SEO.astro           # SEO component with Schema.org
│   │   ├── PinterestPins.astro # Pinterest pin display
│   │   ├── RecipeCard.astro    # Recipe card component
│   │   └── CategoryCard.astro  # Category card component
│   ├── layouts/
│   │   ├── Layout.astro        # Main layout
│   │   └── RecipeLayout.astro  # Recipe-specific layout
│   ├── pages/
│   │   ├── index.astro         # Homepage
│   │   ├── rss.xml.ts          # RSS feed
│   │   └── api/                # API endpoints
│   │       ├── recipes.ts      # Recipe CRUD
│   │       ├── categories.ts   # Category CRUD
│   │       ├── authors.ts      # Author CRUD
│   │       ├── pins.ts         # Pinterest pins CRUD
│   │       └── upload-image.ts # R2 image upload
│   ├── lib/
│   │   ├── db.ts               # D1 database utilities
│   │   ├── r2.ts               # R2 storage utilities
│   │   └── api.ts              # API client
│   └── types/
│       └── index.ts            # TypeScript definitions
├── schema.sql                   # D1 database schema
├── wrangler.toml               # Cloudflare configuration
├── astro.config.mjs            # Astro configuration
└── package.json

freecipies-admin/               # React admin panel
├── src/
│   ├── components/
│   │   ├── AdminLayout.jsx     # Admin layout with sidebar
│   │   └── PinterestPinManager.jsx  # Pin management UI
│   ├── pages/
│   │   ├── dashboard/
│   │   │   └── Dashboard.jsx   # Dashboard with stats
│   │   ├── articles/
│   │   │   ├── ArticlesList.jsx    # Article list
│   │   │   └── ArticleEditor.jsx   # Article editor with JSON
│   │   └── auth/
│   │       └── Login.jsx       # Login page
│   ├── services/
│   │   └── api.js              # API service layer
│   ├── store/
│   │   └── useStore.js         # Global state (Zustand)
│   └── App.jsx                 # Main app with routing
└── package.json
```

---

## 🗄️ Database Schema (Cloudflare D1)

### Tables

1. **categories** - Recipe/article categories
2. **authors** - Content authors with social profiles
3. **tags** - Flexible tagging system
4. **articles** - Main content table (recipes + blog posts)
5. **recipe_tags** - Many-to-many relationship
6. **pinterest_pins** - Multiple pins per article
7. **media** - R2 image metadata tracking

### Key Features

- **Flexible article structure**: Supports both recipe articles and regular blog posts
- **JSON fields**: `recipe_data`, `source`, `image` for complex data
- **Pinterest integration**: Multiple pins per article with primary pin support
- **SEO fields**: `meta_title`, `meta_description`, `keywords`
- **Online/offline status**: `is_online` flag for publishing control
- **Timestamps**: Automatic `created_at`, `updated_at` tracking

---

## 🎨 Frontend Features

### Homepage (`/`)
- **Hero section** with site description
- **Popular categories** grid
- **Newly added recipes** section
- **Chef's favorites** section

### Components
- **Header**: Sticky navigation with search modal
- **Footer**: 3-column layout with newsletter signup
- **SEO**: Complete meta tags + Schema.org JSON-LD
- **Pinterest Pins**: Display multiple pins per article

### Pages to Implement
- `/recipes` - All recipes listing
- `/recipes/[slug]` - Individual recipe page
- `/categories` - All categories
- `/categories/[slug]` - Category page
- `/authors/[slug]` - Author page
- `/tags/[slug]` - Tag page
- `/search` - Search results
- `/about` - About page
- `/contact` - Contact page

---

## 🔧 API Endpoints

### Recipes API (`/api/recipes`)
- `GET` - List recipes (with pagination, filters)
- `POST` - Create recipe
- `PUT` - Update recipe
- `DELETE` - Delete recipe

### Categories API (`/api/categories`)
- `GET` - List categories
- `POST` - Create category
- `PUT` - Update category
- `DELETE` - Delete category

### Authors API (`/api/authors`)
- `GET` - List authors
- `POST` - Create author
- `PUT` - Update author
- `DELETE` - Delete author

### Pinterest Pins API (`/api/pins`)
- `GET` - Get pins for article
- `POST` - Create pin
- `PUT` - Update pin
- `DELETE` - Delete pin

### Image Upload API (`/api/upload-image`)
- `POST` - Upload image to R2

---

## 📌 Pinterest Integration

### Features
- **Multiple pins per article** - Create variations for different audiences
- **Primary pin** - One featured pin per article
- **Pin metadata** - Title, description, alt text
- **Dimensions tracking** - Optimal 1000x1500px (vertical)
- **Sort order** - Control pin display order
- **Pinterest SDK** - Official Pin It buttons

### Admin Panel
- Upload pin images to R2
- Set pin titles and descriptions
- Mark primary pin
- Reorder pins
- Preview pins

### Frontend Display
- Large primary pin showcase
- Additional pins gallery
- Hover effects with Pin button
- Pinterest SDK integration

---

## 🚀 Deployment Guide

### 1. Create Cloudflare D1 Database

```bash
# Create database
wrangler d1 create freecipies-db

# Update wrangler.toml with database ID
# [[d1_databases]]
# binding = "DB"
# database_name = "freecipies-db"
# database_id = "YOUR_DATABASE_ID"

# Initialize schema
wrangler d1 execute freecipies-db --file=schema.sql
```

### 2. Create Cloudflare R2 Bucket

```bash
# Create bucket
wrangler r2 bucket create freecipies-images

# Update wrangler.toml
# [[r2_buckets]]
# binding = "IMAGES"
# bucket_name = "freecipies-images"
```

### 3. Deploy Astro Frontend

```bash
cd freecipies-blog

# Install dependencies
pnpm install

# Build for production
pnpm build

# Deploy to Cloudflare Pages
wrangler pages deploy dist
```

### 4. Deploy Admin Panel

```bash
cd freecipies-admin

# Install dependencies
pnpm install

# Build for production
pnpm build

# Deploy to Cloudflare Pages (separate project)
wrangler pages deploy dist
```

---

## 🔐 Environment Variables

Create `.env` file:

```env
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token

# Database (auto-configured by Cloudflare)
# DB binding available in locals.runtime.env.DB

# R2 Storage (auto-configured by Cloudflare)
# IMAGES binding available in locals.runtime.env.IMAGES

# Admin Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
```

---

## 📝 Content Management Workflow

### 1. Create Content in Admin Panel
- Login to admin panel
- Navigate to Articles
- Click "Add New Article"
- Fill in article details
- Add recipe data (if recipe article)
- Upload images to R2
- Create Pinterest pins
- Publish (set `is_online = 1`)

### 2. Article Structure

**Recipe Article:**
```json
{
  "label": "Baked Cod Coconut Lemon Cream",
  "headline": "Flaky Cod in Creamy Coconut-Lemon Sauce",
  "short_description": "Quick and easy seafood dinner",
  "recipe_data": {
    "prep_time": "10 min",
    "cook_time": "20 min",
    "servings": "4",
    "ingredients": [...],
    "instructions": [...],
    "nutrition": {...}
  }
}
```

**Blog Post (No Recipe):**
```json
{
  "label": "10 Tips for Meal Planning",
  "headline": "Save Time and Money with Smart Meal Planning",
  "short_description": "Expert tips for efficient meal planning",
  "recipe_data": null
}
```

---

## 🎯 SEO Optimization

### Implemented Features
- **Meta tags**: Title, description, keywords
- **Open Graph**: Facebook/social sharing
- **Twitter Cards**: Twitter-specific metadata
- **Schema.org JSON-LD**:
  - WebSite schema
  - Recipe schema (with nutrition, ratings)
  - Breadcrumb schema
- **Canonical URLs**: Prevent duplicate content
- **RSS feed**: `/rss.xml`
- **Sitemap**: `/sitemap.xml` (to be implemented)

### Best Practices
- Unique meta titles (50-60 characters)
- Compelling meta descriptions (150-160 characters)
- Descriptive image alt text
- Clean URL slugs
- Mobile-responsive design
- Fast page load times (Cloudflare edge)

---

## 🔄 Development Workflow

### Local Development

```bash
# Astro frontend
cd freecipies-blog
pnpm dev
# Visit http://localhost:4321

# Admin panel
cd freecipies-admin
pnpm dev
# Visit http://localhost:5173
```

### Testing with Cloudflare

```bash
# Test with local D1 database
wrangler dev --local

# Test with remote D1 database
wrangler dev --remote
```

---

## 📊 Admin Panel Features

### Dashboard
- Total articles count
- Total categories count
- Total authors count
- Recent activity

### Article Management
- List all articles with filters
- Create/edit articles
- Monaco JSON editor for complex data
- Image upload to R2
- Pinterest pin management
- Publish/unpublish toggle

### Category Management
- CRUD operations
- SEO metadata
- Image upload

### Author Management
- CRUD operations
- Social network links
- Bio and profile image

### Tag Management
- CRUD operations
- Tag usage statistics

### Media Library
- Browse R2 images
- Upload new images
- Delete images
- Copy image URLs

---

## 🎨 Design System

### Colors
- **Primary**: `#ff6b35` (Orange)
- **Secondary**: `#f7931e` (Golden)
- **Background**: `#ffffff` (White)
- **Text**: `#1a1a1a` (Dark gray)
- **Muted**: `#666666` (Gray)

### Typography
- **Font**: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto)
- **Headings**: 700-900 weight
- **Body**: 400-500 weight

### Spacing
- Uses `clamp()` for responsive spacing
- Grid gaps: `clamp(1rem, 2vw, 1.5rem)`
- Padding: `clamp(1rem, 3vw, 1.5rem)`

### Components
- Border radius: `8px` (buttons), `12px` (cards)
- Shadows: `0 4px 12px rgba(0, 0, 0, 0.1)`
- Transitions: `0.2s-0.3s ease`

---

## 🚧 Remaining Tasks

### Frontend Pages
- [ ] Recipe detail page (`/recipes/[slug]`)
- [ ] Category listing page (`/categories`)
- [ ] Category detail page (`/categories/[slug]`)
- [ ] Author page (`/authors/[slug]`)
- [ ] Tag page (`/tags/[slug]`)
- [ ] Search page (`/search`)
- [ ] About page (`/about`)
- [ ] Contact page (`/contact`)
- [ ] Privacy policy (`/privacy`)
- [ ] FAQ page (`/faq`)

### Admin Panel
- [ ] Complete Authors CRUD UI
- [ ] Complete Tags CRUD UI
- [ ] Media Library UI
- [ ] Settings panel
- [ ] User authentication
- [ ] Dashboard analytics

### Features
- [ ] Search functionality
- [ ] Newsletter signup
- [ ] Comments system
- [ ] Recipe ratings
- [ ] Print recipe functionality
- [ ] Recipe scaling (servings adjustment)
- [ ] Shopping list generation
- [ ] Sitemap generation

---

## 📚 Resources

### Documentation
- [Astro.js Docs](https://docs.astro.build)
- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)

### Tools
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Pinterest Developers](https://developers.pinterest.com/)
- [Schema.org](https://schema.org/)

---

## 🎉 Project Status

### ✅ Completed
- Database schema with Pinterest pins
- API endpoints structure
- Frontend components (Header, Footer, SEO)
- Homepage
- Pinterest pin system (API + frontend + admin)
- RSS feed
- Cloudflare adapter integration
- TypeScript types
- Admin panel structure

### 🚧 In Progress
- Complete frontend pages
- Complete admin panel UI
- API endpoint implementations

### 📋 Planned
- Search functionality
- Newsletter integration
- Analytics dashboard
- Performance optimization

---

## 💡 Tips & Best Practices

1. **Always test locally** with `wrangler dev --local` before deploying
2. **Use environment variables** for sensitive data
3. **Optimize images** before uploading to R2
4. **Write descriptive alt text** for accessibility and SEO
5. **Test on mobile devices** - responsive design is critical
6. **Monitor Cloudflare analytics** for performance insights
7. **Keep dependencies updated** with `pnpm update`
8. **Use TypeScript** for type safety
9. **Follow SEO best practices** for better discoverability
10. **Backup database** regularly with `wrangler d1 export`

---

## 🆘 Troubleshooting

### Database Issues
```bash
# Check database status
wrangler d1 info freecipies-db

# View database contents
wrangler d1 execute freecipies-db --command="SELECT * FROM articles LIMIT 10"

# Reset database (WARNING: Deletes all data)
wrangler d1 execute freecipies-db --file=schema.sql
```

### R2 Issues
```bash
# List buckets
wrangler r2 bucket list

# List objects in bucket
wrangler r2 object list freecipies-images
```

### Build Issues
```bash
# Clear cache and rebuild
rm -rf node_modules .astro dist
pnpm install
pnpm build
```

---

## 📞 Support

For questions or issues:
- Check documentation in this guide
- Review Cloudflare docs
- Check Astro.js docs
- Review code comments

---

**Version**: 1.0.0  
**Last Updated**: 2025-10-17  
**License**: MIT
