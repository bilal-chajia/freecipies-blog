# Plan d'Implémentation des Settings CMS

> **Date:** 2026-02-05  
> **Status:** Planning  
> **Priority:** High  

---

## 📋 Vue d'Ensemble

Ce document détaille l'implémentation complète d'un système de settings CMS professionnel, inspiré de WordPress Customizer, Strapi et Webflow.

### Architecture Actuelle Analysée

```
Settings Existantes:
├── General (formData - non persisté)
├── SEO (formData - non persisté)
├── Email (formData - non persisté)
├── Social (formData - non persisté)
├── Content (formData - non persisté)
├── Ads (formData - non persisté, mais UI complexe)
├── Appearance (API ✓ - mais à découper)
├── Menus (DB ✓ - complet)
├── Advanced (formData - non persisté)
├── Media (API ✓ - complet)
└── AI (API ✓ - complet)
```

### Objectif

Transformer toutes les settings en système **persisté en DB** avec UI professionnelle et génération de design tokens CSS.

---

## 🏗️ Architecture Cible

### Structure des Tabs

```
Settings Tabs (Gauche):
│
├── 🆕 Site Identity          ← Fusion General + Branding
│   ├── Tab: Brand            (name, tagline, url, email)
│   ├── Tab: Logos            (main, dark, mobile, print, email)
│   ├── Tab: Business         (legal, tax, address)
│   └── Tab: PWA              (manifest, icons, colors)
│
├── 🆕 Layout Builder         ← NOUVEAU - Template zones
│   ├── Tab: Grid System      (breakpoints, container, gutter)
│   ├── Tab: Templates        (recipe, article, category, home)
│   ├── Tab: Header           (sticky, logo position, search)
│   ├── Tab: Sidebar          (position, widgets, responsive)
│   └── Tab: Footer           (columns, copyright, social)
│
├── 🆕 Colors                 ← Extrait d'Appearance + enrichi
│   ├── Tab: Palette          (primary, secondary, neutral scales)
│   ├── Tab: Theme            (light/dark mapping)
│   ├── Tab: Components       (badge, toc, cards overrides)
│   └── Tab: Dark Mode        (algorithm, custom palette)
│
├── 🆕 Typography             ← NOUVEAU
│   ├── Tab: Fonts            (heading, body, mono, accent)
│   ├── Tab: Scale            (base, ratio, responsive)
│   ├── Tab: Elements         (h1-h6, body, lead, small)
│   └── Tab: Loading          (strategy, subsets, preload)
│
├── ✅ General (réduit)       ← Localisation uniquement
│   ├── Tab: Localization     (timezone, language, locale)
│   └── Tab: Regional         (currency, date format)
│
├── ✅ Menus                  ← EXISTANT (inchangé)
│   ├── Tab: Header Menu
│   └── Tab: Footer Menu
│
├── 🔄 SEO (amélioré)         ← Analytics + Schema.org
│   ├── Tab: Meta             (title template, defaults)
│   ├── Tab: Analytics        (GA4, GTM, Pixel, Clarity)
│   ├── Tab: Schema.org       (Knowledge Graph)
│   ├── Tab: Sitemap          (config, exclusions)
│   └── Tab: Robots           (rules, verification)
│
├── 🔄 Social (amélioré)      ← Auto-share + Feeds
│   ├── Tab: Profiles         (tous les réseaux)
│   ├── Tab: Auto-Share       (templates, scheduling)
│   └── Tab: Feeds            (Instagram, Twitter embed)
│
├── 🔄 Content (amélioré)     ← Workflow + Comments
│   ├── Tab: Display          (cards, pagination)
│   ├── Tab: Publishing       (workflow, validation)
│   ├── Tab: Comments         (provider, moderation)
│   ├── Tab: Search           (config, highlights)
│   └── Tab: Related          (algorithm, placement)
│
├── 🔄 Ads (persisté)         ← Déjà codé, ajouter DB
│   ├── Tab: Network          (AdSense, Ezoic, HB, Custom)
│   └── Tab: Placements       (header, sidebar, inline)
│
├── ✅ Email (amélioré)       ← Templates + Testing
│   ├── Tab: SMTP             (provider, credentials)
│   ├── Tab: Sender           (name, email, reply-to)
│   ├── Tab: Templates        (welcome, reset, newsletter)
│   └── Tab: Testing          (catch-all, send test)
│
├── ✅ Media                  ← EXISTANT (inchangé)
│   └── Upload settings
│
├── ✅ AI                     ← EXISTANT (inchangé)
│   └── Providers configuration
│
└── 🔄 Advanced (amélioré)
    ├── Tab: Security         (2FA, sessions, maintenance)
    ├── Tab: Performance      (cache, CDN, optimization)
    ├── Tab: Code Injection   (header, body, footer scripts)
    └── Tab: Export/Import    (backup, migration)
```

