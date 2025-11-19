# Freecipies Blog - Astro.js & Cloudflare Platform

A modern, high-performance blog platform built with Astro.js and deployed on Cloudflare Pages, featuring recipe management, categories, authors, and a comprehensive admin dashboard.

## 🏗️ Architecture Overview

### Frontend
- **Framework**: Astro.js 5.x with hybrid rendering (SSG + SSR)
- **Styling**: TailwindCSS 4.x with responsive design
- **Type Safety**: TypeScript with strict mode
- **Components**: Modular Astro components for recipes, categories, and authors

### Backend
- **API**: Cloudflare Workers (serverless edge functions)
- **Data Storage**: Cloudflare Workers KV or D1 Database
- **CDN**: Cloudflare CDN for global content delivery
- **Security**: Cloudflare WAF, DDoS protection, rate limiting

### Deployment
- **Platform**: Cloudflare Pages
- **CI/CD**: Automated deployment via Git integration
- **Edge Computing**: Global edge network for low latency

## 📁 Project Structure

```
freecipies-blog/
├── src/
│   ├── components/          # Reusable Astro components
│   │   ├── RecipeCard.astro
│   │   ├── CategoryCard.astro
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── layouts/             # Page layouts
│   │   ├── Layout.astro     # Main layout
│   │   ├── RecipeLayout.astro
│   │   └── BlogPost.astro
│   ├── pages/               # Routes and pages
│   │   ├── index.astro      # Home page
│   │   ├── api/             # API endpoints
│   │   │   ├── recipes.ts
│   │   │   ├── categories.ts
│   │   │   └── authors.ts
│   │   └── [...slug].astro  # Dynamic routes
│   ├── lib/                 # Utilities and helpers
│   │   ├── api.ts           # API client
│   │   └── utils.ts         # Helper functions
│   ├── types/               # TypeScript definitions
│   │   └── index.ts
│   └── styles/              # Global styles
│       └── global.css
├── public/                  # Static assets
├── astro.config.mjs         # Astro configuration
├── wrangler.toml            # Cloudflare Workers config
├── tailwind.config.js       # TailwindCSS config
└── tsconfig.json            # TypeScript config
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Cloudflare account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd freecipies-blog
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Cloudflare credentials
   ```

4. **Run development server**
   ```bash
   pnpm dev
   ```

5. **Build for production**
   ```bash
   pnpm build
   ```

6. **Preview production build**
   ```bash
   pnpm preview
   ```

## 🔧 Configuration

### Cloudflare Workers KV Setup

1. Create KV namespaces:
   ```bash
   wrangler kv:namespace create "RECIPES"
   wrangler kv:namespace create "CATEGORIES"
   wrangler kv:namespace create "AUTHORS"
   wrangler kv:namespace create "TAGS"
   ```

2. Update `wrangler.toml` with namespace IDs

3. Populate KV with data:
   ```bash
   # Example: Add a recipe
   wrangler kv:key put --binding=RECIPES "recipe-slug" '{"id":1,"label":"Recipe Name",...}'
   ```

### Cloudflare D1 Database (Optional)

1. Create D1 database:
   ```bash
   wrangler d1 create freecipies-db
   ```

2. Run migrations:
   ```bash
   wrangler d1 execute freecipies-db --file=./schema.sql
   ```

## 📊 Data Models

### Recipe
```typescript
interface Recipe {
  id: number;
  slug: string;
  label: string;
  categorySlug: string;
  authorSlug: string;
  metaTitle: string;
  metaDescription: string;
  shortDescription: string;
  tldr: string;
  image: Image;
  recipe: RecipeDetails;
  // ... more fields
}
```

### Category
```typescript
interface Category {
  id: number;
  slug: string;
  label: string;
  headline: string;
  image: Image;
  // ... more fields
}
```

### Author
```typescript
interface Author {
  id: number;
  slug: string;
  name: string;
  email: string;
  job: string;
  image: Image;
  // ... more fields
}
```

## 🔌 API Endpoints

### Recipes
- `GET /api/recipes` - List all recipes
- `GET /api/recipes?slug={slug}` - Get recipe by slug
- `GET /api/recipes?category={slug}` - Filter by category
- `GET /api/recipes?author={slug}` - Filter by author

### Categories
- `GET /api/categories` - List all categories
- `GET /api/categories?slug={slug}` - Get category by slug

### Authors
- `GET /api/authors` - List all authors
- `GET /api/authors?slug={slug}` - Get author by slug

## 🎨 Styling

The project uses TailwindCSS 4.x with:
- Responsive design (mobile-first)
- Dark mode support
- Custom color palette
- Utility-first CSS approach
- Component-based styling

### Design Principles
- **Responsive**: `clamp()` and `calc()` for fluid typography
- **Performance**: Optimized for Core Web Vitals (CLS, LCP, FID)
- **Accessibility**: ARIA labels, semantic HTML
- **Modern**: CSS Grid, Flexbox, CSS Variables

## 🔒 Security

### Authentication (Admin Dashboard)
- JWT-based authentication
- Cloudflare Access for admin routes
- Role-based access control (RBAC)

### Security Features
- HTTPS enforcement
- CORS configuration
- Rate limiting via Cloudflare
- DDoS protection
- Web Application Firewall (WAF)

## 📈 Performance Optimization

### Caching Strategy
- **Static Assets**: Long-term caching (1 year)
- **API Responses**: Short-term caching (1 hour)
- **HTML Pages**: Edge caching with revalidation
- **Images**: Cloudflare Image Optimization

### Build Optimization
- Code splitting
- Tree shaking
- Minification
- Image optimization (Sharp)
- Critical CSS inlining

## 🚢 Deployment

### Cloudflare Pages

1. **Connect repository to Cloudflare Pages**
   - Go to Cloudflare Dashboard → Pages
   - Create new project from Git
   - Select repository

2. **Configure build settings**
   - Build command: `pnpm build`
   - Build output directory: `dist`
   - Environment variables: Add from `.env`

3. **Deploy**
   - Push to main branch for automatic deployment
   - Preview deployments for pull requests

### Manual Deployment

```bash
# Build the project
pnpm build

# Deploy to Cloudflare Pages
wrangler pages deploy dist
```

## 🧪 Testing

```bash
# Run tests (when implemented)
pnpm test

# Type checking
pnpm type-check

# Linting
pnpm lint
```

## 📝 Admin Dashboard

The admin dashboard allows authorized users to:
- Create, update, delete recipes
- Manage categories and tags
- Manage authors
- Upload and manage images
- Schedule posts
- View analytics

Access: `/admin` (requires authentication)

## 🔄 Data Migration

To migrate data from Google Sheets to Cloudflare:

1. Export data from Google Sheets as JSON
2. Use the migration script:
   ```bash
   node scripts/migrate-data.js
   ```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- Documentation: [docs-url]
- Email: support@freecipies.com

## 🗺️ Roadmap

- [ ] Admin dashboard implementation
- [ ] Search functionality with Algolia/Meilisearch
- [ ] User comments and ratings
- [ ] Recipe collections/meal plans
- [ ] Mobile app (React Native)
- [ ] AI-powered recipe suggestions
- [ ] Multi-language support

---

Built with ❤️ using Astro.js and Cloudflare

