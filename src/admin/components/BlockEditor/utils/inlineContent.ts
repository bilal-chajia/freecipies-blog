/**
 * Inline Content Utilities (TypeScript)
 */
import type { InlineNode, ParsedStyles, MarkdownLinkMatch } from './types';

export const getInlineTextLength = (content: string | InlineNode[] | undefined): number => {
    if (!content) return 0;
    if (typeof content === 'string') return content.length;
    if (!Array.isArray(content)) return 0;
    return content.reduce((total: number, node: InlineNode) => {
        if (!node) return total;
        if (typeof node === 'string') return (node as string).length;
        if (node.type === 'text') return total + ((node as any).text || '').length;
        if (node.type === 'link') return total + getInlineTextLength((node as any).content as any);
        return total;
    }, 0);
};

export const truncateInlineContent = (content: string | InlineNode[] | undefined, limit: number): string | InlineNode[] => {
    if (!content) return '';
    if (!limit || limit <= 0) return '';
    if (typeof content === 'string') {
        return content.slice(0, limit);
    }
    if (!Array.isArray(content)) return '';

    let remaining = limit;
    const nodes: InlineNode[] = [];

    const takeText = (text: string, styles: any = {}) => {
        if (!text || remaining <= 0) return;
        const slice = text.slice(0, remaining);
        if (!slice) return;
        remaining -= slice.length;
        nodes.push({ type: 'text', text: slice, styles } as any);
    };

    for (const node of content) {
        if (remaining <= 0) break;
        if (!node) continue;
        if (typeof node === 'string') {
            takeText(node);
            continue;
        }
        if (node.type === 'text') {
            takeText((node as any).text || '', (node as any).styles || {});
            continue;
        }
        if (node.type === 'link') {
            const labelContent = Array.isArray((node as any).content)
                ? (node as any).content
                : typeof (node as any).content === 'string'
                    ? ([{ type: 'text', text: (node as any).content, styles: {} }] as InlineNode[])
                    : [];
            if (!labelContent.length) continue;
            const truncated = truncateInlineContent(labelContent, remaining);
            if (!truncated || (Array.isArray(truncated) && truncated.length === 0)) continue;
            const labelNodes = Array.isArray(truncated)
                ? truncated
                : ([{ type: 'text', text: truncated, styles: {} }] as InlineNode[]);
            const labelLength = getInlineTextLength(labelNodes);
            remaining -= Math.min(remaining, Math.max(0, labelLength));
            nodes.push({
                type: 'link',
                href: (node as any).href,
                content: labelNodes as any, 
            } as any);
        }
    }

    return nodes;
};

export const applyInlineStyles = (text: string, styles: any = {}): string => {
    let output = text;
    if (styles.italic) {
        output = `*${output}*`;
    }
    if (styles.bold) {
        output = `**${output}**`;
    }
    return output;
};

export const serializeInlineNode = (node: string | InlineNode | undefined): string => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.type === 'text') return applyInlineStyles((node as any).text || '', (node as any).styles || {});
    if (node.type === 'link') {
        const label = serializeInlineContent((node as any).content || '');
        const href = (node as any).href || '';
        if (!href) return label;
        return `[${label || href}](${href})`;
    }
    if ('text' in node && typeof (node as any).text === 'string') return (node as any).text;
    return '';
};

export const serializeInlineContent = (content: string | InlineNode[] | undefined): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content.map(serializeInlineNode).join('');
};

export const extractText = (content: string | InlineNode[] | undefined): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return serializeInlineContent(content);
    }
    return '';
};