---

## 📊 Schéma de Données (DB)

### Table `site_settings` (existante)

```sql
-- Nouvelles clés à ajouter

-- 1. SITE IDENTITY
INSERT INTO site_settings (key, value, description, category, type, sort_order) VALUES
('site_identity', '{
  "brand": {
    "name": "Freecipies",
    "tagline": "Delicious recipes & cooking tips",
    "siteUrl": "https://recipes-saas.com",
    "adminEmail": "admin@recipes-saas.com"
  },
  "logos": {
    "main": "/logos/logo-main.svg",
    "dark": "/logos/logo-dark.svg",
    "mobile": "/logos/logo-mobile.svg",
    "print": null,
    "email": null
  },
  "favicon": {
    "source": "/logos/favicon.svg",
    "variants": {
      "16x16": "/logos/favicon-16x16.png",
      "32x32": "/logos/favicon-32x32.png",
      "apple": "/logos/apple-touch-icon.png"
    }
  },
  "pwa": {
    "enabled": true,
    "shortName": "Freecipies",
    "themeColor": "#ff6600",
    "backgroundColor": "#ffffff"
  },
  "business": {
    "legalName": "Freecipies Inc.",
    "foundedYear": 2024,
    "taxId": "",
    "address": {"street": "", "city": "", "country": ""}
  }
}', 'Site branding, logos, and business information', 'site-identity', 'json', 10);

-- 2. LAYOUT
INSERT INTO site_settings (key, value, category, type, sort_order) VALUES
('layout_config', '{
  "grid": {
    "type": "12-col",
    "gutter": "medium",
    "container": "hybrid",
    "maxWidth": {"sm": 640, "md": 768, "lg": 1024, "xl": 1280, "2xl": 1536}
  },
  "breakpoints": {
    "xs": 480, "sm": 640, "md": 768, "lg": 1024, "xl": 1280, "2xl": 1536
  },
  "templates": {
    "recipe": [
      {"id": "header", "type": "header", "blocks": ["logo", "nav", "search"]},
      {"id": "hero", "type": "content", "blocks": ["hero-image", "title", "meta"]},
      {"id": "main", "type": "content", "columns": [
        {"width": 8, "blocks": ["author", "share", "content", "ingredients", "instructions", "faq"]},
        {"width": 4, "blocks": ["toc", "nutrition", "popular", "newsletter"]}
      ]},
      {"id": "footer", "type": "footer", "blocks": ["copyright", "social"]}
    ]
  },
  "global": {
    "header": {"sticky": true, "height": 64, "logoPosition": "left", "showSearch": true},
    "sidebar": {"enabled": true, "position": "right", "width": 320, "behavior": "sticky"},
    "footer": {"columns": 4, "showLogo": true, "showNewsletter": true}
  }
}', 'Page layouts and template configuration', 'layout', 'json', 20);

-- 3. COLORS (Design Tokens)
INSERT INTO site_settings (key, value, category, type, sort_order) VALUES
('color_palette', '{
  "primary": {
    "50": "oklch(97% 0.02 25)",
    "100": "oklch(93% 0.04 25)",
    "200": "oklch(88% 0.07 25)",
    "300": "oklch(80% 0.12 25)",
    "400": "oklch(70% 0.18 25)",
    "500": "oklch(60% 0.22 25)",
    "600": "oklch(52% 0.20 25)",
    "700": "oklch(45% 0.17 25)",
    "800": "oklch(37% 0.14 25)",
    "900": "oklch(30% 0.10 25)",
    "950": "oklch(20% 0.05 25)"
  },
  "neutral": { "50": "...", "500": "oklch(50% 0 0)", "950": "..." },
  "success": { "500": "oklch(65% 0.2 145)" },
  "warning": { "500": "oklch(75% 0.15 85)" },
  "error": { "500": "oklch(55% 0.2 25)" }
}', 'Color palette in OKLCH format', 'colors', 'json', 30);

INSERT INTO site_settings (key, value, category, type, sort_order) VALUES
('color_theme', '{
  "light": {
    "background": "oklch(100% 0 0)",
    "foreground": "oklch(20% 0 0)",
    "primary": "oklch(60% 0.22 25)",
    "secondary": "oklch(96% 0.01 250)",
    "muted": "oklch(96% 0.01 0)",
    "border": "oklch(90% 0.01 0)"
  },
  "dark": {
    "background": "oklch(15% 0.02 250)",
    "foreground": "oklch(95% 0 0)",
    "primary": "oklch(65% 0.2 25)",
    "secondary": "oklch(25% 0.02 250)",
    "muted": "oklch(25% 0.02 0)",
    "border": "oklch(30% 0.02 0)"
  }
}', 'Semantic color tokens for light/dark themes', 'colors', 'json', 31);

INSERT INTO site_settings (key, value, category, type, sort_order) VALUES
('color_components', '{
  "badge": {"background": "#ff6600", "foreground": "#ffffff"},
  "toc": {"accent": "#f97316", "background": "#fff7ed", "border": "#fed7aa"},
  "category": {"default": "#ff6600", "useCustomColors": true},
  "recipeCard": {"background": "#ffffff", "border": "#e5e7eb", "shadow": "0 1px 3px rgba(0,0,0,0.1)"}
}', 'Component-specific color overrides', 'colors', 'json', 32);

-- 4. TYPOGRAPHY
INSERT INTO site_settings (key, value, category, type, sort_order) VALUES
('typography_config', '{
  "fonts": {
    "heading": {"family": "Inter", "fallback": ["system-ui", "sans-serif"], "weights": [400,500,600,700]},
    "body": {"family": "Inter", "fallback": ["system-ui", "sans-serif"], "weights": [400,500]},
    "mono": {"family": "JetBrains Mono", "fallback": ["monospace"]},
    "accent": {"family": "Playfair Display", "fallback": ["Georgia", "serif"]}
  },
  "scale": {
    "base": 16,
    "ratio": 1.25,
    "unit": "px"
  },
  "leading": {
    "body": 1.6,
    "heading": 1.2,
    "tight": 1.25,
    "normal": 1.5
  },
  "elements": {
    "h1": {"size": "2.5rem", "weight": 700, "lineHeight": 1.2, "letterSpacing": "-0.02em"},
    "h2": {"size": "2rem", "weight": 600, "lineHeight": 1.25, "letterSpacing": "-0.01em"},
    "body": {"size": "1rem", "weight": 400, "lineHeight": 1.6}
  },
  "loading": {
    "strategy": "swap",
    "subsets": ["latin", "latin-ext"],
    "preload": true
  }
}', 'Typography configuration', 'typography', 'json', 40);

-- 5. SEO (AMÉLIORÉ)
INSERT INTO site_settings (key, value, category, type, sort_order) VALUES
('seo_config', '{
  "meta": {
    "titleTemplate": "{title} | {siteName}",
    "defaultTitle": "Freecipies - Delicious Recipes & Cooking Tips",
    "defaultDescription": "Discover amazing recipes...",
    "defaultImage": "",
    "robots": "index,follow"
  },
  "knowledgeGraph": {
    "@type": "Organization",
    "name": "Freecipies",
    "logo": "",
    "sameAs": ["https://facebook.com/...", "https://twitter.com/..."]
  },
  "analytics": {
    "googleAnalytics": {"enabled": false, "measurementId": ""},
    "googleTagManager": {"enabled": false, "containerId": ""},
    "facebookPixel": {"enabled": false, "pixelId": ""},
    "clarity": {"enabled": false, "projectId": ""}
  },
  "sitemap": {
    "enabled": true,
    "includeImages": true,
    "changefreq": "weekly",
    "priority": 0.8
  }
}', 'SEO and analytics configuration', 'seo', 'json', 50);

-- 6. SOCIAL (AMÉLIORÉ)
INSERT INTO site_settings (key, value, category, type, sort_order) VALUES
('social_config', '{
  "profiles": {
    "facebook": {"url": "", "handle": ""},
    "twitter": {"url": "", "handle": ""},
    "instagram": {"url": "", "handle": ""},
    "pinterest": {"url": "", "handle": ""},
    "youtube": {"url": "", "handle": ""},
    "tiktok": {"url": "", "handle": ""}
  },
  "autoShare": {
    "enabled": false,
    "platforms": {
      "twitter": {"enabled": false, "template": "New recipe: {title} {url}"},
      "facebook": {"enabled": false, "template": "Check out our latest recipe: {title}"}
    }
  },
  "feeds": {
    "instagram": {"enabled": false, "accessToken": "", "limit": 6}
  }
}', 'Social media configuration', 'social', 'json', 60);

-- 7. CONTENT (AMÉLIORÉ)
INSERT INTO site_settings (key, value, category, type, sort_order) VALUES
('content_config', '{
  "display": {
    "postsPerPage": 12,
    "postsPerRow": 3,
    "cardStyle": "standard",
    "showExcerpt": true,
    "excerptLength": 150,
    "showReadTime": true,
    "showDate": true,
    "showAuthor": true
  },
  "publishing": {
    "autoPublish": false,
    "requireApproval": false,
    "featuredImageRequired": true,
    "minContentLength": 300
  },
  "comments": {
    "enabled": true,
    "provider": "native",
    "moderation": true,
    "nested": true,
    "maxDepth": 3
  },
  "search": {
    "enabled": true,
    "includeContent": true,
    "resultsPerPage": 10
  },
  "related": {
    "enabled": true,
    "algorithm": "hybrid",
    "count": 4
  }
}', 'Content display and publishing settings', 'content', 'json', 70);

-- 8. EMAIL (AMÉLIORÉ)
INSERT INTO site_settings (key, value, category, type, sort_order) VALUES
('email_config', '{
  "smtp": {
    "provider": "custom",
    "host": "",
    "port": 587,
    "secure": true,
    "auth": {"user": "", "pass": ""}
  },
  "sender": {
    "name": "Freecipies",
    "email": "noreply@recipes-saas.com",
    "replyTo": "contact@recipes-saas.com"
  },
  "templates": {
    "welcome": {"subject": "Welcome to Freecipies!", "enabled": true},
    "passwordReset": {"subject": "Reset your password", "expiryHours": 24},
    "newsletter": {"subject": "Your weekly recipes"}
  },
  "delivery": {
    "trackOpens": true,
    "trackClicks": true
  }
}', 'Email configuration and templates', 'email', 'json', 80);

-- 9. ADS (À PERSISTER)
INSERT INTO site_settings (key, value, category, type, sort_order) VALUES
('ads_config', '{
  "enabled": false,
  "network": "none",
  "googleAdSense": {
    "publisherId": "",
    "autoAdsEnabled": false,
    "adSlots": {...}
  },
  "ezoic": {...},
  "hbAgency": {...},
  "customAds": {...}
}', 'Advertising configuration', 'ads', 'json', 90);

-- 10. LOCALIZATION (ex-General réduit)
INSERT INTO site_settings (key, value, category, type, sort_order) VALUES
('localization_config', '{
  "timezone": "America/Toronto",
  "language": "en",
  "locale": "en-US",
  "currency": "USD",
  "dateFormat": "MM/DD/YYYY",
  "timeFormat": "12h"
}', 'Regional and localization settings', 'general', 'json', 100);
```

