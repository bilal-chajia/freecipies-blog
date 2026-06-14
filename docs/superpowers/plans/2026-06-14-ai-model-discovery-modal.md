# AI Model Discovery Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make discovered AI models selectable/addable from a redesigned two-tab "Add Model" modal (Discover + Manual) with search and multi-select, and remove the misleading header "Fetch latest" button.

**Architecture:** Frontend-only. The discovery backend (`GET /api/admin/ai/models/:provider/discover` → `{ supported, models: ReconciledModel[] }`) already works; the current UI discards its response. We add a Discover tab that fetches on open, filters by search, multi-selects, and persists the chosen models with full metadata (`supports_thinking`, `source:'discovered'`) via one `updateSettings` PUT (deep-merge replaces `providers[p].models` / `custom_providers[p].models`). Pure filter/map logic is extracted and unit-tested.

**Tech Stack:** React 19, Zustand, shadcn UI (`@/ui/tabs`, `@/ui/checkbox`, `@/ui/scroll-area`, `@/ui/dialog`), Vitest, Tailwind v4. snake_case for app data keys.

**Spec:** `docs/superpowers/specs/2026-06-14-ai-model-discovery-modal-design.md`

---

## Conventions (read once)

- Run between every task: `pnpm typecheck && pnpm test && pnpm check:boundaries`. All green before each commit.
- `src/admin` must NOT import `@server/*`, `@modules/*`, or Cloudflare bindings. The pure helper defines its own local types (do not import `ReconciledModel` from `@modules/ai`).
- No `any` in production code (`as any` allowed in tests only).
- The discover endpoint response envelope is `{ success, data: { supported, models } }`, so the client reads `response.data.data`.

## File structure

- **Create** `src/admin/components/ModelManager/discover-filter.ts` — pure helpers `filterModels` + `toModelSelection` and local types `DiscoverRow`, `StoredModelInput`.
- **Create** `src/admin/components/ModelManager/__tests__/discover-filter.test.ts` — unit tests for the helpers.
- **Create** `src/admin/components/ModelManager/DiscoverModelsTab.tsx` — Discover tab (fetch on open, search, multi-select, "Add selected").
- **Modify** `src/admin/components/ModelManager.tsx` — convert the Add dialog to two tabs; remove the header "Fetch latest" button + `handleDiscover`/`isDiscovering`/`RefreshCw`; add an `isCustom` prop.
- **Modify** `src/admin/features/settings/pages/tabs/AISettings.tsx` — pass `isCustom` to `ModelManager`.

---

## Task 1: Pure helpers — filter + map (TDD)

**Files:**
- Create: `src/admin/components/ModelManager/discover-filter.ts`
- Test: `src/admin/components/ModelManager/__tests__/discover-filter.test.ts`

- [ ] **Step 1: Write the failing test**

`src/admin/components/ModelManager/__tests__/discover-filter.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { filterModels, toModelSelection, type DiscoverRow } from '../discover-filter';

const row = (over: Partial<DiscoverRow>): DiscoverRow => ({ id: 'x', selected: false, status: 'available', ...over });

describe('filterModels', () => {
  const models = [row({ id: 'gpt-4o', name: 'GPT-4o' }), row({ id: 'o3-mini', name: 'O3 Mini' })];

  it('returns all when the query is blank', () => {
    expect(filterModels(models, '   ')).toHaveLength(2);
  });

  it('matches id and name case-insensitively', () => {
    expect(filterModels(models, 'GPT').map((m) => m.id)).toEqual(['gpt-4o']);
    expect(filterModels(models, 'mini').map((m) => m.id)).toEqual(['o3-mini']);
  });

  it('returns empty when nothing matches', () => {
    expect(filterModels(models, 'zzz')).toEqual([]);
  });
});

describe('toModelSelection', () => {
  it('maps a discovered row to a stored selection with source=discovered', () => {
    const out = toModelSelection(
      row({ id: 'gpt-4o', name: 'GPT-4o', context_window: 128000, supports_thinking: true }),
      3,
    );
    expect(out).toMatchObject({
      id: 'gpt-4o', name: 'GPT-4o', context_window: 128000, modality: 'text',
      supports_thinking: true, enabled: true, order: 3, status: 'available', source: 'discovered',
    });
  });

  it('defaults name to id and preserves a deprecated status', () => {
    const out = toModelSelection(row({ id: 'old-model', status: 'deprecated', deprecated: true }), 0);
    expect(out.name).toBe('old-model');
    expect(out.status).toBe('deprecated');
    expect(out.supports_thinking).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm exec vitest run src/admin/components/ModelManager/__tests__/discover-filter.test.ts`
Expected: FAIL — `Cannot find module '../discover-filter'`.

- [ ] **Step 3: Write the implementation**

