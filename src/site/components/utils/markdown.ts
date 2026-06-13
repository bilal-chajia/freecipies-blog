import {
  renderInlineMarkdown as renderInlineMarkdownShared,
  sanitizeHref as sanitizeHrefShared,
} from "@shared/utils/inline-markdown";

/** Public-site link styling applied to rendered inline links. */
const SITE_LINK_CLASS = "text-[var(--info-text)] underline underline-offset-2";

export function sanitizeHref(href: string): string {
  return sanitizeHrefShared(String(href ?? "").trim());
}

export function renderInlineMarkdown(text?: string): string {
  return renderInlineMarkdownShared(text, {
    linkClassName: SITE_LINK_CLASS,
    externalLinkTarget: true,
  });
}

/**
 * Render markdown text with \n line breaks as paragraphs.
 * Supports: bold, italic, links, line breaks, and lists (- , * , 1. ).
 */
export function renderMarkdownText(text?: string): string {
  const source = String(text || "");
  if (!source) return "";

  const lines = source
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return "";

  const UL_RE = /^[-*]\s+(.+)$/;
  const OL_RE = /^\d+\.\s+(.+)$/;

  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Unordered list group
    if (UL_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && UL_RE.test(lines[i])) {
        const match = lines[i].match(UL_RE);
        items.push(`<li>${renderInlineMarkdown(match![1])}</li>`);
        i++;
      }
      result.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // Ordered list group
    if (OL_RE.test(line)) {
      const items: string[] = [];
      while (i < lines.length && OL_RE.test(lines[i])) {
        const match = lines[i].match(OL_RE);
        items.push(`<li>${renderInlineMarkdown(match![1])}</li>`);
        i++;
      }
      result.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Regular paragraph
    result.push(`<p>${renderInlineMarkdown(line)}</p>`);
    i++;
  }

  return result.join("");
}
