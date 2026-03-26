interface RenderInlineMarkdownOptions {
    allowStyles?: boolean;
    preserveLineBreaks?: boolean;
}

const LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g;

export const escapeHtml = (value: unknown): string =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

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

export const renderInlineStyles = (value: string): string =>
    value
        .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<em>$1</em>');

export const renderInlineMarkdownHtml = (
    text: string | null | undefined,
    options: RenderInlineMarkdownOptions = {}
): string => {
    const { allowStyles = false, preserveLineBreaks = true } = options;
    const source = String(text || '');
    if (!source) return '';

    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = LINK_PATTERN.exec(source)) !== null) {
        if (match.index > lastIndex) {
            const chunk = escapeHtml(source.slice(lastIndex, match.index));
            result += allowStyles ? renderInlineStyles(chunk) : chunk;
        }
        const label = escapeHtml(match[1]);
        const safeHref = sanitizeHref((match[2] || '').trim());
        const styledLabel = allowStyles ? renderInlineStyles(label) : label;
        if (safeHref) {
            result += `<a href="${escapeHtml(safeHref)}">${styledLabel}</a>`;
        } else {
            result += styledLabel;
        }
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < source.length) {
        const tail = escapeHtml(source.slice(lastIndex));
        result += allowStyles ? renderInlineStyles(tail) : tail;
    }

    return preserveLineBreaks ? result.replace(/\n/g, '<br />') : result;
};

export const toInlineMarkdownHtml = (
    text: string | null | undefined,
    options?: RenderInlineMarkdownOptions
): { __html: string } => ({
    __html: renderInlineMarkdownHtml(text, options),
});
