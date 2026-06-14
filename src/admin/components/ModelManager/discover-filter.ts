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
