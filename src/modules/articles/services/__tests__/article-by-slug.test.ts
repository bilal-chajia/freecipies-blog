import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SQLiteSyncDialect } from 'drizzle-orm/sqlite-core';
import { getArticleBySlug, getArticleById } from '../articles.service';

const dialect = new SQLiteSyncDialect();

// --- Mocks for getArticleBySlug (drizzle.query.articles.findFirst + tags chain) ---
const findFirst = vi.fn(async (_args?: unknown) => null);
const orderBy = vi.fn(async () => [] as unknown[]);
const tagsWhere = vi.fn(() => ({ orderBy }));
const innerJoin = vi.fn(() => ({ where: tagsWhere }));
const tagsFrom = vi.fn(() => ({ innerJoin }));
const select = vi.fn<() => { from: unknown }>(() => ({ from: tagsFrom }));

vi.mock('../../../../shared/database/drizzle', () => ({
  getDb: () => ({
    query: { articles: { findFirst } },
    select,
  }),
}));

describe('getArticleBySlug workflow_status option', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    select.mockImplementation(() => ({ from: tagsFrom }));
  });

  it('does not filter by workflow_status by default (admin/preview compat)', async () => {
    await getArticleBySlug({} as never, 'my-recipe', 'recipe');
    const args = findFirst.mock.calls[0][0] as { where: never };
    const { sql } = dialect.sqlToQuery(args.where);
    expect(sql).not.toContain('workflow_status');
  });

  it('adds workflow_status condition when option is passed', async () => {
    await getArticleBySlug({} as never, 'my-recipe', 'recipe', { workflow_status: 'published' });
    const args = findFirst.mock.calls[0][0] as { where: never };
    const { sql, params } = dialect.sqlToQuery(args.where);
    expect(sql).toContain('"workflow_status"');
    expect(params).toContain('published');
  });

  it('still filters slug, type and soft delete', async () => {
    await getArticleBySlug({} as never, 'my-recipe', 'recipe', { workflow_status: 'published' });
    const args = findFirst.mock.calls[0][0] as { where: never };
    const { sql, params } = dialect.sqlToQuery(args.where);
    expect(sql).toContain('"slug"');
    expect(sql).toContain('"type"');
    expect(sql).toContain('"deleted_at"');
    expect(params).toContain('my-recipe');
    expect(params).toContain('recipe');
  });
});

// --- Mocks for getArticleById (select/from/leftJoin/leftJoin/where/get chain) ---
const get = vi.fn(async () => undefined);
const idWhere = vi.fn<(condition: unknown) => { get: typeof get }>(() => ({ get }));
const leftJoin2 = vi.fn(() => ({ where: idWhere }));
const leftJoin1 = vi.fn(() => ({ leftJoin: leftJoin2 }));
const idFrom = vi.fn(() => ({ leftJoin: leftJoin1 }));
const idSelect = vi.fn(() => ({ from: idFrom }));

describe('getArticleById workflow_status option', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-mock select for the ID chain: getDb is called per function,
    // so swap the implementation used by the module-level mock.
    select.mockImplementation(() => ({ from: idFrom }));
  });

  it('adds workflow_status condition when option is passed', async () => {
    await getArticleById({} as never, 42, { workflow_status: 'published' });
    const condition = idWhere.mock.calls[0][0];
    const { sql, params } = dialect.sqlToQuery(condition as never);
    expect(sql).toContain('"workflow_status"');
    expect(params).toContain('published');
  });

  it('does not filter by workflow_status by default', async () => {
    await getArticleById({} as never, 42);
    const condition = idWhere.mock.calls[0][0];
    const { sql } = dialect.sqlToQuery(condition as never);
    expect(sql).not.toContain('"workflow_status"');
  });
});
