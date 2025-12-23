# Multi-Language SaaS Architecture

> **Status:** Future Planning  
> **Date:** 2025-12-18

## Overview

Transform the single-blog platform into a multi-language SaaS where:

- One tenant = One language/domain
- Same content translated across languages
- Shared media assets (images without text)

### Example Deployment

| Domain              | Language | Locale |
| ------------------- | -------- | ------ |
| recipes-saas.com      | English  | en     |
| recettegratuite.com | Français | fr     |
| rezeptefrei.de      | Deutsch  | de     |

---

## Architecture

### Multi-Tenancy Strategy

**Database per Tenant** approach:

- Each language site has its own D1 database
- Shared master database for cross-tenant data
- Single R2 bucket with tenant prefixes

```
                    ┌─────────────────────────────────────┐
                    │          MASTER DATABASE            │
                    │    (tenants, users, translations)   │
                    └─────────────────────────────────────┘
                                     │
       ┌─────────────────────────────┼─────────────────────────────┐
       ▼                             ▼                             ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   EN Database   │       │   FR Database   │       │   DE Database   │
│  (recipes-saas)   │       │ (recettegratuit)│       │  (rezeptefrei)  │
│                 │       │                 │       │                 │
│  - articles     │       │  - articles     │       │  - articles     │
│  - categories   │       │  - categories   │       │  - categories   │
│  - authors      │       │  - authors      │       │  - authors      │
│  - etc...       │       │  - etc...       │       │  - etc...       │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## Master Database Schema

### tenants

```sql
CREATE TABLE tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,          -- "recipes-saas"
    name TEXT NOT NULL,                 -- "Freecipies"
    locale TEXT NOT NULL,               -- "en", "fr", "de"
    custom_domain TEXT,                 -- "recipes-saas.com"
    subdomain TEXT UNIQUE,              -- "recipes-saas.example.com"
    d1_database_id TEXT NOT NULL,       -- Cloudflare D1 binding ID
    r2_prefix TEXT NOT NULL,            -- R2 path prefix for tenant files
    owner_user_id INTEGER,
    plan TEXT DEFAULT 'free',           -- "free", "pro", "enterprise"
    status TEXT DEFAULT 'active',       -- "active", "suspended", "deleted"
    config_json TEXT DEFAULT '{}',      -- Tenant-specific settings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### users (Global)

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT,
    avatar_url TEXT,
    is_super_admin BOOLEAN DEFAULT false,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### tenant_users (Access Control)

```sql
CREATE TABLE tenant_users (
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'editor',         -- "owner", "admin", "editor", "viewer"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tenant_id, user_id)
);
```

### article_groups (Translation Linking)

