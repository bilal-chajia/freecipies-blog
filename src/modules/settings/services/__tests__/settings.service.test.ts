import { describe, expect, it } from 'vitest';
import {
  TOC_DEFAULTS,
  normalizeTocSettings,
  type LegacyTocSettings,
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

  it('normalizes legacy camelCase TOC settings to snake_case', () => {
    const legacy: Partial<LegacyTocSettings> = {
      defaultOpen: false,
      showJumpButton: false,
      accentColor: '#222222',
      maxDepth: 2,
    };

    expect(normalizeTocSettings(legacy)).toMatchObject({
      default_open: false,
      show_jump_button: false,
      accent_color: '#222222',
      max_depth: 2,
    });
  });
});
