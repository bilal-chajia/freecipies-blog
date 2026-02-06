# Analyse Profonde du Module Content

> **Date:** 2026-02-05  
> **Module:** `src/modules/articles/` + `src/admin/pages/articles/`  
> **Type:** Architecture & Workflow Analysis  

---

## 📋 Vue d'Ensemble

Le module Content est le **cœur du CMS**, gérant trois types de contenu polymorphes :
- **Articles** (`type: 'article'`) - Contenu éditorial standard
- **Recipes** (`type: 'recipe'`) - Recettes avec JSON structuré
- **Roundups** (`type: 'roundup'`) - Listes curatées

### Architecture Clé

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTENT MODULE                           │
├─────────────────────────────────────────────────────────────┤
│  Database Layer (D1 + Drizzle)                              │
│  ├── Table: articles (polymorphe)                          │
│  ├── Table: articles_to_tags (relations many-to-many)      │
│  └── JSON Fields: contentJson, recipeJson, roundupJson     │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                              │
│  ├── articles.service.ts (CRUD + queries)                  │
│  └── Hydration utils (zero-join caching)                   │
├─────────────────────────────────────────────────────────────┤
│  Editor Layer (React)                                       │
│  ├── Gutenberg Editors (Block-based)                       │
│  │   ├── GutenbergRecipeEditor.jsx                         │
│  │   ├── GutenbergArticleEditor.jsx                        │
│   │   └── GutenbergRoundupEditor.jsx                       │
│  ├── Legacy Editors (Form-based)                           │
│  │   ├── RecipeEditor.jsx                                  │
│  │   └── ArticleEditor.jsx                                 │
│  └── Shared: useContentEditor hook                         │
├─────────────────────────────────────────────────────────────┤
│  Block System (BlockNote-based)                            │
│  ├── Core Blocks: Text, Heading, Lists, Images             │
│  ├── Custom Blocks: RecipeEmbed, FAQ, Before/After         │
│  └── Slash Menu Extensions                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Schéma de Données

### Table `articles` (Polymorphe)

```typescript
// Champs communs à tous les types
{
  id: number (auto-increment)
  slug: string (unique, URL-friendly)
  type: 'article' | 'recipe' | 'roundup'
  locale: string (default: 'en')
  
  // Relations
  categoryId: number → categories.id
  authorId: number → authors.id
  parentArticleId: number? (hierachy)
  
  // Métadonnées d'affichage
  headline: string (titre H1)
  subtitle: string? (sous-titre)
  shortDescription: string (meta/description)
  excerpt: string? (résumé court)
  introduction: string? (intro longue)
  
  // Contenu JSON (polymorphe)
  imagesJson: string? (ImageSlot[])
  contentJson: string? (ContentBlock[])
  recipeJson: string? (RecipeJson - uniquement recipes)
  roundupJson: string? (RoundupJson - uniquement roundups)
  faqsJson: string? (FAQItem[])
  
  // Champs dénormalisés/cached (Zero-Join Pattern)
  cachedTagsJson: string? (["tag1", "tag2"])
  cachedCategoryJson: string?
  cachedAuthorJson: string?
  cachedEquipmentJson: string?
  cachedCommentCount: number
  cachedRatingJson: string?
  cachedTocJson: string? (Table of Contents)
  cachedRecipeJson: string? (version simplifiée)
  cachedCardJson: string?
  readingTimeMinutes: number?
  
  // Index scalars (pour filtres rapides)
  totalTimeMinutes: number?
  difficultyLabel: string?
  
  // SEO
  seoJson: string?
  jsonldJson: string? (Schema.org)
  configJson: string? (config spécifique)
  
  // Workflow
  workflowStatus: 'draft' | 'pending' | 'published' | 'archived'
  scheduledAt: string? (ISO date)
  
  // Système
  isOnline: boolean (publication)
  isFavorite: boolean (highlight)
  accessLevel: number (0=public, 1=members, etc.)
  viewCount: number
  publishedAt: string?
  createdAt: string
  updatedAt: string
  deletedAt: string? (soft delete)
}
```

### Types de Contenu Détaillés

