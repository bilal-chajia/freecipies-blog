# Sections Additionnelles au Plan Settings CMS

> **Date:** 2026-02-05  
> **Status:** Planning - Complément au plan principal  

---

## 🔗 Connexions avec les Autres Modules

Après analyse approfondie du codebase, voici les sections qui manquent et qui ont des liens directs avec les modules existants.

---

## 1️⃣ Homepage Builder Integration

### Module lié: `src/admin/pages/homepage/`

Le homepage builder existe déjà mais est **séparé** des settings. Il faut l'intégrer ou créer un lien.

```typescript
interface HomepageSettings {
  // Section: Hero
  hero: {
    enabled: boolean;
    title: string;
    subtitle: string;
    backgroundType: 'image' | 'video' | 'color' | 'gradient';
    backgroundImage: string;
    backgroundColor: string;
    ctaText: string;
    ctaLink: string;
    showSearch: boolean;
    height: 'full' | 'large' | 'medium' | 'small';
    overlay: {
      enabled: boolean;
      opacity: number;
      color: string;
    };
  };

  // Section: Featured Posts
  featured: {
    enabled: boolean;
    title: string;
    subtitle: string;
    source: 'manual' | 'latest' | 'popular' | 'category';
    manualSelection: number[]; // Article IDs
    categoryFilter: string;
    maxPosts: number;
    layout: 'grid' | 'carousel' | 'masonry';
    columns: 2 | 3 | 4;
  };

  // Section: Categories Showcase
  categories: {
    enabled: boolean;
    title: string;
    displayType: 'grid' | 'list' | 'carousel';
    selection: 'all' | 'featured' | 'custom';
    customCategories: string[];
    maxCategories: number;
    showPostCount: boolean;
    showDescription: boolean;
    showImages: boolean;
  };

  // Section: Latest Posts
  latest: {
    enabled: boolean;
    title: string;
    maxPosts: number;
    layout: 'grid' | 'list';
    columns: 2 | 3 | 4;
    showExcerpt: boolean;
    showAuthor: boolean;
    showDate: boolean;
    showViews: boolean;
  };

  // Section: Popular Posts
  popular: {
    enabled: boolean;
    title: string;
    timeRange: '7d' | '30d' | '90d' | 'all';
    maxPosts: number;
    showViews: boolean;
  };

  // Section: Newsletter CTA
  newsletter: {
    enabled: boolean;
    title: string;
    subtitle: string;
    description: string;
    buttonText: string;
    placeholderText: string;
    successMessage: string;
    backgroundColor: string;
    textColor: string;
  };

  // Section: Banners/Ads
  banners: {
    banner1: BannerConfig;
    banner2: BannerConfig;
    banner3: BannerConfig;
  };

  // SEO Section
  seo: {
    title: string;
    description: string;
    ogImage: string;
  };

  // Section Order (Drag & Drop)
  sectionOrder: string[]; // ['hero', 'featured', 'categories', 'latest', 'popular', 'newsletter']
}

interface BannerConfig {
  enabled: boolean;
  title: string;
  content: string;
  image: string;
  link: string;
  position: 'hero-after' | 'categories-after' | 'latest-after' | 'footer-before';
  backgroundColor: string;
  textColor: string;
}
```

### UI Proposal
```
┌─────────────────────────────────────────────────────────────────┐
│ Homepage Builder                                   [Preview ▶]  │
├──────────────┬──────────────────────────────────────────────────┤
│              │  Section Order (Drag to reorder)                 │
│ ► Hero       │  ┌─────────────────────────────────────────────┐ │
│ ► Featured   │  │ ☰ Hero Section                              │ │
│ ► Categories │  │ ☰ Featured Posts                            │ │
│ ► Latest     │  │ ☰ Browse by Category                          │ │
│ ► Popular    │  │ ☰ Latest Posts                              │ │
│ ► Newsletter │  │ ☰ Most Popular                              │ │
│ ► Banners    │  │ ☰ Newsletter CTA                            │ │
│ ► SEO        │  └─────────────────────────────────────────────┘ │
│              │                                                  │
│              │  Hero Section Configuration                      │
│              │  [●] Enabled                                     │
│              │  Title: [Welcome to Freecipies            ]      │
│              │  Subtitle: [Discover amazing recipes...   ]      │
│              │  Background: [Image ▼] [Select Image ▼]          │
│              │  Height: [Large ▼]  Overlay: [80% ▼]             │
│              │  CTA Button: [Explore Recipes] → [/recipes]      │
│              │  [●] Show Search Bar                             │
└──────────────┴──────────────────────────────────────────────────┘
```