---

## 🔌 API Endpoints

### Structure RESTful

```typescript
// GET  - Récupérer la configuration
// PUT  - Mettre à jour complètement
// PATCH - Mettre à jour partiellement

/api/settings/site-identity
/api/settings/layout
/api/settings/colors
/api/settings/typography
/api/settings/seo
/api/settings/social
/api/settings/content
/api/settings/email
/api/settings/ads
/api/settings/localization

// Endpoints utilitaires
POST /api/settings/preview          // Génère CSS sans sauvegarder
POST /api/settings/export/:format   // json | css | scss
POST /api/settings/import           // Importe JSON
POST /api/settings/reset/:key       // Reset aux valeurs par défaut
```

### Exemple de Response

```json
{
  "success": true,
  "data": {
    "siteIdentity": { ... },
    "layout": { ... },
    "colors": { ... }
  },
  "meta": {
    "generatedAt": "2026-02-05T12:00:00Z",
    "version": "1.0"
  }
}
```

---

## 🎨 Génération CSS (Design Tokens)

### Service de Génération

```typescript
// src/shared/services/designTokens.service.ts

export function generateCSS(settings: AllSettings): string {
  return `
    /* Generated Design Tokens - Freecipies CMS */
    /* Timestamp: ${new Date().toISOString()} */
    
    :root {
      /* Colors - OKLCH */
      ${generateColorTokens(settings.colors)}
      
      /* Typography */
      ${generateTypographyTokens(settings.typography)}
      
      /* Layout */
      ${generateLayoutTokens(settings.layout)}
      
      /* Spacing */
      ${generateSpacingTokens()}
      
      /* Shadows */
      ${generateShadowTokens()}
    }
    
    /* Dark Mode */
    .dark {
      ${generateDarkTokens(settings.colors)}
    }
    
    /* Responsive */
    ${generateResponsiveTokens(settings.layout)}
  `;
}
```