#### 1. ArticleContent (`type: 'article'`)
```typescript
interface ArticleContent {
  type: 'article'
  contentJson: ContentBlock[]  // Blocks Gutenberg
  // Pas de recipeJson ni roundupJson
}
```

#### 2. RecipeContent (`type: 'recipe'`)
```typescript
interface RecipeContent {
  type: 'recipe'
  contentJson: ContentBlock[]  // Introduction + contexte
  recipeJson: {
    // Temps
    prep: number?        // minutes
    cook: number?        // minutes
    total: number?       // minutes
    
    // Portions
    servings: number?
    recipeYield: string? // ex: "8 cupcakes"
    
    // Métadonnées
    recipeCategory: string?
    recipeCuisine: string?
    difficulty: 'Easy' | 'Medium' | 'Hard'
    cookingMethod: string?
    keywords: string[]
    suitableForDiet: ('VeganDiet' | 'VegetarianDiet' | ...)[]
    
    // Ingrédients structurés
    ingredients: [{
      group_title: string        // ex: "For the cake"
      items: [{
        name: string             // ex: "Flour"
        amount: number | string  // ex: 2.5 ou "2 1/2"
        unit: string             // ex: "cups"
        notes: string?           // ex: "sifted"
      }]
    }]
    
    // Instructions structurées
    instructions: [{
      section_title: string      // ex: "Make the batter"
      steps: [{
        text: string
        image?: ImageSlot
        duration?: number        // minutes
      }]
    }]
    
    // Conseils
    tips: string[]
    
    // Nutrition (par portion)
    nutrition: {
      calories: string?          // "200 kcal"
      fatContent: string?
      proteinContent: string?
      carbohydrateContent: string?
      // ... autres valeurs Schema.org
    }
    
    // Évaluation
    aggregateRating: {
      ratingValue: number?       // 4.5
      ratingCount: number        // 128
    }
  }
}
```

#### 3. RoundupContent (`type: 'roundup'`)
```typescript
interface RoundupContent {
  type: 'roundup'
  contentJson: ContentBlock[]  // Intro + conclusion
  roundupJson: {
    listType: 'ItemList'
    items: [{
      position: number
      article_id: number          // Référence interne
      headline: string            // Titre affiché
      description: string         // Description perso
      cover?: ImageSlot           // Image override
      original_source?: string    // Si externe
      is_featured: boolean        // Mise en avant
    }]
  }
}
```

---

## 🧩 Système de Blocs (Content Blocks)

### Architecture BlockNote

Le système utilise **BlockNote** (éditeur block-based inspiré de Notion/WordPress Gutenberg) avec un schéma personnalisé.

```typescript
// Schéma BlockNote Custom
const schema = BlockNoteSchema.create({
  blockSpecs: {
    // Blocks natifs
    ...defaultBlockSpecs,  // paragraph, heading, listItem, etc.
    
    // Custom blocks food blog
    alert: Alert(),                    // Tip/Warning/Info boxes
    video: VideoBlock(),               // YouTube/Vimeo embed
    customImage: ImageBlock(),         // Images avancées
    faqSection: FAQSectionBlock(),     // FAQ Schema.org
    divider: DividerBlock(),           // Séparateur
    recipeEmbed: RecipeEmbedBlock(),   // Embed autre recette
    mainRecipe: MainRecipeBlock(),     // Recipe card inline
    roundupList: RoundupListBlock(),   // Liste articles
    relatedContent: RelatedContentBlock(), // Recommandations
    simpleTable: TableBlock(),         // Tableaux
    beforeAfter: BeforeAfterBlock(),   // Comparateur images
  }
});
```

### Types de Blocs Disponibles

#### 1. Text Blocks (Natifs)
| Block | Type | Description |
|-------|------|-------------|
| `paragraph` | Native | Texte simple avec markdown |
| `heading` | Native | H2-H6 (H1 réservé au titre) |
| `blockquote` | Native | Citations |
| `list` | Native | Ordonnée/désordonnée/checklist |

