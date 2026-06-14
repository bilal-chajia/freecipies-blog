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
