import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const headerPath = fileURLToPath(new URL('../Header.astro', import.meta.url));

describe('Header search modal', () => {
  it('renders outside the contained header so its fixed overlay uses the viewport', async () => {
    const source = await readFile(headerPath, 'utf8');
    const headerEnd = source.indexOf('</header>');
    const headerMarkup = source.slice(0, headerEnd);
    const followingMarkup = source.slice(headerEnd);

    expect(headerMarkup).not.toContain('id="search-modal"');
    expect(followingMarkup).toContain('id="search-modal"');
  });
});
