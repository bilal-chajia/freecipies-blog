import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { addRecipeVote } from '../articles.service';

const dialect = new SQLiteSyncDialect();

const returning = vi.fn(async () => [
  { recipe_json: JSON.stringify({ aggregate_rating: { rating_value: 4.5, rating_count: 3 } }) },
]);
const where = vi.fn((_condition?: unknown) => ({ returning }));
const set = vi.fn((_values?: unknown) => ({ where }));
const update = vi.fn((_table?: unknown) => ({ set }));

vi.mock('../../../../shared/database/drizzle', () => ({
  getDb: () => ({ update }),
}));

describe('addRecipeVote (atomic)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('performs a single UPDATE with json_set expressions (no read-modify-write)', async () => {
    await addRecipeVote({} as never, 7, 5);
    expect(update).toHaveBeenCalledTimes(1);
    const values = set.mock.calls[0]?.[0];
    expect(values).toBeDefined();
    const setArg = values as Record<string, unknown>;
    // recipe_json and cached_rating_json must be SQL expressions, not JS-computed strings
    const compiled = dialect.sqlToQuery(setArg.recipe_json as never);
    expect(compiled.sql).toContain('json_set');
    expect(compiled.sql).toContain('aggregate_rating');

    const cardJson = dialect.sqlToQuery(setArg.cached_card_json as never);
    expect(cardJson.sql).toContain('json_set');
    expect(cardJson.sql).toContain('cached_card_json');
    expect(cardJson.sql).toContain('$.rating');
  });

  it('returns the new rating parsed from the RETURNING clause', async () => {
    const result = await addRecipeVote({} as never, 7, 5);
    expect(result).toEqual({ ratingValue: 4.5, ratingCount: 3 });
  });

  it('returns null when no row matches (missing/deleted/not a recipe)', async () => {
    returning.mockResolvedValueOnce([]);
    const result = await addRecipeVote({} as never, 999, 4);
    expect(result).toBeNull();
  });

  it('restricts the UPDATE to non-deleted recipes', async () => {
    await addRecipeVote({} as never, 7, 5);
    const condition = where.mock.calls[0]?.[0];
    expect(condition).toBeDefined();
    const { sql, params } = dialect.sqlToQuery(condition as never);
    expect(sql).toContain('"deleted_at"');
    expect(sql).toContain('"type"');
    expect(params).toContain('recipe');
    expect(params).toContain(7);
  });
});
