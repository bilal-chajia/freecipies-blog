# Analyse Profonde du Schéma de Base de Données Content

> **Date:** 2026-02-05  
> **Source:** `db/schema.sql` + `src/modules/articles/schema/`  
> **Statut:** Analysis for Redesign  

---

## 📊 Vue d'Ensemble du Schéma

Le schéma de base de données est **très sophistiqué** avec 8 tables principales et des patterns avancés:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE ARCHITECTURE                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │ site_settings│     │    media     │     │   equipment  │               │
│   │  (config)    │     │   (assets)   │     │ (affiliates) │               │
│   └──────────────┘     └──────────────┘     └──────────────┘               │
│                                                                             │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│   │  categories  │◄────┤   articles   ├────►│   authors    │               │
│   │  (taxonomy)  │     │   (core)     │     │  (profiles)  │               │
│   └──────────────┘     └──────┬───────┘     └──────────────┘               │
│                               │                                            │
│                          ┌────┴────┐                                       │
│                          │articles_│                                       │
│                          │to_tags  │                                       │
│                          └────┬────┘                                       │
│                               │                                            │
│                          ┌────┴────┐                                       │
│                          │   tags   │                                       │
│                          └─────────┘                                       │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────┐         │
│   │              idx_articles_search (FTS5)                     │         │
│   │                   Full-Text Search                          │         │
│   └─────────────────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Analyse Table par Table

### 1. `site_settings` - Configuration Globale

**Pattern:** Key-Value Store dans SQL  
**Stratégie:** Hybrid SQL/JSON pour flexibilité

