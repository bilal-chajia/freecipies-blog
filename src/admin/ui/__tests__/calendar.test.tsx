import type React from 'react';
import { describe, expect, it } from 'vitest';
import { Calendar, buildCalendarClassNames } from '../calendar';

describe('Calendar DayPicker 10 contract', () => {
  it('uses the DayPicker 10 month_grid key', () => {
    expect(buildCalendarClassNames({}, {}).month_grid).toBe('w-full border-collapse');
  });

  it('passes the same key into the wrapper element', () => {
    const element = Calendar({ mode: 'single' }) as React.ReactElement<{
      classNames: Record<string, string>;
    }>;

    expect(element.props.classNames.month_grid).toBe('w-full border-collapse');
  });
});