export const parseInlineStyles = (text: string = ''): ParsedStyles => {
    const nodes: InlineNode[] = [];
    let hasStyle = false;
    let index = 0;

    const pushPlain = (value: string) => {
        if (!value) return;
        nodes.push({ type: 'text', text: value, styles: {} } as any);
    };

    while (index < text.length) {
        const nextTriple = text.indexOf('***', index);
        const nextBold = text.indexOf('**', index);
        const nextItalic = text.indexOf('*', index);
        let tokenIndex = -1;
        let token: 'triple' | 'bold' | 'italic' | null = null;

        const candidates: { type: 'triple' | 'bold' | 'italic'; index: number }[] = [
            { type: 'triple', index: nextTriple },
            { type: 'bold', index: nextBold },
            { type: 'italic', index: nextItalic },
        ].filter((candidate) => candidate.index !== -1) as any;

        if (candidates.length > 0) {
            candidates.sort((a, b) => {
                if (a.index !== b.index) return a.index - b.index;
                const order = { triple: 0, bold: 1, italic: 2 };
                return order[a.type] - order[b.type];
            });
            tokenIndex = candidates[0].index;
            token = candidates[0].type;
        }

        if (tokenIndex === -1) {
            pushPlain(text.slice(index));
            break;
        }

        if (tokenIndex > index) {
            pushPlain(text.slice(index, tokenIndex));
        }

        if (token === 'triple') {
            const end = text.indexOf('***', tokenIndex + 3);
            if (end === -1) {
                pushPlain(text.slice(tokenIndex));
                break;
            }
            const inner = text.slice(tokenIndex + 3, end);
            nodes.push({ type: 'text', text: inner, styles: { bold: true, italic: true } } as any);
            hasStyle = true;
            index = end + 3;
            continue;
        }

        if (token === 'bold') {
            const end = text.indexOf('**', tokenIndex + 2);
            if (end === -1) {
                pushPlain(text.slice(tokenIndex));
                break;
            }
            const inner = text.slice(tokenIndex + 2, end);
            nodes.push({ type: 'text', text: inner, styles: { bold: true } } as any);
            hasStyle = true;
            index = end + 2;
            continue;
        }

        if (token === 'italic') {
            let end = text.indexOf('*', tokenIndex + 1);
            while (end !== -1 && text[end + 1] === '*') {
                end = text.indexOf('*', end + 2);
            }
            if (end === -1) {
                pushPlain(text.slice(tokenIndex));
                break;
            }
            const inner = text.slice(tokenIndex + 1, end);
            nodes.push({ type: 'text', text: inner, styles: { italic: true } } as any);
            hasStyle = true;
            index = end + 1;
            continue;
        }
    }

    return { nodes, hasStyle };
};

export const parseInlineMarkdown = (text: string | null | undefined): string | InlineNode[] => {
    if (!text) return '';
    const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    let lastIndex = 0;
    const parts: (string | InlineNode)[] = [];
    let hasRich = false;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const segment = text.slice(lastIndex, match.index);
            const parsed = parseInlineStyles(segment);
            if (parsed.hasStyle) {
                parts.push(...parsed.nodes);
                hasRich = true;
            } else {
                parts.push(segment);
            }
        }

        const label = match[1];
        const href = match[2];
        const labelParsed = parseInlineStyles(label);
        const linkContent = labelParsed.nodes.length
            ? labelParsed.nodes
            : [{ type: 'text', text: label, styles: {} }];
        parts.push({
            type: 'link',
            href,
            content: linkContent as any,
        } as any);
        hasRich = true;
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        const tail = text.slice(lastIndex);
        const parsed = parseInlineStyles(tail);
        if (parsed.hasStyle) {
            parts.push(...parsed.nodes);
            hasRich = true;
        } else {
            parts.push(tail);
        }
    }

    if (!hasRich) {
        return text;
    }

    const normalized: InlineNode[] = [];
    parts.forEach((part) => {
        if (!part) return;
        if (typeof part === 'string') {
            normalized.push({ type: 'text', text: part, styles: {} } as any);
        } else {
            normalized.push(part);
        }
    });

    return normalized;
};

export const findMarkdownLinkRange = (text: string, selectionStart: number, selectionEnd: number): MarkdownLinkMatch | null => {
    const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    while ((match = pattern.exec(text)) !== null) {
        const matchStart = match.index;
        const matchEnd = match.index + match[0].length;
        const hasSelection = selectionStart !== selectionEnd;
        const selectionInside = hasSelection
            ? selectionEnd > matchStart && selectionStart < matchEnd
            : selectionStart >= matchStart && selectionStart <= matchEnd;
        if (selectionInside) {
            return {
                start: matchStart,
                end: matchEnd,
                label: match[1],
            };
        }
    }
    return null;
};
