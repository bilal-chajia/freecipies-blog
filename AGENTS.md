# Agent Instructions

## Issue Tracking with bd (beads)

IMPORTANT: This project uses bd (beads) for ALL issue tracking. Do NOT use markdown TODOs, task lists, or other tracking methods.

### Why bd?

- Dependency-aware: Track blockers and relationships between issues
- Git-friendly: Auto-syncs to JSONL for version control
- Agent-optimized: JSON output, ready work detection, discovered-from links
- Prevents duplicate tracking systems and confusion

### Quick Start

Check for ready work:
```bash
bd ready --json
```

Create new issues:
```bash
bd create "Issue title" -t bug|feature|task -p 0-4 --json
bd create "Issue title" -p 1 --deps discovered-from:bd-123 --json
bd create "Subtask" --parent <epic-id> --json  # Hierarchical subtask (gets ID like epic-id.1)
```

Claim and update:
```bash
bd update bd-42 --status in_progress --json
bd update bd-42 --priority 1 --json
```

Complete work:
```bash
bd close bd-42 --reason "Completed" --json
```

### Issue Types

- bug - Something broken
- feature - New functionality
- task - Work item (tests, docs, refactoring)
- epic - Large feature with subtasks
- chore - Maintenance (dependencies, tooling)

### Priorities

- 0 - Critical (security, data loss, broken builds)
- 1 - High (major features, important bugs)
- 2 - Medium (default, nice-to-have)
- 3 - Low (polish, optimization)
- 4 - Backlog (future ideas)

### Workflow for AI Agents

1. Check ready work: bd ready shows unblocked issues
2. Claim your task: bd update <id> --status in_progress
3. Work on it: Implement, test, document
4. Discover new work? Create linked issue:
   - bd create "Found bug" -p 1 --deps discovered-from:<parent-id>
5. Complete: bd close <id> --reason "Done"
6. Commit together: Always commit the .beads/issues.jsonl file together with the code changes so issue state stays in sync with code state

### Auto-Sync

bd automatically syncs with git:
- Exports to .beads/issues.jsonl after changes (5s debounce)
- Imports from JSONL when newer (e.g., after git pull)
- No manual export/import needed!

### GitHub Copilot Integration

If using GitHub Copilot, also create .github/copilot-instructions.md for automatic instruction loading.
Run bd onboard to get the content, or see step 2 of the onboard instructions.

### MCP Server (Recommended)

If using Claude or MCP-compatible clients, install the beads MCP server:

```bash
pip install beads-mcp
```

Add to MCP config (e.g., ~/.config/claude/config.json):
```json
{
  "beads": {
    "command": "beads-mcp",
    "args": []
  }
}
```

Then use mcp__beads__* functions instead of CLI commands.

### Managing AI-Generated Planning Documents

AI assistants often create planning and design documents during development:
- PLAN.md, IMPLEMENTATION.md, ARCHITECTURE.md
- DESIGN.md, CODEBASE_SUMMARY.md, INTEGRATION_PLAN.md
- TESTING_GUIDE.md, TECHNICAL_DESIGN.md, and similar files

Best Practice: Use a dedicated directory for these ephemeral files

Recommended approach:
- Create a history/ directory in the project root
- Store ALL AI-generated planning/design docs in history/
- Keep the repository root clean and focused on permanent project files
- Only access history/ when explicitly asked to review past planning

Example .gitignore entry (optional):
```
# AI planning documents (ephemeral)
history/
```

Benefits:
- Clean repository root
- Clear separation between ephemeral and permanent documentation
- Easy to exclude from version control if desired
- Preserves planning history for archeological research
- Reduces noise when browsing the project

### CLI Help

Run bd <command> --help to see all available flags for any command.
For example: bd create --help shows --parent, --deps, --assignee, etc.

### Important Rules

- Use bd for ALL task tracking
- Always use --json flag for programmatic use
- Link discovered work with discovered-from dependencies
- Check bd ready before asking "what should I work on?"
- Store AI planning docs in history/ directory
- Run bd <cmd> --help to discover available flags
- Do NOT create markdown TODO lists
- Do NOT use external issue trackers
- Do NOT duplicate tracking systems
- Do NOT clutter repo root with planning documents

For more details, see README.md and QUICKSTART.md.

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Database Schema (Source of Truth)

> **CRITICAL:** `db/schema.sql` is the **SINGLE SOURCE OF TRUTH** for the database schema.

- **Source of truth:** `db/schema.sql`
- **Documentation:** `db/DATABASE_SCHEMA.md`
- **Drizzle schemas:** `src/modules/*/schema/*.schema.ts` (keep in sync with `db/schema.sql`)

When modifying the database:
1. Edit `db/schema.sql` first
2. Update `db/DATABASE_SCHEMA.md` documentation
3. Update the related Drizzle schemas in `src/modules/*/schema/*.schema.ts` to match

