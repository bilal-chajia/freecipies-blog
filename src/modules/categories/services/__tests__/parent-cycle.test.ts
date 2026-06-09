import { describe, expect, it } from 'vitest';
import { wouldCreateParentCycle } from '../categories.service';

// parentOf: id -> parent_id (null = root)
function lookup(map: Record<number, number | null>) {
  return async (id: number): Promise<number | null> => (id in map ? map[id] : null);
}

describe('wouldCreateParentCycle', () => {
  it('returns false for root (no parent)', async () => {
    expect(await wouldCreateParentCycle(1, null, lookup({}))).toBe(false);
    expect(await wouldCreateParentCycle(1, undefined, lookup({}))).toBe(false);
  });

  it('detects self-parenting', async () => {
    expect(await wouldCreateParentCycle(5, 5, lookup({}))).toBe(true);
  });

  it('detects an indirect cycle (5 -> 3 -> 5)', async () => {
    // Setting 5.parent = 3, where 3.parent already = 5
    expect(await wouldCreateParentCycle(5, 3, lookup({ 3: 5 }))).toBe(true);
  });

  it('allows a valid deeper parent', async () => {
    // Setting 5.parent = 3, chain 3 -> 1 -> root, no 5 in chain
    expect(await wouldCreateParentCycle(5, 3, lookup({ 3: 1, 1: null }))).toBe(false);
  });

  it('terminates on a pre-existing cycle not involving the target', async () => {
    // 3 -> 2 -> 3 loop; target 9 never appears
    expect(await wouldCreateParentCycle(9, 3, lookup({ 3: 2, 2: 3 }))).toBe(false);
  });
});
