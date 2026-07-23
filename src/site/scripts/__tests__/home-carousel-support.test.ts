import { describe, expect, it } from 'vitest';
import { getCircularSupportPosition } from '../home-carousel-support';

describe('getCircularSupportPosition', () => {
  it('returns the positions of the next two cards', () => {
    expect(getCircularSupportPosition(1, 0, 4)).toBe(1);
    expect(getCircularSupportPosition(2, 0, 4)).toBe(2);
    expect(getCircularSupportPosition(3, 0, 4)).toBeNull();
  });

  it('wraps support positions around the carousel', () => {
    expect(getCircularSupportPosition(0, 3, 4)).toBe(1);
    expect(getCircularSupportPosition(1, 3, 4)).toBe(2);
    expect(getCircularSupportPosition(2, 3, 4)).toBeNull();
  });

  it('supports admin carousels longer than four recipes', () => {
    expect(getCircularSupportPosition(5, 4, 6)).toBe(1);
    expect(getCircularSupportPosition(0, 4, 6)).toBe(2);
    expect(getCircularSupportPosition(1, 4, 6)).toBeNull();
  });

  it('does not expose the selected card', () => {
    expect(getCircularSupportPosition(2, 2, 4)).toBeNull();
  });
});