#### 2. Media Blocks
| Block | Props | Description |
|-------|-------|-------------|
| `customImage` | `media_id`, `alt`, `caption`, `credit` | Images responsive |
| `video` | `provider`, `videoId`, `aspectRatio` | YouTube/Vimeo |
| `beforeAfter` | `before`, `after`, `layout` | Comparateur visuel |

#### 3. Food Blog Blocks
| Block | Props | Description |
|-------|-------|-------------|
| `alert` | `variant`, `title`, `text` | Tip/Warning/Info/Note |
| `recipeEmbed` | `article_id` | Carte recette liée |
| `mainRecipe` | Contexte | Recipe card complète |
| `relatedContent` | `mode`, `limit`, `layout` | Recommandations |
| `faqSection` | `title`, `items[]` | FAQ Schema.org |
| `ingredientSpotlight` | `name`, `description`, `image` | Ingrédient vedette |

#### 4. Layout Blocks
| Block | Props | Description |
|-------|-------|-------------|
| `divider` | - | Ligne horizontale |
| `spacer` | `size` | Espacement vertical |
| `adSlot` | `variant` | Emplacement publicitaire |
| `simpleTable` | `headers`, `rows` | Tableau simple |

### Slash Menu (Commandes /)

```
/Food Blog
  ├── Alert Box        → Tip/Warning/Info
  ├── Embed Recipe     → Lien vers recette
  ├── Related Content  → Recommandations
  └── Before/After     → Comparaison images

/Layout
  ├── Table            → Tableau de données
  └── Divider          → Séparateur
```

---

## 🔄 Workflow de Publication

### Statuts de Workflow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  DRAFT   │────→│ PENDING  │────→│PUBLISHED │────→│ ARCHIVED │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
      │                               ↑
      │                               │
      └───────────────────────────────┘
           (Publish directly)
```

| Statut | Description | Visible public |
|--------|-------------|----------------|
| `draft` | En cours d'édition | ❌ |
| `pending` | En attente de validation | ❌ |
| `published` | Publié | ✅ (si `isOnline: true`) |
| `archived` | Archivé | ❌ |

### Flux de Publication Complet

```typescript
// 1. Création (Auto-save)
POST /api/articles
{
  type: 'recipe',
  headline: 'Chocolate Cake',
  slug: 'chocolate-cake',
  workflowStatus: 'draft',
  isOnline: false
}
// → ID généré, brouillon créé

// 2. Édition (Gutenberg)
// Auto-save toutes les 30s
// Stockage local + serveur

// 3. Pré-publication
PATCH /api/articles/:id
{
  workflowStatus: 'pending',  // Optional: workflow validation
  isOnline: false             // Preview mode
}

// 4. Publication
PATCH /api/admin/articles/:id?action=toggle-online
// ou
PATCH /api/articles/:id
{
  workflowStatus: 'published',
  isOnline: true,
  publishedAt: '2026-02-05T12:00:00Z'
}

// 5. Mise à jour cache
// → Regénération cached*Json
// → Invalidation CDN
// → Ping sitemap
```

### Publication Programmée

```typescript
// Schedule pour plus tard
PATCH /api/articles/:id
{
  workflowStatus: 'draft',
  scheduledAt: '2026-02-14T09:00:00Z'
}

// Cron job (Cloudflare Workers Cron)
// Toutes les minutes:
// SELECT * FROM articles 
// WHERE scheduledAt <= NOW() 
//   AND workflowStatus = 'draft'
//   AND isOnline = false
// → Auto-publish
```

---

## 🎨 Architecture des Éditeurs

### 1. Gutenberg Editors (Modernes)

#### Layout 3-Panneaux

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: Title Input + Actions (Save/Preview/Publish)            │
├──────────┬──────────────────────────────────────┬───────────────┤
│          │                                      │               │
│ Block    │    CANVAS (Content)                  │   Settings    │
│ Inserter │    ─────────────────────             │   Sidebar     │
│ (+)      │                                      │               │
│          │    Title: [Input]                    │   ▸ Status    │
│ ┌──────┐ │                                      │   ▸ Category  │
│ │Text  │ │    [Recipe Builder]                  │   ▸ Author    │
│ │Image │ │    - Ingredients                     │   ▸ Tags      │
│ │Video │ │    - Instructions                    │   ▸ Media     │
│ │FAQ   │ │                                      │   ▸ SEO       │
│ └──────┘ │    [Block Editor]                    │   ▸ Excerpt   │
│          │    - Paragraph                       │               │
│          │    - Heading                         │               │
│          │    - Tip Box                         │               │
│          │    - Related Content                 │               │
│          │                                      │               │
└──────────┴──────────────────────────────────────┴───────────────┘
```