## TypeScript Content Types

For the `articles` module, we use polymorphic types to distinguish between content kinds.

- **Source of Truth:** `src/modules/articles/types/articles.types.ts`
- **Generics:** Use `AnyContent` (alias `HydratedArticle`) for lists containing mixed types.
- **Specifics:** Use `RecipeContent` or `RoundupContent` when the type is known.
- **Do NOT** use the raw DB `Article` type for frontend components; use the hydrated types.

## Quick Reference

**Note:** `bd` is installed via Go. Full path: `C:\Users\Poste\go\bin\bd.exe`

```bash
C:\Users\Poste\go\bin\bd.exe ready              # Find available work
C:\Users\Poste\go\bin\bd.exe show <id>          # View issue details
C:\Users\Poste\go\bin\bd.exe update <id> --status in_progress  # Claim work
C:\Users\Poste\go\bin\bd.exe close <id>         # Complete work
C:\Users\Poste\go\bin\bd.exe sync               # Sync with git
```


## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd sync
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds

## Cache Rebuild Triggers (Articles Table)

When saving an article, rebuild these cached fields in the API/Worker:

| Cached Field | Rebuild When |
|--------------|--------------|
| `faqs_json` | content_json changes (scan for faq_section blocks) |
| `cached_toc_json` | content_json changes (scan for heading blocks) |
| `cached_tags_json` | articles_to_tags changes |
| `cached_category_json` | category_id changes OR category table updates |
| `cached_author_json` | author_id changes OR authors table updates |
| `cached_equipment_json` | recipe_json.equipment changes OR equipment table updates |
| `cached_rating_json` | recipe_json.aggregateRating changes |
| `cached_recipe_json` | recipe_json changes |
| `reading_time_minutes` | content_json changes |
| `jsonld_json` | Any SEO-relevant field changes |

**Implementation Pattern:**
```javascript
// In article save handler:
async function saveArticle(articleData) {
  // 1. Rebuild all caches before save
  articleData.faqs_json = extractFAQs(articleData.content_json);
  articleData.cached_toc_json = generateTOC(articleData.content_json);
  articleData.cached_author_json = await getAuthorSnapshot(articleData.author_id);
  articleData.cached_category_json = await getCategorySnapshot(articleData.category_id);
  // ... other caches
  
  // 2. Save to database
  await db.insert(articles).values(articleData);
  
  // 3. Purge CDN cache for this article
  await purgeCache(`/recipes/${articleData.slug}`);
}
```

## Drizzle Query Patterns

Optimized field selection for different use cases:

```typescript
// --------------------------------------------------------------------
// LISTING PAGES (Minimal fields for cards)
// --------------------------------------------------------------------
const listingFields = {
  slug: articles.slug,
  headline: articles.headline,
  images_json: articles.images_json,
  cached_recipe_json: articles.cached_recipe_json,
  cached_author_json: articles.cached_author_json,
  cached_category_json: articles.cached_category_json,
  cached_tags_json: articles.cached_tags_json,
  published_at: articles.published_at,
};

const recipes = await db
  .select(listingFields)
  .from(articles)
  .where(and(
    eq(articles.is_online, true),
    isNull(articles.deleted_at)
  ))
  .orderBy(desc(articles.published_at))
  .limit(20);

// --------------------------------------------------------------------
// ARTICLE PAGE (Full data)
// --------------------------------------------------------------------
const article = await db
  .select()
  .from(articles)
  .where(eq(articles.slug, slug))
  .get();

// --------------------------------------------------------------------
// FILTERED RECIPES (By time, difficulty)
// --------------------------------------------------------------------
const quickRecipes = await db
  .select(listingFields)
  .from(articles)
  .where(and(
    eq(articles.is_online, true),
    lte(articles.total_time_minutes, 30),
    eq(articles.type, 'recipe')
  ))
  .orderBy(articles.total_time_minutes);
```

## Content Block Types Reference

Valid block types for `content_json`:

| Category | Types |
|----------|-------|
| **Text** | `paragraph`, `heading`, `blockquote`, `list` |
| **Media** | `image`, `gallery`, `video` |
| **Callouts** | `tip_box`, `cta_button` |
| **Embeds** | `embed`, `recipe_card`, `product_card` |
| **Layout** | `divider`, `spacer`, `ad_slot`, `table` |
| **Food Blog** | `before_after`, `ingredient_spotlight`, `faq_section` |

## Image Breakpoints

Standard responsive sizes (pixels):

| Variant | Width | Use Case |
|---------|-------|----------|
| `xs` | 360 | Mobile thumbnails |
| `sm` | 720 | Mobile full-width |
| `md` | 1200 | Tablet / small desktop |
| `lg` | 2048 | Full desktop / retina |
| `original` | >2048 | Optional, hero images only |

**Avatar exception:** 50, 100, 200, 400 (smaller for profile images)

