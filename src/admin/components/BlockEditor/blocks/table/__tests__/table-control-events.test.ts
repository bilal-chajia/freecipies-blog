import { describe, expect, it, vi } from 'vitest';
import { createTableControlTriggerGuard } from '../table-control-events';

describe('table control event guard', () => {
  it('triggers on pointerdown and ignores the following mousedown/click from the same gesture', () => {
    const onTrigger = vi.fn();
    const guard = createTableControlTriggerGuard(onTrigger);

    expect(guard()).toBe(true);
    expect(guard()).toBe(false);
    expect(guard()).toBe(false);
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('allows a later gesture after reset', () => {
    const onTrigger = vi.fn();
    const guard = createTableControlTriggerGuard(onTrigger);

    expect(guard()).toBe(true);
    guard.reset();

    expect(guard()).toBe(true);
    expect(onTrigger).toHaveBeenCalledTimes(2);
  });
});
