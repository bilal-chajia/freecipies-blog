# Authors Module - JSON Fields Documentation

## Overview
The Authors module uses JSON fields to store structured data for images, biography, and SEO. This provides flexibility while maintaining backward compatibility with legacy flat fields.

---

## JSON Field Structures

### 1. `imagesJson` - Author Images

Stores responsive image variants for the author.

**Structure:**
```typescript
{
  avatar?: {
    alt?: string;
    variants?: {
      original?: { url: string; width: number; height: number };
      lg?: { url: string; width: number; height: number };
      md?: { url: string; width: number; height: number };
      sm?: { url: string; width: number; height: number };
      xs?: { url: string; width: number; height: number };
    };
  };
  cover?: { ...same ImageSlot structure... };
  banner?: { ...same ImageSlot structure... };
}
```

**Example:**
```json
{
  "avatar": {
    "alt": "John Doe headshot",
    "variants": {
      "original": { "url": "/images/authors/john-doe-avatar.webp", "width": 800, "height": 800 },
      "md": { "url": "/images/authors/john-doe-avatar-md.webp", "width": 200, "height": 200 },
      "xs": { "url": "/images/authors/john-doe-avatar-xs.webp", "width": 50, "height": 50 }
    }
  },
  "cover": {
    "alt": "John Doe cooking",
    "variants": {
      "original": { "url": "/images/authors/john-doe-cover.webp", "width": 1600, "height": 900 }
    }
  }
}
```

---

### 2. `bioJson` - Biography & Social Links

Stores author biography and social media links.

**Structure:**
```typescript
{
  short?: string;           // Short intro paragraph
  long?: string;            // Markdown or rich text
  socials?: [
    { network: string; url: string; label?: string }
  ];
  // Legacy fields are still accepted: headline, subtitle,
  // introduction, fullBio, expertise, socialLinks
}
```

**Example:**
```json
{
  "short": "With over 15 years of culinary experience...",
  "long": "## About John\n\nJohn specializes in Italian and Mediterranean cuisine.",
  "socials": [
    { "network": "instagram", "url": "https://instagram.com/johndoecooks", "label": "@johndoecooks" },
    { "network": "twitter", "url": "https://x.com/johndoefood", "label": "@johndoefood" },
    { "network": "website", "url": "https://johndoecooks.com", "label": "Website" }
  ]
}
```

---

### 3. `seoJson` - SEO Metadata

Stores SEO-specific metadata.

**Structure:**
```typescript
{
  metaTitle?: string;
  metaDescription?: string;
  canonical?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  twitterCard?: string;
  noIndex?: boolean;
  robots?: string;
}
```

**Example:**
```json
{
  "metaTitle": "John Doe - Italian Food Blogger & Chef",
  "metaDescription": "Explore authentic Italian recipes and cooking tips from award-winning chef John Doe.",
  "canonical": "https://example.com/authors/john-doe",
  "ogImage": "https://example.com/images/authors/john-doe-og.jpg",
  "twitterCard": "summary_large_image"
}
```

---

## Backward Compatibility

### Legacy Flat Fields
The following flat fields are **still supported** for backward compatibility:

- `imageUrl`, `imageAlt`, `imageWidth`, `imageHeight` -> Mapped to `imagesJson.avatar`
- `metaTitle`, `metaDescription` -> Mapped to `seoJson`
- `canonicalUrl` -> Mapped to `seoJson.canonical`

### API Transformations

**Request (Frontend -> API):**
- Accepts both flat fields AND JSON fields
- Automatically converts flat fields to JSON if needed
- Example: `imageUrl` -> `imagesJson.avatar.variants.original.url`

**Response (API -> Frontend):**
- Returns BOTH JSON fields AND flat fields
- Flat fields are extracted from JSON for compatibility
- Example: `imagesJson.avatar.variants.original.url` -> also available as `imageUrl`

---
## Migration Strategy

### Phase 1 (Current)
- JSON fields are used internally
- Flat fields are auto-generated from JSON
- Frontend can use either format

### Phase 2 (Future)
- Update frontend to use JSON fields directly
- Deprecate flat field usage
- Add migration script

### Phase 3 (Long-term)
- Remove flat fields entirely
- JSON fields only

---

## API Helper Functions

### Request Transformation
```typescript
import { transformAuthorRequestBody } from '@modules/authors';

// Handles both formats automatically
const data = transformAuthorRequestBody(body);
```

### Response Transformation
```typescript
import { transformAuthorResponse } from '@modules/authors';

// Adds flat fields for backward compatibility
const author = transformAuthorResponse(dbAuthor);
```

---

## Frontend Usage Examples

### Creating Author with JSON Fields
```javascript
const authorData = {
  name: "John Doe",
  email: "john@example.com",
  slug: "john-doe",
  imagesJson: JSON.stringify({
    avatar: {
      alt: "John Doe",
      variants: {
        original: {
          url: "/images/authors/john-avatar.webp",
          width: 400,
          height: 400
        }
      }
    }
  }),
  bioJson: JSON.stringify({
    short: "Award-winning Chef",
    socials: [
      { network: "instagram", url: "https://instagram.com/johndoe", label: "@johndoe" },
      { network: "website", url: "https://johndoe.com", label: "Website" }
    ]
  })
};

await authorsAPI.create(authorData);
```

### Backward Compatible (Legacy Format)
```javascript
const authorData = {
  name: "John Doe",
  email: "john@example.com",
  slug: "john-doe",
  imageUrl: "/images/authors/john-avatar.webp",
  imageAlt: "John Doe",
  metaTitle: "John Doe - Chef"
};

// API automatically converts to JSON format
await authorsAPI.create(authorData);
```

