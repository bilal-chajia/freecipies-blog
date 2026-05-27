import { normalizeContentDocument } from './normalize-content-document';
import type { HeadingBlock } from '../contract/content-blocks.types';

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!?\[([^\]]*?)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

export function slugifyHeading(text: string): string {
  const cleanText = stripInlineMarkdown(text);
  return cleanText
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
  number: string;
  parent_id: string | null;
  source_type: 'heading' | 'marker' | 'roundup_item';
  position?: number;
}

function nextHeadingNumber(counters: number[], level: number): string {
  const index = level - 2;
  counters[index] = (counters[index] || 0) + 1;
  for (let i = index + 1; i < counters.length; i += 1) counters[i] = 0;
  return counters.slice(0, index + 1).filter((value) => value > 0).join('.');
}

function closestParent(stack: Record<number, string>, level: number): string | null {
  for (let current = level - 1; current >= 2; current -= 1) {
    if (stack[current]) return stack[current];
  }
  return null;
}

function roundupItemAnchor(position: number, title: string): string {
  return `item-${position}`;
}

export function extractTocFromContentDocument(input: unknown, headline?: string, roundupJson?: unknown): TocItem[] {
  const document = normalizeContentDocument(input);
  const toc: TocItem[] = [];
  const counters = [0, 0, 0, 0, 0];
  const stack: Record<number, string> = {};

  for (const block of document.blocks) {
    if (block.type === 'heading') {
      const heading = block as HeadingBlock;
      const level = heading.level || 2;
      if (level < 2 || level > 6) continue;

      const rawText = String(heading.text || '').trim();
      if (!rawText) continue;

      const id = slugifyHeading(rawText);
      const number = nextHeadingNumber(counters, level);
      toc.push({
        id,
        text: stripInlineMarkdown(rawText),
        level,
        number,
        parent_id: closestParent(stack, level),
        source_type: 'heading',
      });
      stack[level] = id;
      for (let current = level + 1; current <= 6; current += 1) delete stack[current];
    }

    if (block.type === 'main_recipe') {
      const id = 'recipe-card';
      toc.push({
        id,
        text: headline || 'Recipe',
        level: 2,
        number: nextHeadingNumber(counters, 2),
        parent_id: null,
        source_type: 'marker',
      });
      stack[2] = id;
    }

    if (block.type === 'main_roundup') {
      const id = 'main-roundup';
      const number = nextHeadingNumber(counters, 2);
      toc.push({
        id,
        text: headline || 'Roundup',
        level: 2,
        number,
        parent_id: null,
        source_type: 'marker',
      });
      stack[2] = id;

      const roundup = typeof roundupJson === 'string' ? (() => {
        try { return JSON.parse(roundupJson); } catch { return null; }
      })() : roundupJson;
      const items = Array.isArray((roundup as any)?.items) ? (roundup as any).items : [];
      items.forEach((item: any, index: number) => {
        const position = Number(item?.position) || index + 1;
        const text = String(item?.title || item?.headline || `Item ${position}`).trim();
        toc.push({
          id: roundupItemAnchor(position, text),
          text,
          level: 3,
          number: `${number}.${index + 1}`,
          parent_id: id,
          source_type: 'roundup_item',
          position,
        });
      });
    }

    if (block.type === 'main_faq') {
      const id = 'faq-section';
      toc.push({
        id,
        text: 'Frequently Asked Questions',
        level: 2,
        number: nextHeadingNumber(counters, 2),
        parent_id: null,
        source_type: 'marker',
      });
      stack[2] = id;
    }
  }

  return toc;
}

export function extractFAQsFromContentDocument(_input: unknown): [] {
  return [];
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
      return [];
    })
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(stripInlineMarkdown)
    .join(' ');
}