```sql
CREATE TABLE site_settings (
    key TEXT PRIMARY KEY,           -- 'site_info', 'seo_defaults', etc.
    value TEXT NOT NULL,            -- JSON payload
    description TEXT,               -- UI helper
    category TEXT DEFAULT 'general', -- 'general', 'seo', 'social', 'theme'
    sort_order INTEGER DEFAULT 0,   -- Display order
    type TEXT CHECK (type IN (      -- UI hint
        'json', 'text', 'number', 'boolean', 
        'image', 'color', 'code'
    )),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Clés Pré-définies:**
- `site_info` - Nom, tagline, logo
- `social_links` - Réseaux sociaux
- `seo_defaults` - Meta par défaut
- `theme_config` - Couleurs, dark mode
- `scripts` - Analytics, custom scripts
- `footer_config` - Copyright, liens
- `newsletter` - Provider, listId
- `contact_info` - Email, adresse

**Liens avec Content:**
- Settings de l'éditeur stockés ici
- Configuration des blocs par défaut
- Thèmes et couleurs pour le rendering

---

### 2. `media` - Asset Library Centralisée

**Pattern:** SQL pour métadonnées + JSON pour technical payload  
**Stratégie:** Responsive images avec variants (xs, sm, md, lg)

```sql
CREATE TABLE media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Searchable Metadata
    name TEXT NOT NULL,             -- "Apple Pie Shoot 01"
    alt_text TEXT NOT NULL,         -- SEO/Accessibility
    caption TEXT,                   -- Visible caption
    credit TEXT,                    -- Attribution
    mime_type TEXT DEFAULT 'image/webp',
    aspect_ratio TEXT,              -- "16:9", "4:5"
    
    -- Technical Payload (JSON)
    variants_json TEXT NOT NULL,    -- URLs R2 par breakpoint
    focal_point_json TEXT DEFAULT '{"x": 50, "y": 50}',
    
    -- System
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL  -- Soft delete
);
```

**Schema variants_json:**
```json
{
  "variants": {
    "original": { "url": "...", "r2_key": "...", "width": 4000, "height": 3000, "sizeBytes": 412345 },
    "xs": { "url": "...", "r2_key": "...", "width": 360, "height": 240, "sizeBytes": 23123 },
    "sm": { "url": "...", "r2_key": "...", "width": 720, "height": 480, "sizeBytes": 54321 },
    "md": { "url": "...", "r2_key": "...", "width": 1200, "height": 800, "sizeBytes": 102345 },
    "lg": { "url": "...", "r2_key": "...", "width": 2048, "height": 1365, "sizeBytes": 198765 }
  },
  "placeholder": "data:image/jpeg;base64,/9j/4AAQ..."  -- Blurhash/LQIP
}
```

**Liens avec Content:**
- Blocks `image` et `before_after` référencent `media_id`
- Les variants sont copiés dans `images_json` des articles (zero-join)
- Avatar utilise des breakpoints spéciaux (50, 100, 200, 400px)

---

### 3. `categories` - Taxonomie Hiérarchique

**Pattern:** Adjacency List (parent_id) + denormalized depth  
**Stratégie:** Hybrid SQL/JSON pour visuels et config

```sql
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Navigation & Hierarchy
    slug TEXT UNIQUE NOT NULL,      -- "breakfast", "gluten-free-desserts"
    label TEXT NOT NULL,            -- "Breakfast"
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    depth INTEGER DEFAULT 0,        -- Pre-computed pour éviter CTE récursif
    
    -- Display Text
    headline TEXT,                  -- H1 landing page
    collection_title TEXT,          -- Titre au-dessus de la grille
    short_description TEXT NOT NULL,-- SEO + contexte
    
    -- Visuals (JSON)
    images_json TEXT DEFAULT '{}',  -- thumbnail + cover slots
    color TEXT DEFAULT '#ff6600ff', -- Thème couleur
    icon_svg TEXT,                  -- SVG pour menus
    
    -- Config (JSON)
    seo_json TEXT DEFAULT '{}',     -- Meta overrides
    config_json TEXT DEFAULT '{}',  -- Layout, postsPerPage, etc.
    i18n_json TEXT DEFAULT '{}',    -- Traductions
    
    -- Metrics
    is_featured BOOLEAN DEFAULT 0,
    is_online BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    cached_post_count INTEGER DEFAULT 0,  -- Denormalized
    
    -- System
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);
```

**Schema config_json:**
```json
{
  "postsPerPage": 12,
  "layoutMode": "grid",           // "grid" | "list" | "masonry"
  "cardStyle": "full",            // "compact" | "full" | "minimal"
  "showSidebar": true,
  "showFilters": true,
  "sortBy": "publishedAt",
  "headerStyle": "hero",          // "hero" | "minimal" | "none"
  "featuredArticleId": 123
}
```

**Liens avec Content:**
- Chaque article a un `category_id` (required)
- `cached_category_json` dans articles (zero-join)
- Couleur utilisée pour badges et accents

---

### 4. `authors` - Profils Auteurs

**Pattern:** Similaire à categories  
**Spéciale:** Avatar avec breakpoints réduits (50, 100, 200, 400)

```sql
CREATE TABLE authors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    -- Identity
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,     -- Pour auth et Gravatar
    
    -- Display
    job_title TEXT,                 -- "Senior Editor"
    role TEXT DEFAULT 'guest' CHECK (role IN (
        'guest', 'staff', 'editor', 'admin'
    )),
    headline TEXT,
    subtitle TEXT,
    short_description TEXT NOT NULL,
    excerpt TEXT,
    introduction TEXT,
    
    -- Visuals (JSON) - Avatar breakpoints spéciaux!
    images_json TEXT DEFAULT '{}',  -- avatar (50/100/200/400) + cover
    
    -- Bio & Socials (JSON)
    bio_json TEXT DEFAULT '{}',
    seo_json TEXT DEFAULT '{}',
    
    -- Metrics
    is_online BOOLEAN DEFAULT 0,
    is_featured BOOLEAN DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    cached_post_count INTEGER DEFAULT 0,
    
    -- System
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);
```

**Schema bio_json:**
```json
{
  "short": "Jane writes about healthy Mediterranean recipes...",
  "long": "## About Jane\n\nJane has been cooking since...",
  "socials": [
    { "network": "twitter", "url": "https://x.com/jane", "label": "@janedoe" },
    { "network": "instagram", "url": "https://instagram.com/jane" }
  ]
}
```

**Liens avec Content:**
- Chaque article a un `author_id` (required)
- `cached_author_json` dans articles (zero-join)
- Socials affichés dans RecipeAuthorCard

---

### 5. `tags` - Tags pour Filtrage

**Pattern:** Lightweight avec filter groups  
**Stratégie:** JSON pour groups et styling

```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,      -- "gluten-free"
    label TEXT NOT NULL,            -- "Gluten Free"
    description TEXT,
    
    -- Filter Logic
    filter_groups_json TEXT DEFAULT '[]',  // ["Diet", "Lifestyle"]
    
    -- Visual Styling (JSON)
    style_json TEXT DEFAULT '{}',   // { "svg_code": "...", "color": "#10b981", "variant": "outline" }
    
    -- Metrics
    cached_post_count INTEGER DEFAULT 0,
    
    -- System
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);
```

**Liens avec Content:**
- Relation many-to-many via `articles_to_tags`
- `cached_tags_json` dans articles: `["Vegan", "Gluten-Free"]`
- Filter groups pour UI de filtrage

---

### 6. `equipment` - Équipement Cuisine

**Pattern:** Catalogue centralisé avec liens d'affiliation  
**Usage:** Référencé par `recipe_json.equipment`

```sql
CREATE TABLE equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,             -- "Stand Mixer"
    description TEXT,
    category TEXT DEFAULT 'other' CHECK (category IN (
        'appliances', 'bakeware', 'cookware', 'utensils', 'gadgets', 'other'
    )),
    
    -- Visual
    image_json TEXT DEFAULT '{}',
    
    -- Affiliate Links
    affiliate_url TEXT,
    affiliate_provider TEXT,        -- "amazon", "williams-sonoma"
    affiliate_note TEXT,
    price_display TEXT,             -- "$299.99" (display only)
    
    -- System
    is_active BOOLEAN DEFAULT 1,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);