---

## 2️⃣ Pinterest Integration Settings

### Module lié: `src/modules/pinterest/`, `src/admin/pages/pinterest/`

```typescript
interface PinterestSettings {
  // Connection
  connection: {
    enabled: boolean;
    appId: string;
    appSecret: string; // Encrypted
    accessToken: string; // Encrypted
    refreshToken: string; // Encrypted
    connectedAccount: string;
    connectedAt: string;
  };

  // Auto-Pin Configuration
  autoPin: {
    enabled: boolean;
    defaultBoard: string;
    trigger: 'publish' | 'schedule' | 'manual';
    createMultiplePins: boolean; // Create pins for each image
    useTemplates: boolean;
    defaultTemplate: string; // Template ID
  };

  // Pin Templates
  templates: {
    enabled: boolean;
    defaultTitleTemplate: string; // "{recipeName} - {siteName}"
    defaultDescriptionTemplate: string;
    useBranding: boolean;
    brandingPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    logoOnPins: boolean;
  };

  // Rich Pins
  richPins: {
    enabled: boolean;
    type: 'article' | 'recipe';
    validateMarkup: boolean;
  };

  // Board Management
  boards: {
    autoCreate: boolean;
    namingPattern: string; // "{categoryName} Recipes"
    defaultSections: string[];
  };

  // Scheduling
  scheduling: {
    enabled: boolean;
    bestTimes: string[]; // ["09:00", "15:00", "20:00"]
    timezone: string;
    maxPinsPerDay: number;
    queueEnabled: boolean;
  };

  // Analytics
  analytics: {
    trackClicks: boolean;
    trackSaves: boolean;
    trackImpressions: boolean;
    dashboardEnabled: boolean;
  };
}
```

---

## 3️⃣ Editor / Gutenberg Configuration

### Module lié: `src/admin/components/BlockEditor/`, `GutenbergRecipeEditor.jsx`

```typescript
interface EditorSettings {
  // General Editor
  general: {
    defaultEditor: 'gutenberg' | 'classic' | 'markdown';
    autosaveInterval: number; // seconds
    enableRevisions: boolean;
    maxRevisions: number;
    distractionFree: boolean;
    spotlightMode: boolean;
    fullscreenByDefault: boolean;
  };

  // Block Settings
  blocks: {
    allowedBlocks: string[]; // Whitelist
    disabledBlocks: string[]; // Blacklist
    defaultBlocks: string[]; // Inserted on new post
    blockShortcuts: Record<string, string>; // Keyboard shortcuts
  };

  // Recipe-specific Blocks
  recipeBlocks: {
    defaultServings: number;
    defaultPrepTime: number;
    defaultCookTime: number;
    defaultDifficulty: 'easy' | 'medium' | 'hard';
    nutritionDefaults: {
      showNutrition: boolean;
      servingSize: string;
      caloriesUnit: 'kcal' | 'kj';
    };
    ingredientGroups: string[]; // ["For the cake", "For the frosting"]
    instructionGroups: string[];
  };

  // Media Integration
  media: {
    defaultImageSize: 'thumbnail' | 'medium' | 'large' | 'full';
    lazyLoadImages: boolean;
    imageLightbox: boolean;
    videoAutoplay: boolean;
    videoLazyLoad: boolean;
  };

  // AI Assistant
  aiAssistant: {
    enabled: boolean;
    defaultProvider: string;
    defaultModel: string;
    inlineSuggestions: boolean;
    contentImprovement: boolean;
    autoGenerateMeta: boolean;
    autoGenerateAlt: boolean;
  };

  // Preview Settings
  preview: {
    devices: ('desktop' | 'tablet' | 'mobile')[];
    defaultDevice: 'desktop';
    showPreviewPanel: boolean;
    livePreview: boolean;
  };

  // Custom CSS (per post type)
  customCss: {
    enabled: boolean;
    recipeCss: string;
    articleCss: string;
    roundupCss: string;
  };
}
```

---

## 4️⃣ Pin Templates Design System

