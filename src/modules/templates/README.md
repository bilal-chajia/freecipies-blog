# Template Module

> Core module for Pinterest pin template management - types, schema, services, and utilities.

## Overview

This module provides comprehensive template management functionality:

- **Schema** - Drizzle ORM table definition
- **Types** - TypeScript interfaces for templates and elements
- **Services** - CRUD operations with Drizzle
- **Utils** - Placeholder substitution, font loading

## Usage

```typescript
import {
  // Types
  type Template,
  type TemplateElement,
  type TextElement,
  type ImageElement,
  type ArticleData,

  // Utils
  substitutePlaceholders,
  hasBinding,
  SUPPORTED_PLACEHOLDERS,
} from "@modules/templates";

import { TemplateEditor, PinCanvas } from "@admin/features/templates/components";
import { useEditorStore } from "@admin/features/templates/store";
```

## API Endpoints

Template API routes are handled via `/api/templates`:

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/templates` | List templates | No |
| GET | `/api/templates/:slug` | Get template by slug | No |
| POST | `/api/templates` | Create template | Yes |
| PUT | `/api/templates/:slug` | Update template | Yes |
| DELETE | `/api/templates/:slug` | Delete template | Yes |

## Element Types

| Type      | Description                               |
| --------- | ----------------------------------------- |
| `text`    | Text with font, color, alignment, binding |
| `image`   | Image with fit, clipping, binding         |
| `shape`   | Rectangle, circle, etc.                   |
| `logo`    | Brand logo                                |
| `overlay` | Semi-transparent layer                    |

## Placeholder Substitution

```typescript
import { substitutePlaceholders } from "@modules/templates";

const text = "Recipe: {{article.title}}";
const article = { title: "Chocolate Cake" };
const result = substitutePlaceholders(text, article);
// → "Recipe: Chocolate Cake"
```

**Supported Placeholders:**
- `{{article.title}}` - Article headline
- `{{article.image}}` - Article cover image
- `{{author.name}}` - Author name
- `{{author.avatar}}` - Author avatar
- `{{category.label}}` - Category name

## File Structure

```
src/modules/templates/
├── schema/
│   └── templates.schema.ts     # Drizzle table
├── types/
│   ├── elements.types.ts       # Element interfaces
│   ├── templates.types.ts      # Template interfaces
│   └── index.ts
├── services/
│   └── templates.service.ts    # Drizzle CRUD
├── utils/
│   ├── placeholders.ts         # Variable substitution
│   ├── fontLoader.ts           # Google Fonts loader
│   └── index.ts
├── index.ts                    # Module export
└── README.md
```

## Admin Integration

Template editor UI lives in `src/admin/features/templates/` so the domain module stays server-safe.

```typescript
import { TemplateEditor } from "@admin/features/templates/components";
import { useEditorStore } from "@admin/features/templates/store";
```

## Key Features

- **Data binding** - Template placeholders bind to article data
- **Font loading** - Dynamic Google Fonts loading with opentype.js