```

**Liens avec Content:**
- `recipe_json.equipment` référence `equipment_id`
- `cached_equipment_json` dans articles avec liens résolus
- Affichage dans la recipe card avec liens affiliés

---

### 7. `articles` - Table Polymorphe (Cœur du Système)

**Pattern:** Single Table Inheritance (STI) avec type discriminator  
**Stratégie:** Extensive use de JSON fields pour flexibilité

```sql
CREATE TABLE articles (
    -- =====================================
    -- 1. IDENTITY & ROUTING
    -- =====================================
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL DEFAULT 'article' CHECK (type IN (
        'article', 'recipe', 'roundup'
    )),
    locale TEXT DEFAULT 'en',
    
    -- =====================================
    -- 2. RELATIONSHIPS
    -- =====================================
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    author_id INTEGER NOT NULL REFERENCES authors(id) ON DELETE RESTRICT,
    parent_article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
    
    -- =====================================
    -- 3. DISPLAY METADATA
    -- =====================================
    headline TEXT NOT NULL,              -- H1 / Titre recette
    subtitle TEXT,                       -- Sous-titre optionnel
    short_description TEXT NOT NULL,     -- Meta + cards
    excerpt TEXT,                        -- Newsletter teaser
    introduction TEXT,                   -- Hero copy
    
    -- =====================================
    -- 4. RICH CONTENT (JSON)
    -- =====================================
    images_json TEXT DEFAULT '{}',       -- cover, thumbnail, contentImages[]
    content_json TEXT DEFAULT '[]',      -- Blocks array
    
    -- =====================================
    -- 5. TYPE-SPECIFIC DATA (JSON)
    -- =====================================
    recipe_json TEXT DEFAULT '{...}',    -- Structuré (voir détail ci-dessous)
    roundup_json TEXT DEFAULT '{...}',   -- ItemList
    
    -- =====================================
    -- 6. FAQ CACHE (JSON)
    -- =====================================
    faqs_json TEXT DEFAULT '[]',         -- Aggregated from faq_section blocks
    
    -- =====================================
    -- 7. ZERO-JOIN CACHES (JSON)
    -- =====================================
    cached_tags_json TEXT DEFAULT '[]',
    cached_category_json TEXT DEFAULT '{}',
    cached_author_json TEXT DEFAULT '{}',
    cached_equipment_json TEXT DEFAULT '[]',
    cached_rating_json TEXT DEFAULT '{}',
    cached_toc_json TEXT DEFAULT '[]',
    cached_recipe_json TEXT DEFAULT '{...}',
    cached_card_json TEXT DEFAULT '{}',
    
    -- =====================================
    -- 8. SCALAR CACHES (Indexes)
    -- =====================================
    reading_time_minutes INTEGER DEFAULT 0,
    total_time_minutes INTEGER,
    difficulty_label TEXT,
    
    -- =====================================
    -- 9. SEO (JSON)
    -- =====================================
    seo_json TEXT DEFAULT '{...}',
    jsonld_json TEXT DEFAULT '[]',       -- Pre-generated Schema.org
    
    -- =====================================
    -- 10. CONFIG & WORKFLOW
    -- =====================================
    config_json TEXT DEFAULT '{...}',
    workflow_status TEXT DEFAULT 'draft' CHECK (workflow_status IN (
        'draft', 'in_review', 'scheduled', 'published', 'archived'
    )),
    scheduled_at DATETIME,
    
    -- =====================================
    -- 11. SYSTEM & ACCESS
    -- =====================================
    is_online BOOLEAN DEFAULT 0,
    is_favorite BOOLEAN DEFAULT 0,
    access_level INTEGER DEFAULT 0,      -- 0=public, 1=members, 2=premium
    view_count INTEGER DEFAULT 0,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME DEFAULT NULL
);
```

#### Détail: Schema `recipe_json`

```json
{
  "prep": null,                    // minutes (numeric)
  "cook": null,                    // minutes
  "total": null,                   // minutes
  
  "servings": null,                // numeric
  "recipeYield": null,             // string display "Makes 12 cookies"
  
  "recipeCategory": null,          // "Dessert"
  "recipeCuisine": null,           // "Italian"
  "keywords": [],
  "suitableForDiet": [],           // ["VeganDiet", "GlutenFreeDiet"]
  
  "difficulty": null,              // "Easy" | "Medium" | "Hard"
  "cookingMethod": null,
  "estimatedCost": null,
  
  // Ingrédients structurés
  "ingredients": [
    {
      "group_title": "Dough",
      "items": [
        {
          "id": "dough-flour",
          "amount": 315.0,           // FLOAT for scaling
          "unit": "grams",
          "name": "all-purpose flour",
          "notes": "sifted",
          "isOptional": false,
          "substitutes": [
            { "name": "whole wheat flour", "ratio": "1:1", "notes": "denser" }
          ]
        }
      ]
    }
  ],
  
  // Instructions avec timers
  "instructions": [
    {
      "section_title": "Make the dough",
      "steps": [
        {
          "name": "Mix dry ingredients",
          "text": "Whisk flour and sugar together.",
          "image": null,
          "timer": null           // seconds ou null
        },
        {
          "name": "Bake",
          "text": "Bake until golden.",
          "image": null,
          "timer": 1200           // 20 minutes
        }
      ]
    }
  ],
  
  "tips": ["Let dough rest 10 min..."],
  
  "nutrition": {
    "calories": 320,
    "fatContent": "15g",
    "carbohydrateContent": "40g",
    "proteinContent": "4g",
    "servingSize": "1 biscuit (80g)"
  },
  
  "aggregateRating": {
    "ratingValue": 4.8,
    "ratingCount": 55
  },
  
  // Références vers table equipment
  "equipment": [
    { "equipment_id": 1, "required": true },
    { "equipment_id": 5, "required": false, "notes": "or use hand mixer" }
  ],
  
  "video": {
    "url": "https://...",
    "name": "How to Make...",
    "duration": "PT2M30S"
  }
}
```

#### Détail: Schema `content_json` (Block System)

Les blocs sont stockés comme un array JSON plat avec discriminant `type`:

```json
[
  { "type": "heading", "level": 2, "text": "Ingredients" },
  { 
    "type": "paragraph", 
    "text": "These **delicious** biscuits require..." 
  },
  {
    "type": "image",
    "media_id": 123,
    "alt": "Lemon biscuits on cooling rack",
    "caption": "Fresh out of the oven",
    "variants": { "lg": {...}, "md": {...} }
  },
  {
    "type": "faq_section",
    "title": "Common Questions",
    "items": [
      { "q": "Can I freeze the dough?", "a": "Yes, up to 3 months..." }
    ]
  }
]
```

**Block Types Supportés (20+):**
- **Text:** paragraph, heading, blockquote, list
- **Media:** image, video, before_after
- **Callouts:** tip_box
- **Embeds:** embed (instagram, pinterest), recipe_card, product_card
- **Layout:** divider, spacer, ad_slot, table
- **Food Blog:** ingredient_spotlight, faq_section, related_content

---

### 8. `articles_to_tags` - Relation Many-to-Many

```sql
CREATE TABLE articles_to_tags (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);
CREATE INDEX idx_tag_to_article ON articles_to_tags(tag_id);
```

**Liens avec Content:**
- Maintient la relation article ↔ tags
- Déclenche la mise à jour de `cached_tags_json`

---

### 9. `idx_articles_search` - Full-Text Search (FTS5)

**Pattern:** Virtual Table SQLite FTS5  
**Stratégie:** Content synchronization via triggers

```sql
CREATE VIRTUAL TABLE idx_articles_search USING fts5(
    headline,
    subtitle,
    short_description,
    body_content,        -- Flattened from content_json + recipe_json
    tag_labels,          -- "Vegan Gluten-Free Quick"
    author_name,         -- From cached_author_json
    category_name,       -- From cached_category_json
    content='articles',
    content_rowid='id'
);
```

**Trigger de Sync:**
```sql
CREATE TRIGGER trg_articles_search_ai 
AFTER INSERT ON articles 
BEGIN
  INSERT INTO idx_articles_search(
    rowid, headline, subtitle, short_description, body_content,
    tag_labels, author_name, category_name
  )
  VALUES (
    NEW.id, 
    NEW.headline, 
    NEW.subtitle, 
    NEW.short_description, 
    (
      -- Extract plain text from content_json
      SELECT GROUP_CONCAT(txt, ' ') FROM (
        SELECT json_extract(value, '$.text') as txt 
        FROM json_each(NEW.content_json) 
        WHERE json_extract(value, '$.text') IS NOT NULL
        
        UNION ALL
        
        -- Extract from recipe_json ingredients
        SELECT json_extract(i.value, '$.name') 
        FROM json_each(json_extract(NEW.recipe_json, '$.ingredients')) AS g,
             json_each(json_extract(g.value, '$.items')) AS i
      )
    ),
    json_extract(NEW.cached_tags_json, '$'),  -- ["Vegan", "Gluten-Free"]
    json_extract(NEW.cached_author_json, '$.name'),
    json_extract(NEW.cached_category_json, '$.name')
  );