### Output CSS Exemple

```css
:root {
  /* Primary Scale (Orange) */
  --color-primary-50: oklch(97% 0.02 25);
  --color-primary-100: oklch(93% 0.04 25);
  --color-primary-500: oklch(60% 0.22 25);
  --color-primary-600: oklch(52% 0.20 25);
  --color-primary-950: oklch(20% 0.05 25);
  
  /* Semantic */
  --color-background: oklch(100% 0 0);
  --color-foreground: oklch(20% 0 0);
  --color-primary: var(--color-primary-500);
  --color-muted: oklch(96% 0.01 0);
  --color-border: oklch(90% 0.01 0);
  
  /* Typography */
  --font-heading: 'Inter', system-ui, sans-serif;
  --font-body: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 1.875rem;
  --text-4xl: 2.25rem;
  
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;
  
  /* Layout */
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;
  
  --breakpoint-xs: 480px;
  --breakpoint-sm: 640px;
  --breakpoint-md: 768px;
  --breakpoint-lg: 1024px;
  --breakpoint-xl: 1280px;
  
  /* Spacing (8px base) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-8: 2rem;
  --space-16: 4rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  
  /* Radii */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
}

/* Component Tokens */
[data-component="badge"] {
  --badge-bg: var(--color-primary);
  --badge-fg: white;
}

[data-component="toc"] {
  --toc-accent: var(--color-primary);
  --toc-bg: var(--color-primary-50);
}
```