`src/admin/components/ModelManager/discover-filter.ts`:
```ts
/**
 * Pure helpers for the Discover tab of the Add Model modal.
 *
 * Local types only — admin must not import from `@modules/*` (boundary rule).
 * `DiscoverRow` mirrors the reconciled row returned by
 * `GET /api/admin/ai/models/:provider/discover`.
 */
export interface DiscoverRow {
  id: string;
  name?: string;
  context_window?: number;
  max_tokens?: number;
  modality?: string;
  supports_thinking?: boolean;
  deprecated?: boolean;
  selected: boolean;
  status: 'available' | 'unavailable' | 'deprecated';
}

/** A stored model-selection object accepted by the settings blob. */
export interface StoredModelInput {
  id: string;
  name?: string;
  context_window?: number;
  max_tokens?: number;
  modality: string;
  supports_thinking?: boolean;
  enabled: boolean;
  order: number;
  deprecated: boolean;
  status: 'available' | 'unavailable' | 'deprecated';
  source: 'discovered' | 'manual';
}

export function filterModels(models: DiscoverRow[], query: string): DiscoverRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return models;
  return models.filter(
    (m) => m.id.toLowerCase().includes(q) || (m.name ?? '').toLowerCase().includes(q),
  );
}

export function toModelSelection(row: DiscoverRow, order: number): StoredModelInput {
  return {
    id: row.id,
    name: row.name ?? row.id,
    context_window: row.context_window,
    max_tokens: row.max_tokens,
    modality: row.modality ?? 'text',
    supports_thinking: row.supports_thinking ?? false,
    enabled: true,
    order,
    deprecated: row.deprecated ?? false,
    status: row.status === 'deprecated' ? 'deprecated' : 'available',
    source: 'discovered',
  };
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm exec vitest run src/admin/components/ModelManager/__tests__/discover-filter.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/admin/components/ModelManager/discover-filter.ts src/admin/components/ModelManager/__tests__/discover-filter.test.ts
git commit -m "feat(admin-ai): pure filter+map helpers for model discovery tab"
```

---

## Task 2: DiscoverModelsTab component

**Files:**
- Create: `src/admin/components/ModelManager/DiscoverModelsTab.tsx`

Note: This is a UI component verified by typecheck + manual E2E (no route-test harness exists in this repo). All testable logic lives in Task 1's helpers.

- [ ] **Step 1: Write the component**

`src/admin/components/ModelManager/DiscoverModelsTab.tsx`:
```tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Checkbox } from '@/ui/checkbox';
import { Badge } from '@/ui/badge';
import { ScrollArea } from '@/ui/scroll-area';
import { DialogFooter } from '@/ui/dialog';
import { aiAPI } from '@/services/api';
import type { ManagedModel } from '../ModelManager';
import { filterModels, toModelSelection, type DiscoverRow } from './discover-filter';

type DiscoverModelsTabProps = {
  provider: string;
  isCustom: boolean;
  existingModels: ManagedModel[];
  onAdded: () => void | Promise<void>;
  onClose: () => void;
};

export function DiscoverModelsTab({ provider, isCustom, existingModels, onAdded, onClose }: DiscoverModelsTabProps) {
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(true);
  const [rows, setRows] = useState<DiscoverRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiAPI.discoverModels(provider);
      const data = response.data.data as { supported: boolean; models: DiscoverRow[] };
      setSupported(data.supported);
      setRows(data.models ?? []);
    } catch (e) {
      const message = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const filtered = useMemo(() => filterModels(rows, query), [rows, query]);
  const selectableChecked = rows.filter((m) => checked.has(m.id) && !m.selected).length;

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    const toAdd = rows.filter((m) => checked.has(m.id) && !m.selected);
    if (toAdd.length === 0) return;
    setSaving(true);
    try {
      const mapped = toAdd.map((m, i) => toModelSelection(m, existingModels.length + i));
      const models = [...existingModels, ...mapped];
      const patch = isCustom
        ? { custom_providers: { [provider]: { models } } }
        : { providers: { [provider]: { models } } };
      const response = await aiAPI.updateSettings(patch);
      if (response.status >= 200 && response.status < 300) {
        toast.success(`Added ${toAdd.length} model${toAdd.length > 1 ? 's' : ''}`);
        await onAdded();
        onClose();
      }
    } catch {
      toast.error('Failed to add selected models');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 py-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchModels}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  if (!supported || rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Discovery is unavailable for this provider. Use the Manual tab or Bulk Import.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search models..."
            className="h-8 pl-7 text-sm"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchModels} className="h-8" title="Refresh">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="h-64 rounded-md border">
        <div className="divide-y">
          {filtered.map((m) => {
            const already = m.selected;
            return (
              <label key={m.id} className="flex items-center gap-2 p-2 text-sm cursor-pointer">
                <Checkbox
                  checked={already || checked.has(m.id)}
                  disabled={already}
                  onCheckedChange={() => toggle(m.id)}
                />
                <span className="flex-1 truncate">{m.name || m.id}</span>
                {already && <Badge variant="outline" className="text-xs px-1 py-0">Already added</Badge>}
                {m.status === 'deprecated' && (
                  <Badge variant="destructive" className="text-xs px-1 py-0">Deprecated</Badge>
                )}
              </label>
            );
          })}
          {filtered.length === 0 && (
            <p className="p-3 text-center text-xs text-muted-foreground">No models match your search.</p>
          )}
        </div>
      </ScrollArea>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleAdd} disabled={selectableChecked === 0 || saving}>
          {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Add selected{selectableChecked > 0 ? ` (${selectableChecked})` : ''}
        </Button>
      </DialogFooter>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors in the new file). `pnpm check:boundaries` must also stay green — the file imports only `@/ui/*`, `@/services/api`, and sibling admin modules.