### Module lié: `src/modules/templates/`

```typescript
interface PinTemplateSettings {
  // Canvas Defaults
  canvas: {
    defaultWidth: number; // 1000
    defaultHeight: number; // 1500 (2:3 ratio)
    defaultBackground: string;
    gridEnabled: boolean;
    gridSize: number;
    snapToGrid: boolean;
    snapToElements: boolean;
  };

  // Fonts
  fonts: {
    googleFonts: string[];
    customFonts: string[];
    defaultTitleFont: string;
    defaultBodyFont: string;
    brandFonts: string[];
  };

  // Colors
  colors: {
    brandPalette: string[];
    seasonalPalettes: Record<string, string[]>;
    defaultTextColor: string;
    defaultBackgroundColor: string;
  };

  // Elements Library
  elements: {
    stickers: string[]; // URLs
    shapes: string[];
    frames: string[];
    backgrounds: string[];
    overlays: string[];
  };

  // Smart Features
  smartFeatures: {
    autoResizeText: boolean;
    suggestLayouts: boolean;
    aiBackgroundRemoval: boolean;
    autoEnhancePhotos: boolean;
  };

  // Export Settings
  export: {
    defaultFormat: 'png' | 'jpg' | 'webp';
    defaultQuality: number; // 0-100
    generateMultipleSizes: boolean;
    sizes: Array<{name: string; width: number; height: number}>;
  };
}
```

---

## 5️⃣ Recipe Schema & Defaults

### Module lié: `src/modules/articles/types/recipes.types.ts`

```typescript
interface RecipeDefaultsSettings {
  // Default Values
  defaults: {
    prepTime: number; // minutes
    cookTime: number;
    totalTime: number;
    servings: number;
    yield: string;
    difficulty: 'easy' | 'medium' | 'hard';
    cuisine: string;
    category: string;
    diet: string[]; // ["vegetarian", "gluten-free"]
  };

  // Units & Measurements
  units: {
    weight: 'metric' | 'imperial' | 'both'; // g/kg vs oz/lb
    volume: 'metric' | 'imperial' | 'both'; // ml/L vs cup/tbsp
    temperature: 'celsius' | 'fahrenheit' | 'both';
    defaultSystem: 'metric' | 'imperial';
  };

  // Nutrition
  nutrition: {
    enabled: boolean;
    calculateAutomatically: boolean;
    showPerServing: boolean;
    showDailyValues: boolean;
    roundValues: boolean;
    disclaimer: string;
  };

  // Ingredients
  ingredients: {
    groupByDefault: boolean;
    defaultGroups: string[];
    allowLinks: boolean; // Link to equipment/ingredients pages
    showSubstitutions: boolean;
  };

  // Instructions
  instructions: {
    numbered: boolean;
    showImages: boolean;
    showTimers: boolean;
    allowVideos: boolean;
    groupByDefault: boolean;
  };

  // SEO for Recipes
  schema: {
    enabled: boolean;
    includeNutrition: boolean;
    includeAggregateRating: boolean;
    includeVideo: boolean;
    includeKeywords: boolean;
    customProperties: Record<string, string>;
  };

  // Equipment
  equipment: {
    showAffiliateLinks: boolean;
    defaultAffiliateTag: string;
    equipmentDatabase: 'internal' | 'amazon' | 'custom';
  };
}
```

---

## 6️⃣ Affiliate & Monetization

### Module lié: `RecipeLayout.astro` (déjà mentionne affiliate)