END;
```

**Liens avec Content:**
- Recherche full-text sur le contenu des articles
- Inclus le contenu des blocs texte
- Inclus les noms d'ingrédients

---

## 🔧 Triggers Automatiques

### 1. Auto-update `updated_at`
```sql
CREATE TRIGGER trg_articles_updated_at
AFTER UPDATE ON articles
BEGIN
  UPDATE articles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

### 2. Auto-set `published_at` (première publication)
```sql
CREATE TRIGGER trg_articles_set_published_at
AFTER UPDATE ON articles
WHEN NEW.is_online = 1 
  AND (OLD.is_online IS NULL OR OLD.is_online = 0)
  AND NEW.published_at IS NULL
BEGIN
  UPDATE articles SET published_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

### 3. Sync workflow_status avec is_online
```sql
CREATE TRIGGER trg_articles_online_workflow
AFTER UPDATE ON articles
WHEN NEW.is_online = 1 AND NEW.workflow_status != 'published'
BEGIN
  UPDATE articles SET workflow_status = 'published' WHERE id = NEW.id;
END;
```

### 4. Soft Delete Guard
```sql
CREATE TRIGGER trg_articles_prevent_delete
BEFORE DELETE ON articles
BEGIN
  UPDATE articles SET deleted_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
  SELECT RAISE(IGNORE);