- [ ] **Step 3: Commit**

```bash
git add src/admin/components/ModelManager/DiscoverModelsTab.tsx
git commit -m "feat(admin-ai): Discover tab — fetch, search, multi-select discovered models"
```

---

## Task 3: Tabbed Add dialog + remove the header "Fetch latest" button

**Files:**
- Modify: `src/admin/components/ModelManager.tsx`

- [ ] **Step 1: Update imports**

At the top of `ModelManager.tsx`:
- Remove `RefreshCw` from the `lucide-react` import (it is no longer used here — it lives in `DiscoverModelsTab`). Keep `Plus, Edit2, Trash2, Power, PowerOff, ChevronDown, ChevronUp`.
- Add these imports after the existing `Dialog` import block:
```ts
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { DiscoverModelsTab } from './ModelManager/DiscoverModelsTab';
```

- [ ] **Step 2: Add the `isCustom` prop**

In `ModelManagerProps`, add:
```ts
    isCustom?: boolean;
```
In the function signature destructure, add `isCustom = false`:
```ts
export function ModelManager({
    provider,
    models = [],
    onUpdate,
    isAddDialogOpen: externalIsAddOpen,
    onAddDialogChange: externalSetIsAddOpen,
    hideHeaderActions = false,
    isCustom = false,
}: ModelManagerProps) {
```

- [ ] **Step 3: Remove the discovery state and handler**

Delete the `const [isDiscovering, setIsDiscovering] = useState(false);` line and delete the entire `handleDiscover` function (the `try/catch` block calling `aiAPI.discoverModels`).

- [ ] **Step 4: Remove the header "Fetch latest" button**

In the header actions block, delete the `<Button ... onClick={handleDiscover} ...>… Fetch latest</Button>` element entirely. Keep `<BulkImportModels .../>` and the `Add Model` button. The block becomes:
```tsx
                {!hideHeaderActions && (
                    <div className="flex items-center gap-1.5">
                        <BulkImportModels provider={provider} onSuccess={onUpdate} />
                        <Button
                            size="sm"
                            onClick={() => setIsAddDialogOpen(true)}
                            className="flex items-center gap-1.5 px-2 text-xs"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Model
                        </Button>
                    </div>
                )}
```

- [ ] **Step 5: Replace the Add Model dialog body with two tabs**

Replace the entire existing `{/* Add Model Dialog */}` `<Dialog>…</Dialog>` block with:
```tsx
            {/* Add Model Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Model</DialogTitle>
                        <DialogDescription>
                            Discover and select models, or add one manually, for {provider}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="discover">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="discover">Discover</TabsTrigger>
                            <TabsTrigger value="manual">Manual</TabsTrigger>
                        </TabsList>

                        <TabsContent value="discover" className="mt-3">
                            {isAddDialogOpen && (
                                <DiscoverModelsTab
                                    provider={provider}
                                    isCustom={isCustom}
                                    existingModels={models}
                                    onAdded={() => onUpdate?.()}
                                    onClose={() => setIsAddDialogOpen(false)}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="manual" className="mt-3">
                            <div className="space-y-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="model-id">Model ID *</Label>
                                    <Input
                                        id="model-id"
                                        value={formData.id}
                                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                        placeholder="e.g., gpt-4o"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="model-name">Display Name *</Label>
                                    <Input
                                        id="model-name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., GPT-4o"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="context-window">Context Window</Label>
                                        <Input
                                            id="context-window"
                                            type="number"
                                            value={formData.context_window}
                                            onChange={(e) => setFormData({ ...formData, context_window: e.target.value })}
                                            placeholder="131072"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="max-tokens">Max Tokens</Label>
                                        <Input
                                            id="max-tokens"
                                            type="number"
                                            value={formData.max_tokens}
                                            onChange={(e) => setFormData({ ...formData, max_tokens: e.target.value })}
                                            placeholder="65536"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleAddModel} disabled={!formData.id || !formData.name}>
                                        Add Model
                                    </Button>
                                </DialogFooter>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
```
(`DialogFooter` is already imported in this file. The `{isAddDialogOpen && …}` guard ensures `DiscoverModelsTab` mounts fresh each open so it re-fetches.)