```typescript
interface AffiliateSettings {
  // General
  general: {
    enabled: boolean;
    defaultDisclosure: string;
    disclosurePosition: 'top' | 'bottom' | 'inline';
    autoConvertLinks: boolean;
    noFollowLinks: boolean;
    openInNewTab: boolean;
  };

  // Amazon Associates
  amazon: {
    enabled: boolean;
    trackingId: string;
    marketplace: string; // 'US', 'CA', 'UK', etc.
    apiKey: string;
    apiSecret: string;
    autoLinkKeywords: boolean;
    keywords: Array<{
      term: string;
      asin: string;
    }>;
  };

  // Other Networks
  networks: {
    skimlinks: { enabled: boolean; publisherId: string };
    viglink: { enabled: boolean; key: string };
    shareasale: { enabled: boolean; merchantId: string };
    custom: Array<{
      name: string;
      pattern: string; // regex
      replacement: string;
    }>;
  };

  // Equipment Links
  equipment: {
    database: Array<{
      name: string;
      url: string;
      affiliateUrl: string;
      image: string;
      category: string;
    }>;
    autoLinkInRecipes: boolean;
    showPrices: boolean;
  };

  // Ingredient Links
  ingredients: {
    autoLink: boolean;
    linkTo: 'internal' | 'external' | 'shop';
    shopUrl: string;
  };

  // Ads Integration
  ads: {
    inContentFrequency: number; // every N paragraphs
    recipeCardAd: boolean;
    ingredientListAd: boolean;
    stickySidebarAd: boolean;
  };

  // Analytics
  analytics: {
    trackClicks: boolean;
    trackConversions: boolean;
    reportingEnabled: boolean;
  };
}
```

---

## 7️⃣ Newsletter Integration

### Module lié: `NewsletterWidget.astro`, `homepage/NewsletterSection.jsx`

```typescript
interface NewsletterSettings {
  // Provider
  provider: {
    type: 'mailchimp' | 'convertkit' | 'substack' | 'beehiiv' | 'buttondown' | 'custom';
    apiKey: string; // Encrypted
    apiSecret: string; // Encrypted
    listId: string;
    tagAutomation: boolean;
  };

  // Forms
  forms: {
    inlineForm: {
      enabled: boolean;
      title: string;
      description: string;
      buttonText: string;
      successMessage: string;
      placement: ('sidebar' | 'after-content' | 'popup')[];
    };
    popupForm: {
      enabled: boolean;
      trigger: 'exit-intent' | 'scroll-50' | 'time-delay' | 'manual';
      delay: number; // seconds
      frequency: number; // days between shows
      title: string;
      description: string;
    };
  };

  // Content Automation
  automation: {
    welcomeEmail: {
      enabled: boolean;
      subject: string;
      template: string;
      delay: number; // hours
    };
    newPostNotification: {
      enabled: boolean;
      categories: string[];
      schedule: 'immediate' | 'daily' | 'weekly';
      template: string;
    };
    digest: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      day: string;
      time: string;
      maxPosts: number;
    };
    recipeSeries: {
      enabled: boolean;
      series: Array<{
        name: string;
        description: string;
        recipes: number[];
        interval: number; // days
      }>;
    };
  };

  // Subscribers
  subscribers: {
    doubleOptIn: boolean;
    reCaptchaEnabled: boolean;
    reCaptchaKey: string;
    gdprCompliance: boolean;
    customFields: Array<{
      name: string;
      type: 'text' | 'select' | 'checkbox';
      required: boolean;
    }>;
  };

  // Design
  design: {
    colors: {
      background: string;
      text: string;
      button: string;
      buttonText: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
    logo: string;
  };
}
```

---

## 8️⃣ Print & PDF Settings

### Module lié: `RecipeLayout.astro` (bouton print déjà présent)

```typescript
interface PrintSettings {
  // Print Styles
  styles: {
    logoOnPrint: boolean;
    logoSize: 'small' | 'medium' | 'large';
    showUrl: boolean;
    showDate: boolean;
    showAuthor: boolean;
    showCopyright: boolean;
    fontSize: 'small' | 'medium' | 'large';
    colorMode: 'color' | 'grayscale' | 'black-white';
    pageSize: 'a4' | 'letter' | 'legal';
  };

  // Content to Print
  content: {
    includeHeader: boolean;
    includeFooter: boolean;
    includeNutrition: boolean;
    includeEquipment: boolean;
    includeNotes: boolean;
    includeComments: boolean;
    includeRelated: boolean;
    includeRatings: boolean;
    images: 'all' | 'hero-only' | 'none';
  };

  // PDF Generation
  pdf: {
    enabled: boolean;
    filenamePattern: string; // "{recipe-name}-recipe.pdf"
    downloadButton: boolean;
    emailPdf: boolean;
    passwordProtect: boolean;
    watermark: {
      enabled: boolean;
      text: string;
      opacity: number;
    };
  };

  // Recipe Card Format
  recipeCard: {
    style: 'modern' | 'classic' | 'minimal';
    layout: 'vertical' | 'horizontal';
    compactMode: boolean;
    ingredientsFirst: boolean;
    checkboxesForIngredients: boolean;
    spaceForNotes: boolean;
  };

  // Call-to-Action on Print
  cta: {
    enabled: boolean;
    text: string;
    url: string;
    qrCode: boolean;
    socialLinks: boolean;
  };
}
```