#### Composants Clés

| Composant | Fichier | Rôle |
|-----------|---------|------|
| `GutenbergRecipeEditor` | `pages/articles/` | Éditeur recette complet |
| `BlockInserter` | `BlockEditor/components/` | Palette de blocs (+) |
| `SettingsSidebar` | `BlockEditor/components/` | Panneau droit configurable |
| `DocumentSettings` | `BlockEditor/components/` | Sections rétractables |
| `BlockSettings` | `BlockEditor/components/` | Config bloc sélectionné |
| `TitleInput` | `BlockEditor/components/` | Titre H1 en haut du canvas |

### 2. RecipeBuilder

Système de construction de recettes **séparé du block editor** mais intégré.

```typescript
// RecipeBuilder.jsx
// Gestion du recipeJson avec UI dédiée

Sections:
├── AI Generation (Génération par prompt)
├── Temps (Prep/Cook/Total)
├── Portions (Servings/Yield)
├── Métadonnées (Catégorie/Cuisine/Difficulté)
├── Ingrédients (Groupés + structurés)
│   └── Groupe: "For the cake"
│       └── Item: {name, amount, unit, notes}
├── Instructions (Groupées + étapes)
│   └── Section: "Make the batter"
│       └── Step: {text, image, duration}
├── Nutrition (Facts label)
└── JSON Mode (Édition raw)
```

### 3. Legacy Editors

Éditeurs formulaire classiques (à déprécier) :
- `ArticleEditor.jsx` - Articles basiques
- `RecipeEditor.jsx` - Recettes (form complet)
- `RoundupEditor.jsx` - Roundups

---

## 🪝 Hook useContentEditor

### Responsabilités

```typescript
// Hook partagé pour tous les éditeurs
function useContentEditor({ slug, contentType }) {
  // États
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({...}); // Champs formulaire
  const [contentJson, setContentJson] = useState('[]');
  const [recipeJson, setRecipeJson] = useState('{}');
  const [roundupJson, setRoundupJson] = useState('{}');
  const [faqsJson, setFaqsJson] = useState('[]');
  const [jsonErrors, setJsonErrors] = useState({});
  
  // Données référentielles
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [tags, setTags] = useState([]);
  
  // Dialogues
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  
  // Méthodes
  const handleInputChange = (field, value) => {...};
  const handleSave = async () => {...};
  const validateJSON = () => {...};
  const openMediaDialog = (field) => {...};
  
  // Effets
  useEffect(() => { loadCategories(); loadAuthors(); loadTags(); }, []);
  useEffect(() => { if (slug) loadContent(); }, [slug]);
  
  return {
    loading, saving, formData, contentJson, recipeJson, 
    categories, authors, tags, handleSave, ...
  };
}
```

### Pattern Safe JSON Parse

```typescript
// Gestion des doubles/triples encodages
const safeParse = (data, fallback) => {
  if (typeof data === 'object') return data;
  
  let parsed = data;
  for (let i = 0; i < 3; i++) {
    try {
      const result = JSON.parse(parsed);
      if (typeof result === 'object') return result;
      parsed = result;
    } catch { break; }
  }
  return typeof parsed === 'object' ? parsed : fallback;
};
```

---

## 🚀 Points d'Extension

### 1. Nouveaux Blocs

Pour ajouter un bloc personnalisé :