---

## 🧩 Composants React (Admin)

### 1. SiteIdentitySettings.jsx

```typescript
interface SiteIdentitySettingsProps {
  settings: SiteIdentitySettings;
  onChange: (settings: SiteIdentitySettings) => void;
  onSave: () => Promise<void>;
}

// Sub-tabs:
// - BrandTab: Inputs texte pour name, tagline, url, email
// - LogosTab: BrandingCards existant (à réutiliser)
// - BusinessTab: Formulaire entreprise
// - PwaTab: Toggle + color pickers
```

### 2. LayoutSettings.jsx

```typescript
// Sub-tabs:
// - GridTab: Sliders pour breakpoints, select container type
// - TemplatesTab: LayoutBuilder visuel (drag-drop zones)
// - HeaderTab: Toggle sticky, select position logo
// - SidebarTab: Toggle enabled, position select, widgets checklist
// - FooterTab: Column count, toggles logo/newsletter/social

// Composant clé: TemplateVisualizer
// Affiche wireframe du template avec zones droppables
```

### 3. ColorsSettings.jsx

```typescript
// Sub-tabs:
// - PaletteTab: ColorStudio avec OKLCH
// - ThemeTab: Light/Dark toggle, mapping visuel
// - ComponentsTab: Overrides par composant
// - DarkModeTab: Algorithme auto vs custom

// Composants clés:
// - ColorScale: Affiche 50-950 avec valeurs OKLCH
// - ColorPickerOKLCH: Hue, Chroma, Lightness sliders
// - ContrastChecker: WCAG AA/AAA validation
// - PaletteImporter: Import from Coolors, Figma
```