END;
```

---

## 📊 Indexes Stratégiques

### Articles Indexes
```sql
-- Routing
CREATE INDEX idx_articles_slug ON articles(slug);

-- Main Feed
CREATE INDEX idx_articles_feed ON articles(is_online, published_at DESC);

-- Relations
CREATE INDEX idx_articles_cat ON articles(category_id);
CREATE INDEX idx_articles_author ON articles(author_id);
CREATE INDEX idx_articles_parent ON articles(parent_article_id);

-- Workflow
CREATE INDEX idx_articles_workflow ON articles(workflow_status);

-- Recipe Filters
CREATE INDEX idx_articles_total_time ON articles(total_time_minutes);
CREATE INDEX idx_articles_difficulty ON articles(difficulty_label);

-- Soft Delete
CREATE INDEX idx_articles_active ON articles(deleted_at);
```

---

## 💡 Patterns Clés Identifiés

### 1. **Zero-Join Rendering Pattern**

Toutes les données nécessaires à l'affichage sont pré-calculées:

```sql
-- Au lieu de:
SELECT a.*, c.label as category_name, c.slug as category_slug
FROM articles a
JOIN categories c ON a.category_id = c.id
WHERE a.id = 123;

-- On fait:
SELECT * FROM articles WHERE id = 123;
-- + utilise cached_category_json: {"name": "...", "slug": "...", "icon_svg": "..."}
```

**Avantages:**
- Une seule requête pour tout l'article
- Pas de N+1 queries
- Parfait pour edge caching

**Inconvénients:**
- Data dupliquée (normalisée + dénormalisée)
- Besoin de rebuild les caches quand relations changent

### 2. **JSON Check Constraints**

Validation au niveau DB:
```sql
images_json TEXT DEFAULT '{}' CHECK (json_valid(images_json))
```

**Limite:** SQLite ne valide pas la structure, juste que c'est du JSON valide.

### 3. **STI (Single Table Inheritance)**

Un seule table `articles` pour 3 types:
- `type='article'` → utilise `content_json`
- `type='recipe'` → utilise `content_json` + `recipe_json`
- `type='roundup'` → utilise `content_json` + `roundup_json`

**Avantages:**
- Une seule table pour toutes les requêtes
- Pas de JOINs complexes
- Facile d'ajouter un nouveau type

### 4. **Content Synchronization Pattern**

FTS5 virtual table synchronisée via triggers:
- INSERT → ajoute à l'index
- UPDATE → met à jour l'index
- DELETE → supprime de l'index

---

## ⚠️ Points de Douleur du Schéma

### 1. **Complexité JSON**

Beaucoup de champs JSON avec structures complexes:
- `recipe_json` a 15+ champs imbriqués
- `content_json` est un array de blocs polymorphes
- 8 champs `cached_*_json` différents

**Risque:** Difficile à maintenir, pas de validation structurelle au niveau DB.

### 2. **Rebuild Cache Obligatoire**

Quand on modifie une catégorie:
```sql
-- Il faut mettre à jour tous les articles de cette catégorie!
UPDATE articles 
SET cached_category_json = '{...}'
WHERE category_id = 123;
```

**Coût:** O(n) où n = nombre d'articles dans la catégorie.

### 3. **Pas de Validation Structurelle**

```sql
-- Ce JSON est valide pour SQLite:
recipe_json = '{"invalid": "structure"}'
-- Mais va casser l'application!
```

**Solution nécessaire:** Validation Zod côté application.

### 4. **Media Variants Couplage**

Les URLs des images sont stockées en dur dans `variants_json`:
```json
{
  "variants": {
    "lg": { "url": "https://cdn.example.com/...", "r2_key": "..." }
  }
}
```

**Problème:** Si on change de CDN, il faut updater toutes les lignes.

### 5. **FTS5 Maintenance**

Les triggers FTS5 sont complexes et fragiles:
- Extraction de texte depuis JSON imbriqué
- Doit être mis à jour quand le schema JSON change

---

## 🎯 Recommandations pour la Refonte

### 1. **Schema Registry**

Créer une source unique de vérité pour les schemas JSON:

```typescript
// schemas/content.schema.ts
export const RecipeJsonSchema = z.object({
  prep: z.number().nullable(),
  cook: z.number().nullable(),
  // ... tout le schema
});

