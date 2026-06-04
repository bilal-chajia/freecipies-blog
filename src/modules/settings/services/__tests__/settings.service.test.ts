import { describe, expect, it } from 'vitest';
import {
  TOC_DEFAULTS,
  normalizeTocSettings,
  type TocSettings,
} from '../../types/settings.types';

describe('normalizeTocSettings', () => {
  it('keeps canonical snake_case TOC settings', () => {
    const settings: Partial<TocSettings> = {
      default_open: false,
      show_jump_button: false,
      accent_color: '#111111',
      max_depth: 3,
    };

    expect(normalizeTocSettings(settings)).toEqual({
      ...TOC_DEFAULTS,
      ...settings,
    });
  });

  it('ignores camelCase TOC aliases', () => {
    const legacy = {
      defaultOpen: false,
      showJumpButton: false,
      accentColor: '#222222',
      maxDepth: 2,
    } as Partial<TocSettings>;

    expect(normalizeTocSettings(legacy)).toMatchObject({
      default_open: TOC_DEFAULTS.default_open,
      show_jump_button: TOC_DEFAULTS.show_jump_button,
      accent_color: TOC_DEFAULTS.accent_color,
      max_depth: TOC_DEFAULTS.max_depth,
    });
  });
});