### 4. TypographySettings.jsx

```typescript
// Sub-tabs:
// - FontsTab: FontSelect avec Google Fonts API
// - ScaleTab: Modular scale calculator
// - ElementsTab: Preview H1-H6, Body avec contrôles
// - LoadingTab: Strategy select, subsets multiselect

// Composants clés:
// - FontPairingSuggestions: "Inter + Playfair", etc.
// - TypeScaleVisualizer: Montre la hiérarchie
// - LivePreview: Texte réel avec les fonts chargées
```

### 5. Composants Réutilisables

```typescript
// SettingsForm - Wrapper avec validation Zod
// SettingsSection - Card avec titre et description
// SettingsTabs - Navigation interne
// PreviewPanel - Iframe ou live preview
// SaveBar - Boutons save/reset avec état
// ImportExport - Boutons JSON/CSS
```

---

## 📦 Structure des Fichiers

```
src/
├── modules/settings/
│   ├── schema/
│   │   └── settings.schema.ts        # Drizzle schema (existant)
│   ├── types/
│   │   ├── settings.types.ts         # Types existants + nouveaux
│   │   ├── design-tokens.types.ts    # Types pour tokens CSS
│   │   └── layout.types.ts           # Types pour layout builder
│   ├── services/
│   │   ├── settings.service.ts       # CRUD settings (existant)
│   │   ├── designTokens.service.ts   # Génération CSS
│   │   └── layout.service.ts         # Validation layout
│   └── constants/
│       ├── defaults.ts               # Valeurs par défaut
│       └── color-scales.ts           # Scales de couleur prédéfinies
│
├── pages/api/settings/
│   ├── site-identity.ts              # NOUVEAU
│   ├── layout.ts                     # NOUVEAU
│   ├── colors.ts                     # NOUVEAU
│   ├── typography.ts                 # NOUVEAU
│   ├── seo.ts                        # NOUVEAU (remplace partiel)
│   ├── social.ts                     # NOUVEAU (remplace partiel)
│   ├── content.ts                    # NOUVEAU (remplace partiel)
│   ├── email.ts                      # NOUVEAU (remplace partiel)
│   ├── ads.ts                        # NOUVEAU
│   ├── localization.ts               # NOUVEAU
│   └── index.ts                      # GET all settings combiné
│
├── admin/pages/settings/
│   ├── Settings.jsx                  # REFONTE - Nouvelle navigation
│   └── tabs/
│       ├── SiteIdentitySettings.jsx  # NOUVEAU
│       ├── LayoutSettings.jsx        # NOUVEAU
│       ├── ColorsSettings.jsx        # NOUVEAU
│       ├── TypographySettings.jsx    # NOUVEAU
│       ├── GeneralSettings.jsx       # MODIFIÉ - Réduit
│       ├── SeoSettings.jsx           # AMÉLIORÉ
│       ├── SocialSettings.jsx        # AMÉLIORÉ
│       ├── ContentSettings.jsx       # AMÉLIORÉ
│       ├── EmailSettings.jsx         # AMÉLIORÉ
│       ├── AdsSettings.jsx           # PERSISTÉ
│       ├── MenuSettings.jsx          # EXISTANT
│       ├── ImageUploadSettings.jsx   # EXISTANT
│       ├── AISettings.jsx            # EXISTANT
│       └── AdvancedSettings.jsx      # AMÉLIORÉ
│
├── admin/components/settings/
│   ├── index.js                      # Exports
│   ├── SettingsLayout.jsx            # EXISTANT - Layout 2 panneaux
│   ├── SettingsForm.jsx              # NOUVEAU - Wrapper formulaire
│   ├── SettingsSection.jsx           # EXISTANT
│   ├── PreviewPanel.jsx              # NOUVEAU - Iframe preview
│   ├── SaveBar.jsx                   # NOUVEAU - Actions save
│   └── fields/                       # NOUVEAU - Inputs réutilisables
│       ├── ColorField.jsx
│       ├── FontField.jsx
│       ├── ImageField.jsx
│       └── LayoutZoneField.jsx
│
└── admin/components/design-system/   # NOUVEAU
    ├── ColorStudio/
    │   ├── index.jsx
    │   ├── ColorScale.jsx
    │   ├── OKLCHPicker.jsx
    │   └── ContrastChecker.jsx
    ├── TypeStudio/
    │   ├── index.jsx
    │   ├── FontSelector.jsx
    │   ├── TypeScale.jsx
    │   └── LivePreview.jsx
    └── LayoutBuilder/
        ├── index.jsx
        ├── TemplateCanvas.jsx
        ├── ZoneDropTarget.jsx
        └── BlockPalette.jsx
```

