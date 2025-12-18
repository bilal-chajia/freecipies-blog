# Freecipies Blog Platform - Architecture Documentation

## Executive Summary

The Freecipies platform is a high-performance, hybrid web application built on **Astro.js** and **Cloudflare's Edge Network**. It combines Server-Side Rendering (SSR) for the public-facing site to ensure maximum SEO and speed, with a Client-Side Rendered (CSR) **React Admin Panel** for rich content management. Data is persisted in **Cloudflare D1** (SQLite) and **Cloudflare R2** (Object Storage), ensuring global low-latency access.

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Frontend Architecture (Public)](#3-frontend-architecture-public)
4. [Admin Panel Architecture](#4-admin-panel-architecture)
5. [Backend & API](#5-backend--api)
6. [Data Storage and Schema](#6-data-storage-and-schema)
7. [Performance Strategy](#7-performance-strategy)
8. [Deployment](#8-deployment)

---

## 1. System Architecture

### High-Level Diagram

```mermaid
graph TD
    User[Public Visitor] -->|HTTPS| CF[Cloudflare Edge]
    Admin[Content Creator] -->|HTTPS| CF

    subgraph "Cloudflare Ecosystem"
        CF -->|SSR Routes| Astro[Astro Application]
        CF -->|Static Assets| R2[R2 Storage (Images)]
        
        Astro -->|Read/Write| D1[(D1 Database)]
        
        subgraph "Client Side"
            Browser -->|Hydration| React[React Components]
            Browser -->|SPA Mode| AdminApp[React Admin Panel]
        end
        
        AdminApp -->|API Requests| AstroAPI[API Routes]
        AstroAPI -->|CRUD| D1
        AstroAPI -->|Uploads| R2
    end
```

### Core Principles
*   **Hybrid Rendering**: 
    *   **Public Pages**: Server-Side Rendered (SSR) HTML for LCP/SEO.
    *   **Admin Panel**: Client-Only React SPA for app-like interactivity.
*   **Edge-Native**: All compute (SSR + API) runs on Cloudflare Workers (V8 Isolates), eliminating cold starts.
*   **Flat Data Structure**: Critical display data (Image URLs, Dimensions, Colors) is stored flat on records to minimize JOIN overheads.

---

## 2. Technology Stack

### Frontend (Public)
*   **Framework**: Astro 5.x
*   **Styling**: TailwindCSS 4.x
*   **Interactivity**: Vanilla JS (Web Stories) + React (Calculators/Forms)

### Admin Dashboard (`/admin`)
*   **Core**: React 18.x (SPA via `client:only`)
*   **Routing**: `react-router-dom` v6
*   **State**: Zustand
*   **UI Library**: Radix UI
*   **Forms**: `react-hook-form` + `zod`
*   **Rich Text**: TipTap / Custom WYSIWYG
*   **Graphics**: HTML5 Canvas + `react-easy-crop` (for Image Editor)

### Backend
*   **Runtime**: Cloudflare Pages Functions
*   **Database**: Cloudflare D1 (SQLite)
*   **ORM**: Drizzle ORM
*   **Storage**: Cloudflare R2
*   **Auth**: JWT-based stateless authentication

---

## 3. Frontend Architecture (Public)

### Layouts
*   `RecipeLayout.astro`: Injects rich JSON-LD Schema.org data for recipes (prepTime, cookTime, yield).
*   `Layout.astro`: Standard shell for blog posts and landing pages.

### Key Components
*   **StoriesBar**: 
    *   Horizontal scrolling story rings.
    *   **Optimization**: Data passed via global `window.STORIES_DATA` to prevent DOM bloating.
*   **WebStoryViewer**: 
    *   Full-screen immersive viewer.
    *   Zero-dependency Vanilla JS implementation for instant touch response.
*   **RecipeCard**: 
    *   Uses flat `imageUrl`, `imageWidth`, `imageHeight` for CLS-free loading.
    *   Optimistic hover states.

---

## 4. Admin Panel Architecture

The Admin Panel is a "Photoshop-lite" CMS built directly into the application.

### Custom Editors

#### A. Image Editor (`ImageEditor.jsx`)
A comprehensive browser-based image processor.
*   **Capabilities**: Crop, Rotate, Flip, Resize.
*   **Adjustments**: Brightness, Contrast, Saturation, Warmth.
*   **Filters**: Chrome, Fade, Mono, Noir, etc.
*   **Productivity**: "Copy/Paste Edits" from one image to another.
*   **Output**: Client-side WebP compression before upload.

#### B. Pin Creator (`PinCreator.jsx`)
A specialized marketing tool for Pinterest.
*   **Canvas Engine**: Drag-and-drop layer management.
*   **Templates**: Pre-built 2:3 aspect ratio layouts.
*   **Export**: Generates high-res PNGs directly from the DOM.

#### C. Category Editor
*   **Color System**: Visual color picker to define category branding (Badges/Chips).
*   **Live Preview**: Real-time rendering of the category card.

---

## 5. Backend & API

All data access flows through typed API routes in `src/pages/api/*`.

| Endpoint | Method | Function |
| :--- | :--- | :--- |
| `/api/articles` | GET, POST | List articles / Create draft |
| `/api/articles/[slug]` | GET, PUT, DELETE | CRUD for specific article |
| `/api/recipes` | GET | Specialized recipe feed |
| `/api/stats/popular` | GET | Analytics-driven popular content |
| `/api/media` | POST | Direct streaming upload to R2 |
| `/api/pins` | GET, POST | Manage marketing assets |

**Response format**: Standardized JSON envelope ` { success: true, data: ..., pagination: ... }`.

---

## 6. Data Storage and Schema

### Cloudflare D1 (SQLite) Schema

**Articles Table** (`articles`)
The central content repository.
*   `id`: Primary Key
*   `type`: 'recipe' | 'article'
*   `recipe_json`: TEXT (JSON) - Stores structured recipe data (ingredients, steps).
*   `faqs_json`: TEXT (JSON) - Stores FAQ arrays.
*   `image_url`, `image_width`, `image_height`: Flat columns for zero-latency rendering.
*   `is_online`: Visibility flag.
*   `view_count`: Simple analytics counter.

**Categories Table** (`categories`)
*   `slug`: Unique identifier (e.g., 'breakfast')
*   `color`: Hex code for UI theming.
*   `image_url`: Cover image for the category.

**Pinterest Pins** (`pinterest_pins`)
*   Links generated marketing assets to articles.

### Cloudflare R2
*   **Path Structure**: `/images/{timestamp}-{slug}.webp`
*   **CDN Integration**: Served directly via custom domain for caching.

---

## 7. Performance Strategy

### Core Web Vitals (CWV)
1.  **LCP (Largest Contentful Paint)**:
    *   Hero images utilize `fetchpriority="high"`.
    *   Preloading of critical font assets.
2.  **CLS (Cumulative Layout Shift)**:
    *   **Hardcoded Dimensions**: Database stores image dimensions; HTML renders with exact `width/height`.
    *   **Skeleton States**: React components use placeholder skeletons while hydrating.
3.  **INP (Interaction to Next Paint)**:
    *   **Global Data Injection**: Replaced heavy HTML data attributes with `window.STORIES_DATA` to reduce main-thread parsing costs.

### Caching Layers
*   **Browser**: `Cache-Control: public, max-age=3600` for lists.
*   **CDN**: R2 assets cached at the edge for 1 year (`immutable`).
*   **Database**: High-traffic queries (like "Popular Recipes") caches results in memory/KV (planned).

---

## 8. Deployment

*   **Host**: Cloudflare Pages.
*   **Build**: `pnpm build` (Astro static/hybrid build).
*   **Database Migrations**: Drizzle Kit (`drizzle-kit push:sqlite`).
*   **CI/CD**: Automatic deployment on git push.