```typescript
// 1. Créer le composant bloc
// src/admin/components/BlockEditor/blocks/MyBlock.jsx

export const MyBlock = () => ({
  type: 'myBlock',
  propSchema: {
    title: { default: '' },
    content: { default: '' },
  },
  content: 'none', // ou 'inline' | 'table'
  
  render: ({ block, editor }) => (
    <MyBlockComponent 
      title={block.props.title}
      content={block.props.content}
      onChange={(newProps) => editor.updateBlock(block, newProps)}
    />
  ),
});

// 2. Ajouter au schéma
import { MyBlock } from './blocks/MyBlock';
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    myBlock: MyBlock(),
  },
});

// 3. Ajouter au slash menu
const items = [
  {
    title: 'My Block',
    onItemClick: () => editor.insertBlocks(
      [{ type: 'myBlock' }], 
      editor.getTextCursorPosition().block, 
      'after'
    ),
    aliases: ['my', 'custom'],
    group: 'Custom',
  },
];
```

### 2. Nouveaux Types de Contenu

Pour ajouter un type (ex: `video`) :

```typescript
// 1. Mettre à jour le schéma DB
// Ajouter videoJson column

// 2. Types TypeScript
interface VideoContent extends BaseContent {
  type: 'video';
  videoJson: {
    youtubeId: string;
    transcript: string;
    chapters: [...];
  };
}

// 3. Créer l'éditeur
// GutenbergVideoEditor.jsx

// 4. Mettre à jour les helpers
// hydrateArticle(), isValidContentType(), etc.
```

---

## 📊 Points de Douleur Identifiés

### 1. Gestion JSON Complexe

**Problème:** Triple-encodage possible des JSON fields
```
DB: "{\"key\": \"value\"}"  // string
→ Parse 1: {"key": "value"}  // object ✓
→ Parse 2: [object Object]     // fail
```

**Solution actuelle:** `safeParse()` avec 3 niveaux max

### 2. Synchronisation État

**Problème:** 
- FormData vs JSON strings (Monaco)
- RecipeBuilder vs recipeJson
- BlockNote editor vs contentJson

**Risque:** Désynchronisation, perte de données

### 3. Cache Invalidation

**Problème:** Champs `cached*Json` doivent être regénérés à chaque save
- cachedTocJson (extrait des headings)
- cachedRecipeJson (version simplifiée)
- cachedTagsJson (denormalisé)

**Coût:** Calculs synchrones au save

### 4. Double Système Éditeurs

**Problème:** 
- Gutenberg (neuf, BlockNote)
- Legacy (ancien, form-based)

**Dette:** Maintenance doublée, confusion UX

### 5. Workflow Simple

**Problème:** 
- Pas de validation par rôles
- Pas d'étape "review" avant publish
- Pas de scheduling avancé (A/B, segments)

---

## 💡 Opportunités d'Amélioration

### High Priority

1. **Unified Editor** - Migrer tout vers Gutenberg, déprécier legacy
2. **Real-time Collaboration** - Operational Transforms (Yjs + BlockNote)
3. **Version History** - Snapshots des JSON à chaque save
4. **Workflow Engine** - Règles: "Editor → Reviewer → Publisher"

### Medium Priority

5. **Block Templates** - Layouts préconfigurés (ex: "Recipe Classique")
6. **AI Assistant Inline** - Suggestions dans BlockNote (Notion AI style)
7. **Content Relationships** - Graph des liens article ↔ recette
8. **Bulk Operations** - Edit multiple articles (tags, status)

### Low Priority

9. **Import/Export** - WordPress XML, Markdown
10. **Content Scheduling** - Date + heure + timezone
11. **A/B Testing** - Variantes de titres/images
12. **Content Analytics** - Temps lecture, scroll depth

---

## 🔗 Intégrations Clés

### Avec Settings

| Feature | Setting Key | Utilisation |
|---------|-------------|-------------|
| Recipe Defaults | `recipe_defaults` | Valeurs par défaut RecipeBuilder |
| Editor Config | `editor_config` | Blocs autorisés, shortcuts |
| SEO | `seo_config` | Title template, defaults |
| Affiliate | `affiliate_config` | Links auto-conversion |

### Avec AI Module