---

## 🗓️ Plan de Développement

### Phase 1: Fondation (Semaine 1)

**Jour 1-2: API & Types**
- [ ] Créer les types TypeScript complets
- [ ] Créer les endpoints API (GET/PUT pour chaque section)
- [ ] Implémenter la génération CSS design tokens
- [ ] Tests API avec curl/Postman

**Jour 3-4: Site Identity**
- [ ] Fusionner GeneralSettings + BrandingCards
- [ ] Créer SiteIdentitySettings.jsx avec 4 sub-tabs
- [ ] Migration des données existantes
- [ ] Tests et validation

**Jour 5: Layout Builder (base)**
- [ ] Structure LayoutSettings.jsx
- [ ] Grid system controls
- [ ] Breakpoint editor

### Phase 2: Design System (Semaine 2)

**Jour 1-2: Color Studio**
- [ ] Composant OKLCH color picker
- [ ] Génération de scales automatique
- [ ] PaletteTab avec presets
- [ ] ThemeTab light/dark

**Jour 3-4: Type Studio**
- [ ] Intégration Google Fonts API
- [ ] Font pairing suggestions
- [ ] Live preview avec chargement dynamique
- [ ] Responsive typography

**Jour 5: Integration & Tests**
- [ ] Connecter Colors + Typography au CSS global
- [ ] Preview en temps réel
- [ ] Export CSS

### Phase 3: Layout Builder Avancé (Semaine 3)

**Jour 1-3: Template Zones**
- [ ] Canvas visuel drag-drop
- [ ] Zones: header, hero, content, sidebar, footer
- [ ] Blocks: title, meta, author, content, toc, etc.
- [ ] Responsive visibility par zone

**Jour 4-5: Header/Sidebar/Footer Config**
- [ ] Header: sticky, logo position, search toggle
- [ ] Sidebar: widgets, responsive behavior
- [ ] Footer: columns, content

