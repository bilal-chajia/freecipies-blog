export function sanitizeHref(href: string): string {
  if (!href) return "";
  const trimmed = href.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) {
      return trimmed;
    }
  } catch {
    return "";
  }
  return "";
}

export function renderInlineMarkdown(text?: string): string {
  const source = String(text || "");
  if (!source) return "";
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;

  const withLinks = source.replace(pattern, (_, label, href) => {
    const safeHref = sanitizeHref(href || "");
    if (!safeHref) return label;
    const isExternal = safeHref.startsWith("http");
    const target = isExternal ? ' target="_blank"' : "";
    const rel = isExternal ? ' rel="noreferrer noopener"' : "";
    return `<a href="${safeHref}" class="text-[var(--info-text)] underline underline-offset-2"${target}${rel}>${label}</a>`;
  });

  return withLinks
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+?)\*/g, "<em>$1</em>");
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