---

## 9️⃣ Webhooks & Integrations

```typescript
interface WebhooksSettings {
  // Outgoing Webhooks
  outgoing: Array<{
    id: string;
    name: string;
    url: string;
    events: ('article.published' | 'article.updated' | 'article.deleted' | 
             'recipe.created' | 'user.registered' | 'comment.posted' |
             'newsletter.subscribed')[];
    headers: Record<string, string>;
    secret: string; // For signature verification
    active: boolean;
    retryPolicy: {
      enabled: boolean;
      maxRetries: number;
      backoff: 'fixed' | 'exponential';
    };
  }>;

  // Zapier/Make Integration
  automation: {
    zapierWebhook: string;
    makeWebhook: string;
    n8nWebhook: string;
    events: string[];
  };

  // Social Auto-Post (déjà dans Social mais renforcé ici)
  social: {
    bufferIntegration: { enabled: boolean; token: string };
    hootsuiteIntegration: { enabled: boolean; token: string };
    laterIntegration: { enabled: boolean; token: string };
  };

  // E-commerce
  ecommerce: {
    woocommerce: { enabled: boolean; url: string; key: string };
    shopify: { enabled: boolean; store: string; token: string };
    gumroad: { enabled: boolean; token: string };
  };

  // CRM
  crm: {
    hubspot: { enabled: boolean; apiKey: string };
    salesforce: { enabled: boolean; credentials: object };
    zoho: { enabled: boolean; token: string };
  };
}
```

---

## 🔟 User Roles & Permissions (Avancé)

### Module lié: `src/modules/auth/`

```typescript
interface RolesSettings {
  // Custom Roles
  roles: Array<{
    id: string;
    name: string;
    description: string;
    capabilities: string[];
    inheritsFrom?: string;
  }>;

  // Default Capabilities par post type
  capabilities: {
    articles: {
      create: string[];
      edit: string[];
      delete: string[];
      publish: string[];
      editOthers: string[];
      deleteOthers: string[];
    };
    recipes: { /* ... */ };
    categories: { /* ... */ };
    menus: { /* ... */ };
    settings: {
      view: string[];
      edit: string[];
    };
  };

  // Content Workflow
  workflow: {
    enabled: boolean;
    stages: Array<{
      name: string;
      requiresApproval: boolean;
      approvers: string[];
      notifications: boolean;
    }>;
  };

  // Audit Log
  audit: {
    enabled: boolean;
    logEvents: string[];
    retentionDays: number;
  };
}
```

---

## 1️⃣1️⃣ Content Export & Backup

```typescript
interface ExportSettings {
  // Scheduled Backups
  backup: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    includeMedia: boolean;
    includeDatabase: boolean;
    destination: 'local' | 's3' | 'gdrive' | 'dropbox';
    credentials: object;
    retention: number; // number of backups to keep
  };

  // Export Formats
  export: {
    formats: ('json' | 'xml' | 'csv' | 'md' | 'pdf')[];
    compress: boolean;
    includeImages: boolean;
    includeMetadata: boolean;
  };

  // Import
  import: {
    allowedFormats: string[];
    duplicateHandling: 'skip' | 'update' | 'create-new';
    mediaImport: 'download' | 'reference' | 'skip';
  };

  // Migration
  migration: {
    wordpressImport: boolean;
    ghostImport: boolean;
    mediumImport: boolean;
    substackImport: boolean;
  };
}
```

---

## 1️⃣2️⃣ Legal & Compliance (GDPR/CCPA)