### Phase 4: Amélioration Sections Existantes (Semaine 4)

**Jour 1: SEO Pro**
- [ ] Ajouter Analytics providers
- [ ] Schema.org builder
- [ ] Sitemap configuration
- [ ] Google preview amélioré

**Jour 2: Social Hub**
- [ ] Auto-share templates
- [ ] Feed integration (Instagram)
- [ ] Plus de réseaux sociaux

**Jour 3: Email Pro**
- [ ] Templates personnalisables
- [ ] SMTP testing
- [ ] Email preview

**Jour 4: Content & Advanced**
- [ ] Comments configuration
- [ ] Publishing workflow
- [ ] Code injection

**Jour 5: Ads Persistence**
- [ ] Migrer Ads vers DB
- [ ] Conserver UI existante
- [ ] Validation

### Phase 5: Polish & Release (Semaine 5)

**Jour 1-2: Import/Export**
- [ ] Export JSON complet
- [ ] Export CSS
- [ ] Import/restore

**Jour 3: Documentation**
- [ ] Guide utilisateur
- [ ] Documentation technique
- [ ] Migration guide

**Jour 4-5: Tests & Bugfixes**
- [ ] Tests E2E
- [ ] Mobile responsive
- [ ] Performance optimization

---

## 🎯 Features Clés par Priorité

### P0 (Critique)
1. Persistence DB de toutes les settings
2. Site Identity (fusion General + Branding)
3. Génération CSS design tokens
4. Layout Builder basique

### P1 (Important)
5. Color Studio avec OKLCH
6. Type Studio avec Google Fonts
7. SEO Pro (Analytics, Schema)
8. Social Hub (auto-share)

### P2 (Nice to have)
9. Email templates avancés
10. Import/Export
11. Presets thèmes
12. A/B testing intégration

---

## 🐘 Migration des Données Existantes

### Script de Migration

```typescript
// scripts/migrate-settings.ts

async function migrateSettings() {
  // 1. Récupérer les formData existants (Settings.jsx)
  const legacySettings = await getLegacySettings();
  
  // 2. Transformer en nouvelle structure
  const newSettings = {
    siteIdentity: {
      brand: {
        name: legacySettings.siteName,
        tagline: legacySettings.siteDescription,
        siteUrl: legacySettings.siteUrl,
        adminEmail: legacySettings.adminEmail,
      },
      logos: {
        main: legacyLogos.logoMain,
        dark: legacyLogos.logoDark,
        mobile: legacyLogos.logoMobile,
      },
      // ...
    },
    colors: {
      components: {
        badge: { background: legacySettings.badgeColor },
        toc: { accent: legacySettings.tocAccentColor },
      }
    },
    // ...
  };
  
  // 3. Insérer en DB
  await insertSettings(newSettings);
  
  // 4. Générer CSS initial
  await regenerateCSS();
}
```

---

## 📚 Références & Inspiration

- **WordPress Customizer**: Architecture sections/panels
- **Strapi**: Content-type builder, API generation
- **Webflow**: Visual layout builder
- **Figma Tokens**: Design tokens structure
- **Radix Colors**: OKLCH color scales
- **Tailwind CSS**: Utility-first approach

---

## 📝 Notes de Développement

### Conventions de Nommage

- **DB Keys**: snake_case (`site_identity`, `color_palette`)
- **TypeScript Types**: PascalCase (`SiteIdentitySettings`)
- **API Endpoints**: kebab-case (`/site-identity`, `/colors`)
- **CSS Variables**: kebab-case (`--color-primary-500`)

### Performance

- Lazy load des fonts Google
- Debounce sur les color pickers
- Virtualization pour longues listes
- Cache CSS généré en KV

### Sécurité

- Validation Zod côté client ET serveur
- Sanitization des scripts custom
- Rate limiting sur les previews
- Encryption pour SMTP passwords

---

**Prochaine étape:** Commencer par la Phase 1 - Fondation (API + Site Identity)
