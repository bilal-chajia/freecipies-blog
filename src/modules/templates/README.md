# Template Module

> Core module for Pinterest pin template management - types, services, and API handlers.

## Overview

This module provides the backend logic for template management:

- **Schema** - Drizzle ORM table definition
- **Types** - TypeScript interfaces for templates and elements
- **Services** - CRUD operations with Drizzle
- **API Handlers** - Reusable request handlers
- **Utils** - Placeholder substitution

> **Note:** UI components (PinCanvas, TemplateEditor, etc.) remain in `src/admin/` due to dependencies on admin stores and services.

## Usage

```typescript
import {
  // Types
  type Template,
  type TemplateElement,
  type TextElement,
  type ImageElement,
  type ArticleData,

  // API Handlers
  handleListTemplates,
  handleGetTemplate,
  handleCreateTemplate,
  handleUpdateTemplate,
  handleDeleteTemplate,

  // Utils
  substitutePlaceholders,
  hasBinding,
  SUPPORTED_PLACEHOLDERS,
} from "@modules/templates";
```

## API Handlers

Use in Astro API routes:

```typescript
// src/pages/api/templates.ts
import { handleListTemplates } from "@modules/templates";

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env as Env;
  return handleListTemplates(env.DB);
};
```

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
├── api/
│   ├── handlers.ts             # D1 request handlers
│   └── index.ts
├── utils/
│   ├── placeholders.ts         # Variable substitution
│   └── index.ts
├── index.ts                    # Module export
└── README.md
```