```sql
CREATE TABLE article_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    master_locale TEXT DEFAULT 'en',    -- Original language
    master_tenant_id INTEGER NOT NULL,  -- Where original was created
    master_article_id INTEGER NOT NULL, -- Original article ID
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### article_translations

```sql
CREATE TABLE article_translations (
    article_group_id INTEGER REFERENCES article_groups(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,               -- 'en', 'fr', 'de'
    tenant_id INTEGER NOT NULL,         -- Which tenant DB
    article_id INTEGER NOT NULL,        -- Article ID in that tenant
    translation_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'complete', 'outdated'
    translated_by INTEGER,              -- User who translated
    translated_at DATETIME,
    PRIMARY KEY (article_group_id, locale)
);
```

### global_media (Shared Assets)

```sql
CREATE TABLE global_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    r2_key TEXT NOT NULL,               -- "_shared/recipes/chocolate-cake/lg.webp"
    variants_json TEXT NOT NULL,        -- All size variants
    category TEXT,                      -- "stock", "ingredient", "recipe", "icon"
    tags_json TEXT DEFAULT '[]',
    usage_count INTEGER DEFAULT 0,      -- Track how many articles use this
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## R2 Storage Structure

```
r2://recipes-saas-media/
│
├── _shared/                            # Shared across ALL tenants
│   ├── recipes/                        # Recipe photos (no text overlay)
│   │   └── {recipe-slug}/
│   │       ├── xs.webp
│   │       ├── sm.webp
│   │       ├── md.webp
│   │       └── lg.webp
│   ├── ingredients/                    # Ingredient photos
│   ├── stock/                          # Stock photos
│   └── icons/                          # SVG icons
│
├── recipes-saas/                         # EN tenant-specific
│   ├── pins/                           # Pinterest pins WITH English text
│   ├── social/                         # Social cards with text
│   └── custom/                         # Tenant uploads
│
├── recettegratuite/                    # FR tenant-specific
│   ├── pins/
│   ├── social/
│   └── custom/
│
└── rezeptefrei/                        # DE tenant-specific
    ├── pins/
    ├── social/
    └── custom/
```

### What's Shared vs Tenant-Specific

| Shared (`_shared/`) | Tenant-Specific          |
| ------------------- | ------------------------ |
| Recipe photos       | Pinterest pins with text |
| Ingredient photos   | Social media cards       |
| Step-by-step photos | Infographics with text   |
| Stock photos        | Custom tenant uploads    |
| SVG icons           |                          |

---

## Image URL Strategy

### Key Principle: Store r2_key, Not Full URL

**In database:**

```json
{
  "r2_key": "recipes-saas/images/lg/recipe-123.webp",
  "alt": "Chocolate Cake"
}
```

**At runtime:**

```javascript
const fullUrl = `${process.env.R2_PUBLIC_URL}/${r2_key}`;
```

### Benefits

| Scenario            | What Changes                         | Database Update? |
| ------------------- | ------------------------------------ | ---------------- |
| Move to new domain  | Change `R2_PUBLIC_URL`               | ❌ No            |
| Switch CDN provider | Change `R2_PUBLIC_URL`               | ❌ No            |
| Local → Production  | Different env var                    | ❌ No            |
| New tenant domain   | Different `R2_PUBLIC_URL` per tenant | ❌ No            |

### Multi-Tenant URL Example

**R2 Storage (Same Bucket):**

```
R2 Bucket: recipes-saas-media
├── _shared/                        # Shared images (no text)
│   └── recipes/chocolate-cake/lg.webp
├── recipes-saas/                     # Tenant 1
│   └── pins/pinterest-pin-1.webp
├── recettegratuite/                # Tenant 2
│   └── pins/pinterest-pin-1.webp   # Same recipe, French text
└── rezeptefrei/                    # Tenant 3
    └── pins/pinterest-pin-1.webp   # Same recipe, German text
```

**Database (shared r2_key across tenants):**

```json
// recipes-saas DB
{ "r2_key": "_shared/recipes/chocolate-cake/lg.webp", "alt": "Chocolate Cake" }

// recettegratuite DB
{ "r2_key": "_shared/recipes/chocolate-cake/lg.webp", "alt": "Gâteau au chocolat" }

// rezeptefrei DB
{ "r2_key": "_shared/recipes/chocolate-cake/lg.webp", "alt": "Schokoladenkuchen" }
```

**URL Generation (per-tenant R2_PUBLIC_URL):**

```javascript
// Tenant: recipes-saas.com
R2_PUBLIC_URL = "https://media.recipes-saas.com"
→ https://media.recipes-saas.com/_shared/recipes/chocolate-cake/lg.webp

// Tenant: recettegratuite.com
R2_PUBLIC_URL = "https://media.recettegratuite.com"
→ https://media.recettegratuite.com/_shared/recipes/chocolate-cake/lg.webp

// Tenant: rezeptefrei.de
R2_PUBLIC_URL = "https://media.rezeptefrei.de"
→ https://media.rezeptefrei.de/_shared/recipes/chocolate-cake/lg.webp
```

**Same `r2_key`, different CDN domains = Zero database updates when adding tenants!**

### wrangler.toml Configuration

```toml
# Local development
[vars]
R2_PUBLIC_URL = "http://localhost:4321/api/images"

# Production (per deployment or use secrets)
[env.production.vars]
R2_PUBLIC_URL = "https://media.recipes-saas.com"
```

---

## Translation Workflow

### Creating a New Recipe

```
1. Admin creates recipe in EN tenant (master)
   - Uploads recipe photos to _shared/
   - Writes EN content

2. System automatically:
   - Creates article_group record
   - Links EN article as master

3. Admin clicks "Create Translation → FR"

4. System:
   - Creates placeholder article in FR database
   - Copies structure (images, ingredient counts)
   - Links to same article_group
   - Sets translation_status = 'pending'

5. Translator (or AI):
   - Opens FR article
   - Translates text fields
   - Same _shared/ images auto-populate
   - Marks translation_status = 'complete'

6. If master EN article updates:
   - All translations marked as 'outdated'
   - Notification sent to translators
```

---

## SEO: hreflang Implementation

Each article page generates hreflang links:

```html
<!-- On recipes-saas.com/recipes/chocolate-cake -->
<link
  rel="alternate"
  hreflang="en"
  href="https://recipes-saas.com/recipes/chocolate-cake"
/>
<link
  rel="alternate"
  hreflang="fr"
  href="https://recettegratuite.com/recettes/gateau-chocolat"
/>
<link
  rel="alternate"
  hreflang="de"
  href="https://rezeptefrei.de/rezepte/schokoladenkuchen"
/>
<link
  rel="alternate"
  hreflang="x-default"
  href="https://recipes-saas.com/recipes/chocolate-cake"
/>
```

### Articles Table Addition

```sql
-- In each tenant's articles table
ALTER TABLE articles ADD COLUMN article_group_id INTEGER;
-- Links back to master DB for cross-referencing translations
```

---

## API Endpoints

### Master API (Cross-Tenant)

| Endpoint                                     | Purpose                             |
| -------------------------------------------- | ----------------------------------- |
| `GET /api/translations/{group_id}`           | Get all translations for an article |
| `POST /api/translations/{group_id}/{locale}` | Create translation placeholder      |
| `GET /api/tenants`                           | List all tenants (admin)            |
| `POST /api/tenants`                          | Create new tenant                   |

### Tenant API (Per-Language)

| Endpoint                | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `GET /api/articles`     | List articles for this tenant           |
| `POST /api/articles`    | Create article (links to article_group) |
| `GET /api/shared-media` | Browse \_shared/ media                  |

---

## Benefits

1. **No Image Duplication** - Same photo across all languages
2. **Centralized Translation Tracking** - See what's translated, what's pending
3. **SEO Optimized** - Proper hreflang, separate domains
4. **Independent Sites** - Each tenant can have unique categories, styling
5. **Scalable** - Add new languages easily
6. **Cost Efficient** - Shared R2 storage

---

## Future Enhancements

- [ ] AI-assisted translation (DeepL, GPT-4)
- [ ] Translation memory/glossary
- [ ] Crowdsourced translations
- [ ] Regional variants (en-US, en-GB)
- [ ] RTL language support (ar, he)

---

## Migration Path

1. Current single-blog → Becomes EN master tenant
2. Create FR tenant with same schema
3. Add master DB tables (tenants, article_groups, etc.)
4. Move images to `_shared/` prefix
5. Link articles via article_groups
