/**
 * Inline markdown → safe HTML — single shared implementation.
 *
 * One canonical tokenizer + escaper for the inline subset used across the app
 * (bold `**`, italic `*`, bold-italic `***`, links `[label](href)`). Previously
 * duplicated in three places that had drifted apart:
 *   - src/site/components/utils/markdown.ts        (did NOT escape HTML → XSS)
 *   - src/admin/.../BlockEditor/utils/safeInlineHtml.ts (escaped — the safe ref)
 *   - src/admin/.../BlockEditor/blocks/table/TableCell.tsx (its own copy)
 *
 * HTML in text and link labels is ALWAYS escaped before any markup is emitted,
 * and link hrefs go through {@link sanitizeHref}. Link decoration (CSS class,
 * external target/rel) is caller-configurable so the public site keeps its
 * styled/`target=_blank` links while the admin renders plain links — same core,
 * different policy.
 *
 * This is a leaf util (no imports) so both `src/site` and `src/admin` can depend
 * on it without crossing module boundaries.
 */

export interface InlineMarkdownOptions {
  /** Parse `**`/`*`/`***` emphasis. Default: true. */
  allowStyles?: boolean;
  /** Convert `\n` to `<br />`. Default: false. */
  preserveLineBreaks?: boolean;
  /** CSS class applied to rendered `<a>` elements. */
  linkClassName?: string;
  /** Add `target="_blank" rel="noreferrer noopener"` to external (http) links. */
  externalLinkTarget?: boolean;
}

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Escape the five HTML-significant characters. Nullish → empty string. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** Allow only relative, anchor, or http(s)/mailto/tel URLs. Else empty string. */
export const sanitizeHref = (href: string): string => {
  if (!href) return '';
  if (href.startsWith('/') || href.startsWith('#')) return href;
  try {
    const url = new URL(href);
    if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
      return href;
    }
  } catch {
    return '';
  }
  return '';
};

/** Apply emphasis markers to already-escaped text. */
const renderInlineStyles = (value: string): string =>
  value
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>');

/** Build an `<a>` tag from an already-sanitized href and already-escaped label. */
const renderLink = (href: string, label: string, options: InlineMarkdownOptions): string => {
  const attrs = [`href="${escapeHtml(href)}"`];
  if (options.linkClassName) attrs.push(`class="${options.linkClassName}"`);
  if (options.externalLinkTarget && href.startsWith('http')) {
    attrs.push('target="_blank"', 'rel="noreferrer noopener"');
  }
  return `<a ${attrs.join(' ')}>${label}</a>`;
};

/**
 * Render the inline markdown subset to safe HTML.
 *
 * Order is load-bearing: text is escaped FIRST, then emphasis markup is applied,
 * so raw HTML can never reach the output even when adjacent to markdown markers.
 */
export const renderInlineMarkdown = (
  text: string | null | undefined,
  options: InlineMarkdownOptions = {}
): string => {
  const { allowStyles = true, preserveLineBreaks = false } = options;
  const source = String(text ?? '');
  if (!source) return '';

  const styleIf = (chunk: string): string => (allowStyles ? renderInlineStyles(chunk) : chunk);

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  LINK_PATTERN.lastIndex = 0;

  while ((match = LINK_PATTERN.exec(source)) !== null) {
    if (match.index > lastIndex) {
      result += styleIf(escapeHtml(source.slice(lastIndex, match.index)));
    }
    const label = styleIf(escapeHtml(match[1]));
    const safeHref = sanitizeHref((match[2] || '').trim());
    result += safeHref ? renderLink(safeHref, label, options) : label;
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < source.length) {
    result += styleIf(escapeHtml(source.slice(lastIndex)));
  }

  return preserveLineBreaks ? result.replace(/\n/g, '<br />') : result;
};