```typescript
interface LegalSettings {
  // Cookie Consent
  cookies: {
    enabled: boolean;
    bannerPosition: 'top' | 'bottom' | 'modal';
    theme: 'light' | 'dark';
    categories: Array<{
      name: string;
      required: boolean;
      description: string;
      cookies: string[];
    }>;
    privacyPolicyUrl: string;
    acceptAllButton: boolean;
    rejectAllButton: boolean;
    customizeButton: boolean;
  };

  // Privacy Policy
  privacy: {
    lastUpdated: string;
    dataController: string;
    contactEmail: string;
    thirdParties: string[];
    retentionPeriod: string;
  };

  // Terms of Service
  terms: {
    lastUpdated: string;
    minimumAge: number;
    jurisdiction: string;
    arbitration: boolean;
  };

  // Accessibility (WCAG)
  accessibility: {
    wcagLevel: 'A' | 'AA' | 'AAA';
    keyboardNavigation: boolean;
    screenReaderOptimized: boolean;
    reduceMotion: boolean;
    highContrast: boolean;
  };

  // Age Verification
  ageVerification: {
    enabled: boolean;
    minimumAge: number;
    alcoholRelated: boolean;
    redirectUrl: string;
  };
}
```

---

## 1️⃣3️⃣ Performance & Caching

```typescript
interface PerformanceSettings {
  // Caching Strategy
  cache: {
    enabled: boolean;
    type: 'memory' | 'redis' | 'cloudflare';
    ttl: {
      home: number;
      articles: number;
      recipes: number;
      categories: number;
      api: number;
    };
    warmCache: boolean;
    purgeOnPublish: boolean;
  };

  // CDN
  cdn: {
    provider: 'cloudflare' | 'fastly' | 'aws' | 'keycdn';
    zoneId: string;
    apiToken: string;
    purgeOnUpdate: boolean;
    imageOptimization: boolean;
    brotli: boolean;
    http3: boolean;
  };

  // Image Optimization
  images: {
    format: 'webp' | 'avif' | 'auto';
    quality: number;
    responsive: boolean;
    lazyLoad: boolean;
    placeholder: 'blur' | 'color' | 'none';
  };

  // Script Loading
  scripts: {
    deferNonCritical: boolean;
    asyncAnalytics: boolean;
    preloadFonts: boolean;
    preloadCritical: boolean;
  };

  // Database
  database: {
    connectionPooling: boolean;
    queryCache: boolean;
    slowQueryLog: boolean;
    optimizationSchedule: string; // cron
  };
}
```

---

## 📊 Synthèse des Nouveaux Tabs

```
Settings Tabs Complets:
│
├── 🆕 Site Identity
├── 🆕 Layout Builder
├── 🆕 Colors
├── 🆕 Typography
├── ✅ General → Localisation uniquement
├── ✅ Menus
├── 🔄 SEO (amélioré)
├── 🔄 Social (amélioré)
├── 🔄 Content (amélioré)
├── 🔄 Ads (persisté)
├── ✅ Media
├── ✅ AI
├── 🔄 Email (amélioré)
├── 🔄 Advanced (amélioré)
│
├── 🆕 Homepage Builder          ← NOUVEAU
├── 🆕 Pinterest                 ← NOUVEAU
├── 🆕 Editor Config             ← NOUVEAU
├── 🆕 Templates Design          ← NOUVEAU
├── 🆕 Recipe Defaults           ← NOUVEAU
├── 🆕 Affiliate                 ← NOUVEAU
├── 🆕 Newsletter                ← NOUVEAU
├── 🆕 Print & PDF               ← NOUVEAU
├── 🆕 Webhooks                  ← NOUVEAU
├── 🆕 Roles & Permissions       ← NOUVEAU (P2)
├── 🆕 Export & Backup           ← NOUVEAU
├── 🆕 Legal & Compliance        ← NOUVEAU
└── 🆕 Performance               ← NOUVEAU
```

---

## 🎯 Priorisation V2

### P0 (Critique - Core CMS)
1. Site Identity (fusion General + Branding)
2. Persistence DB de toutes les settings existantes
3. Layout Builder
4. Colors (Design Tokens)
5. SEO Pro

### P1 (Important - Professionnalisation)
6. Homepage Builder (existe déjà, juste intégrer)
7. Recipe Defaults
8. Editor Config
9. Pinterest Integration
10. Newsletter

### P2 (Business - Monétisation)
11. Affiliate
12. Ads (persisté)
13. Print & PDF
14. Templates Design

### P3 (Enterprise - Scale)
15. Webhooks
16. Roles & Permissions
17. Export & Backup
18. Legal & Compliance
19. Performance

---

**Note:** Ces sections devraient être ajoutées au plan principal `settings-cms-implementation-plan.md` ou développées dans un second fichier selon la préférence.
