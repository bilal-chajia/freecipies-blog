const STORAGE_KEY = 'saas-blog.bookmarks';

const normalizeSlug = (slug: string | null | undefined): string => {
  if (!slug || typeof slug !== 'string') return '';
  return slug.trim().toLowerCase();
};

const readBookmarks = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(normalizeSlug).filter(Boolean) : [];
  } catch {
    return [];
  }
};

const writeBookmarks = (bookmarks: string[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
    window.dispatchEvent(new CustomEvent('bookmarks:updated', { detail: bookmarks }));
  } catch {
    // Ignore storage write errors.
  }
};

const setButtonState = (button: HTMLElement, isActive: boolean): void => {
  button.dataset.bookmarked = isActive ? 'true' : 'false';
  button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
};

const updateButtons = (): void => {
  const bookmarks = readBookmarks();
  document.querySelectorAll<HTMLElement>('[data-bookmark-button]').forEach((button) => {
    const slug = normalizeSlug(button.dataset.bookmarkSlug);
    setButtonState(button, slug ? bookmarks.includes(slug) : false);
  });
};

const toggleBookmark = (slug: string | null | undefined): void => {
  const normalized = normalizeSlug(slug);
  if (!normalized) return;
  const bookmarks = readBookmarks();
  const next = bookmarks.includes(normalized)
    ? bookmarks.filter((item) => item !== normalized)
    : [...bookmarks, normalized];
  writeBookmarks(next);
  updateButtons();
};

const handleBookmarkClick = (event: MouseEvent): void => {
  const button = (event.target as HTMLElement).closest<HTMLElement>('[data-bookmark-button]');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  toggleBookmark(button.dataset.bookmarkSlug);
};

document.addEventListener('click', handleBookmarkClick);
document.addEventListener('DOMContentLoaded', updateButtons);
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) updateButtons();
});
window.addEventListener('bookmarks:updated', updateButtons);

export { readBookmarks, toggleBookmark };