// Générer:
// - Types TypeScript
// - Validation runtime
// - Documentation
// - Migration helpers
```

### 2. **Cache Rebuild Automation**

```typescript
// services/cache.service.ts
async function rebuildArticleCache(articleId: number) {
  const article = await getArticle(articleId);
  
  // Rebuild tous les caches
  await Promise.all([
    rebuildTocCache(article),
    rebuildAuthorCache(article),
    rebuildCategoryCache(article),
    rebuildEquipmentCache(article),
    rebuildRecipeCache(article),
    rebuildCardCache(article),
    rebuildJsonLd(article),
  ]);
}

// Trigger via D1 trigger ou webhook
```

### 3. **Media URL Decoupling**

Stocker seulement les r2_key, pas les URLs:
```json
{
  "variants": {
    "lg": { "r2_key": "2025/03/image-lg.webp", "width": 2048 }
  }
}
```

Les URLs sont générées à la volée avec un helper:
```typescript
function getImageUrl(r2Key: string): string {
  return `${CDN_BASE_URL}/${r2Key}`;
}
```

### 4. **Content Versioning**

Ajouter une table d'historique:
```sql
CREATE TABLE article_revisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER REFERENCES articles(id),
    content_json TEXT,
    recipe_json TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 5. **Block Schema Validation**

