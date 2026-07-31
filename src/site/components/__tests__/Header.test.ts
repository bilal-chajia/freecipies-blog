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

  it('provides an accessible live-results region inside the full-screen dialog', async () => {
    const source = await readFile(headerPath, 'utf8');

    expect(source).toContain('aria-labelledby="search-title"');
    expect(source).toContain('id="search-status"');
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('id="search-results"');
    expect(source).toContain('class="search-modal-results"');
  });

  it('resets interrupted searches and only handles Escape while the dialog is open', async () => {
    const source = await readFile(headerPath, 'utf8');
    const closeStart = source.indexOf('const closeSearchModal = () => {');
    const closeEnd = source.indexOf('searchBtn?.addEventListener', closeStart);
    const closeMarkup = source.slice(closeStart, closeEnd);

    expect(source).toContain('aria-label="Search recipes"');
    expect(closeMarkup).toContain('searchInput.value = ""');
    expect(closeMarkup).toContain('clearSearchResults()');
    expect(source).toContain(
      'e.key === "Escape" && searchModal?.classList.contains("active")',
    );
    expect(source).toContain('if (!payload.success)');
  });
});