| Feature | Endpoint | Usage |
|---------|----------|-------|
| Recipe Generation | `/api/admin/ai/generate` | Génère recipeJson depuis prompt |
| Content Improvement | Inline | Reformule blocs sélectionnés |
| Meta Generation | Auto | Génère title/description SEO |

### Avec Pinterest

| Feature | Flux | Description |
|---------|------|-------------|
| Auto-Pin | `article.published` → Pinterest API | Crée pin lors publication |
| Pin Templates | Template store | Designs pour recettes |

### Avec Media

| Feature | Relation | Description |
|---------|----------|-------------|
| Image Blocks | Media ID → R2 | Référence images uploadées |
| Featured Image | `imagesJson.cover` | Image principale recette |
| Gallery | Block `customImage` × N | Collection images |

---

## 📁 Fichiers Clés du Module

```
src/
├── modules/articles/
│   ├── schema/
│   │   ├── articles.schema.ts           # Table principale
│   │   └── articles-to-tags.schema.ts   # Junction table
│   ├── types/
│   │   ├── articles.types.ts            # Types polymorphes
│   │   ├── content-blocks.types.ts      # 20+ blocs
│   │   ├── recipes.types.ts             # RecipeJson structure
│   │   ├── roundups.types.ts            # RoundupJson structure
│   │   └── images.types.ts              # ImageSlot, variants
│   ├── services/
│   │   └── articles.service.ts          # CRUD + queries
│   └── api/
│       └── helpers.ts                   # Hydration, filtres
│
├── admin/pages/articles/
│   ├── GutenbergRecipeEditor.jsx        # Éditeur principal
│   ├── GutenbergArticleEditor.jsx       # Éditeur articles
│   ├── GutenbergRoundupEditor.jsx       # Éditeur roundups
│   ├── shared/
│   │   ├── useContentEditor.js          # Hook partagé
│   │   └── EditorLayout.jsx             # Layout wrapper
│   └── [Legacy Editors...]
│
├── admin/components/BlockEditor/
│   ├── index.jsx                        # Composant principal
│   ├── blocks/                          # 12+ blocs custom
│   │   ├── ImageBlock.jsx
│   │   ├── RecipeEmbedBlock.jsx
│   │   ├── FAQSectionBlock.jsx
│   │   └── ...
│   ├── components/
│   │   ├── BlockInserter.jsx            # Palette blocs
│   │   ├── SettingsSidebar.jsx          # Panneau droit
│   │   ├── DocumentSettings.jsx         # Status/SEO/Tags
│   │   └── GutenbergEditorMain.jsx      # Canvas principal
│   └── utils/
│       └── insert-block.js              # Helpers manipulation
│
└── admin/components/
    ├── RecipeBuilder.jsx                # Builder recipeJson
    ├── ArticlePreview/                  # Preview live
    └── MediaDialog.jsx                  # Sélection media
```

---

## ✅ Résumé Exécutif

Le module Content est une architecture **sophistiquée et mature** :

| Aspect | Évaluation |
|--------|------------|
| **Architecture** | ⭐⭐⭐⭐⭐ Polymorphe, bien structurée |
| **Éditeur** | ⭐⭐⭐⭐☆ BlockNote moderne, mais double système |
| **Workflow** | ⭐⭐⭐☆☆ Basique, besoin validation/rôles |
| **Performance** | ⭐⭐⭐⭐☆ Zero-join caching, mais invalidation manuelle |
| **Extensibilité** | ⭐⭐⭐⭐⭐ Schema facilement extensible |

**Forces:**
- ✅ Système de blocs flexible (BlockNote)
- ✅ Données structurées (recipes)
- ✅ Caching intelligent (zero-join)
- ✅ Polymorphisme (3 types contenu)

**Faiblesses:**
- ⚠️ Double système éditeurs (legacy + Gutenberg)
- ⚠️ Workflow trop simple
- ⚠️ Gestion JSON complexe (risque encodage)
- ⚠️ Pas de versionning

**Recommandations:**
1. Migrer 100% vers Gutenberg (déprécier legacy)
2. Implémenter workflow validation (Settings)
3. Ajouter version history (DB + UI)
4. Unifier gestion JSON (validation stricte)
