import { describe, it, expect } from 'vitest';
import {
  resolveRoundupBadges,
  DEFAULT_ROUNDUP_BADGES,
  ROUNDUP_BADGES,
} from '../roundup-badges';
import type { RoundupItem } from '../../types/roundups.types';

const baseItem = (overrides: Partial<RoundupItem> = {}): RoundupItem => ({
  position: 1,
  source_type: 'internal_recipe',
  title: 'Test',
  ...overrides,
});

describe('resolveRoundupBadges', () => {
  it('falls back to the default selection when none provided', () => {
    const item = baseItem({
      recipe: { total_time_minutes: 20, difficulty: 'easy' },
      rating: { rating_value: 4.5 },
    });
    const badges = resolveRoundupBadges(item, undefined);
    expect(badges.map((b) => b.key)).toEqual(DEFAULT_ROUNDUP_BADGES);
    expect(badges.find((b) => b.key === 'total_time')?.text).toBe('20 min');
    expect(badges.find((b) => b.key === 'difficulty')?.text).toBe('Easy');
    expect(badges.find((b) => b.key === 'rating')?.text).toBe('4.5');
  });

  it('omits badges with no backing data', () => {
    const item = baseItem({ recipe: { total_time_minutes: 20 } });
    const badges = resolveRoundupBadges(item, ['total_time', 'calories', 'difficulty']);
    expect(badges.map((b) => b.key)).toEqual(['total_time']);
  });

  it('preserves the requested order', () => {
    const item = baseItem({
      recipe: { total_time_minutes: 20, calories_per_serving: 320, protein_g: 25 },
    });
    const badges = resolveRoundupBadges(item, ['protein', 'calories', 'total_time']);
    expect(badges.map((b) => b.key)).toEqual(['protein', 'calories', 'total_time']);
    expect(badges[0].text).toBe('25g protein');
  });

  it('resolves diet flags only when the snapshot marks them true', () => {
    const item = baseItem({
      recipe: { badges: { is_vegan: true, is_gluten_free: false } },
    });
    const badges = resolveRoundupBadges(item, ['is_vegan', 'is_gluten_free']);
    expect(badges.map((b) => b.text)).toEqual(['Vegan']);
  });

  it('ignores unknown badge keys', () => {
    const item = baseItem({ recipe: { total_time_minutes: 10 } });
    const badges = resolveRoundupBadges(item, ['nope', 'total_time']);
    expect(badges.map((b) => b.key)).toEqual(['total_time']);
  });

  it('every badge def has a unique key and non-empty icon', () => {
    const keys = ROUNDUP_BADGES.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(ROUNDUP_BADGES.every((b) => b.icon.length > 0)).toBe(true);
  });
});