- [ ] **Step 6: Verify**

Run: `pnpm typecheck && pnpm test && pnpm check:boundaries`
Expected: all green. Grep to confirm the dead handler/button are gone:
`pnpm exec rg -n "handleDiscover|Fetch latest|isDiscovering" src/admin/components/ModelManager.tsx` → no matches.

- [ ] **Step 7: Commit**

```bash
git add src/admin/components/ModelManager.tsx
git commit -m "feat(admin-ai): two-tab Add Model dialog (Discover + Manual); drop dead Fetch latest button"
```

---

## Task 4: Pass `isCustom` from the settings tab

**Files:**
- Modify: `src/admin/features/settings/pages/tabs/AISettings.tsx`

- [ ] **Step 1: Pass the prop**

In the providers map, the `<ModelManager>` is rendered with `provider`, `models`, `onUpdate`, `hideHeaderActions`. The loop already computes `const isCustom = Boolean(settings.custom_providers[provider]);`. Add `isCustom={isCustom}` to the `<ModelManager>` props:
```tsx
                                        <ModelManager
                                            provider={provider}
                                            models={config.models || []}
                                            onUpdate={loadSettings}
                                            hideHeaderActions={false}
                                            isCustom={isCustom}
                                        />
```

- [ ] **Step 2: Verify**

Run: `pnpm typecheck && pnpm test && pnpm check:boundaries`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add src/admin/features/settings/pages/tabs/AISettings.tsx
git commit -m "feat(admin-ai): route built-in vs custom provider into Add Model persistence"
```

---

## Task 5: Final verification + manual E2E

- [ ] **Step 1: Full regression gate**

Run: `pnpm typecheck && pnpm test && pnpm check:boundaries`
Expected: all green.

- [ ] **Step 2: Manual E2E (owner-driven; record results)**

In `pnpm dev`, logged in as admin, Settings → AI → Providers:
1. OpenAI (valid key) → **Add Model** → **Discover** tab auto-fetches a model list (text-only).
2. Type in **Search** → list filters by id/name.
3. Tick 1-2 new models → **Add selected** → toast, modal closes, models appear in the provider's list. **Reload (F5)** → they persist, enabled.
4. Re-open **Add Model → Discover** → the just-added models show **checked + greyed "Already added"** (read-only).
5. A model with `supports_thinking` added this way → in the article editor AI panel, the **reasoning_effort** selector appears for it (confirms `supports_thinking` persisted).
6. **qwen** or **zhipu** → Discover tab shows "Discovery unavailable…"; **Manual** tab still adds a model.
7. Confirm the header **"Fetch latest"** button is gone; **Bulk Import** still present.
8. (Custom provider, if configured) repeat 1-3 to confirm `custom_providers` persistence.

- [ ] **Step 3: Use superpowers:finishing-a-development-branch to integrate.**

---

## Self-Review

- **Spec coverage:** two-tab modal (Task 3) ✓; Discover fetch+search+multi-select (Task 2) ✓; already-added checked+greyed read-only (Task 2, `disabled={already}`) ✓; header button removed (Task 3) ✓; persistence preserves `supports_thinking`+`source:'discovered'` via one `updateSettings` PUT for built-in & custom (Task 2 + `isCustom` Tasks 3/4) ✓; unsupported/empty fallback message (Task 2) ✓; pure helpers unit-tested (Task 1) ✓; manual E2E (Task 5) ✓.
- **Placeholder scan:** none — every component, helper, test, and edit shows full code; the one conditional (`{isAddDialogOpen && <DiscoverModelsTab/>}`) is a mount guard, not a placeholder.
- **Type consistency:** `DiscoverRow`/`StoredModelInput`/`filterModels`/`toModelSelection` are defined in Task 1 and consumed identically in Task 2; `isCustom` prop added in Task 3 and supplied in Task 4; `DiscoverModelsTab` prop names (`provider`, `isCustom`, `existingModels`, `onAdded`, `onClose`) match between definition (Task 2) and usage (Task 3).
- **Boundary safety:** the pure helper defines local types instead of importing `ReconciledModel` from `@modules/ai`, keeping `src/admin` free of `@modules` imports.
- **Backend untouched:** persistence rides the existing `UpdateSettingsSchema` (`models: z.array(z.unknown())` for both `providers` and `custom_providers`) and `mergeAiSettings` deep-merge; no route or schema change.