Validation stricte des blocs:
```typescript
const ContentBlockSchema = z.discriminatedUnion('type', [
  ParagraphBlockSchema,
  HeadingBlockSchema,
  ImageBlockSchema,
  // ...
]);

// Utiliser dans l'API:
const result = ContentBlockSchema.safeParse(block);
if (!result.success) {
  return { error: 'Invalid block structure' };
}
```

---

## 📁 Structure de Fichiers Proposée

```
db/
├── schema.sql                    # Schéma actuel (maintenu)
├── migrations/
│   ├── 001_initial.sql
│   └── 002_add_workflow.sql
└── seeds/
    └── default_data.sql

src/modules/content/
├── schemas/
│   ├── blocks.schema.ts          # Zod schemas pour tous les blocs
│   ├── recipe.schema.ts          # RecipeJson schema
│   ├── article.schema.ts         # Drizzle schema
│   └── cache.schema.ts           # Cached fields schemas
├── types/
│   └── index.ts                  # Types auto-générés depuis Zod
├── services/
│   ├── article.service.ts        # CRUD + cache rebuild
│   ├── cache.service.ts          # Cache management
│   └── search.service.ts         # FTS operations
└── validators/
    └── content.validator.ts      # Validation runtime
```

---

Ce schéma est **très bien conçu** mais complexe. La refonte doit:
1. Préserver les patterns performants (zero-join, STI)
2. Ajouter la validation runtime (Zod)
3. Automatiser le cache rebuild
4. Découpler les URLs média
5. Ajouter le versioning
