import { nanoid } from 'nanoid';

/**
 * Generates a clean, unique slug for a new template.
 * Format: clean-name-nanoid(6)
 * Example: "My Design" -> "my-design-x8k9Lm"
 */
export function generateSlug(name: string): string {
    const base = (name || 'untitled')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with dashes
        .replace(/^-|-$/g, '');      // Trim leading/trailing dashes

    // nanoid(6) provides enough entropy for this context while keeping URLs short
    return `${base}-${nanoid(6)}`;
}

/**
 * Generates a clean duplicata slug, removing previous suffixes.
 * Format: clean-original-name-copy-nanoid(6)
 * Example: "my-design-12345-copy-67890" -> "my-design-copy-Zn7k2x"
 */
export function cleanDuplicateSlug(oldSlug: string): string {
    let base = oldSlug;

    // 1. Remove previous copy suffix iterations (e.g., -copy-12345, -copy-xyZ123)
    // Matches "-copy-" followed by any characters until the end
    base = base.replace(/-copy-.*$/, '');

    // 2. Remove trailing 13-digit timestamps (old format)
    // e.g., my-design-1736789012345
    base = base.replace(/-\d{13}$/, '');

    // 3. Remove trailing nanoid-like IDs (approx 6-10 chars at end) if we want pure base
    // This regex looks for -[alphanum] at end of string
    // Let's be careful not to remove "version-2" type names.
    // For now, steps 1 & 2 handle the bulk of "ugly stacking".

    return `${base}-copy-${nanoid(6)}`;
}
