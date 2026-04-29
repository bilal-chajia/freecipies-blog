import { normalizeContentDocument } from './normalize-content-document';
import type { FAQItem, HeadingBlock } from '../contract/content-blocks.types';

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function extractTocFromContentDocument(input: unknown, headline?: string): TocItem[] {
  const document = normalizeContentDocument(input);
  const toc: TocItem[] = [];

  for (const block of document.blocks) {
    if (block.type === 'heading') {
      const heading = block as HeadingBlock;
      const level = heading.level || 2;
      if (level > 4) continue;

      const rawText = String(heading.text || '').trim();
      if (!rawText) continue;

      toc.push({
        id: heading.id || slugifyHeading(rawText),
        text: stripInlineMarkdown(rawText),
        level,
      });
    }

    if (block.type === 'main_recipe') {
      toc.push({ id: 'recipe-card', text: headline || 'Recipe', level: 2 });
    }

    if (block.type === 'faq_section') {
      toc.push({ id: 'faq-section', text: 'Frequently Asked Questions', level: 2 });
    }
  }

  return toc;
}

export function extractFAQsFromContentDocument(input: unknown): FAQItem[] {
  const document = normalizeContentDocument(input);
  return document.blocks
    .filter((block) => block.type === 'faq_section')
    .flatMap((block) => block.items || []);
}

export function extractSearchTextFromContentDocument(input: unknown): string {
  const document = normalizeContentDocument(input);
  return document.blocks
    .flatMap((block) => {
      if (block.type === 'paragraph' || block.type === 'heading' || block.type === 'blockquote') {
        return [block.text];
      }
      if (block.type === 'list') return block.items;
      if (block.type === 'tip_box') return [block.title, block.text];
      if (block.type === 'faq_section') return block.items.flatMap((item) => [item.question, item.answer]);
      if (block.type === 'roundup_item') return [block.title, block.subtitle, block.note];
      return [];
    })
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(stripInlineMarkdown)
    .join(' ');
}
