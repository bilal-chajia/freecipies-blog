# Template Module

> Core module for Pinterest pin template management - types, services, and UI components.

## Overview

This module provides comprehensive template management functionality:

- **Schema** - Drizzle ORM table definition
- **Types** - TypeScript interfaces for templates and elements
- **Services** - CRUD operations with Drizzle
- **Components** - Canvas editor, template list, pin creator
- **Store** - Zustand state management (canvas, UI)
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

  // Components
  TemplateEditor,
  PinCanvas,

  // Store
  useEditorStore,

  // Utils
  substitutePlaceholders,
  hasBinding,
  SUPPORTED_PLACEHOLDERS,
} from "@modules/templates";
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
├── store/
│   ├── useEditorStore.ts       # Canvas state management
│   └── useUIStore.ts           # UI state management
├── components/
│   ├── canvas/                 # Konva canvas components
│   │   ├── PinCanvas.tsx       # Main canvas renderer
│   │   ├── ElementPanel.tsx    # Element controls
│   │   ├── hooks/              # Canvas hooks
│   │   └── modern/             # Modern UI components
│   ├── editor/                 # Editor pages
│   │   ├── TemplateEditor.tsx  # Main editor
│   │   └── TemplatesList.tsx   # Template list view
│   └── pins/                   # Pin components
│       └── TemplateSelector.tsx
├── utils/
│   ├── placeholders.ts         # Variable substitution
│   ├── fontLoader.ts           # Google Fonts loader
│   └── index.ts
├── index.ts                    # Module export
└── README.md
```

## Admin Integration

Import from module in admin pages:

```typescript
// src/admin/pages/TemplatesPage.tsx
import { TemplateEditor, useEditorStore } from "@modules/templates";
```

## Key Features

- **Canvas-based editing** - Konva renderer with draggable, resizable elements
- **Data binding** - Template placeholders bind to article data
- **Font loading** - Dynamic Google Fonts loading with opentype.js
- **Responsive design** - Works with various canvas sizes
- **State management** - Zustand stores for canvas and UI state
