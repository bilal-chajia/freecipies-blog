import { describe, expect, it } from 'vitest';
import { normalizeContentDocument } from '../normalize-content-document';
import { ContentDocumentInputSchema } from '../../validation/content-document.schema';

describe('normalizeContentDocument', () => {
  it('wraps a legacy block array in a v1 content document', () => {
    const document = normalizeContentDocument([
      { type: 'paragraph', text: 'Hello' },
    ]);

    expect(document.version).toBe(1);
    expect(document.kind).toBe('content_document');
    expect(document.blocks).toEqual([
      { id: 'block-0', type: 'paragraph', text: 'Hello' },
    ]);
  });

  it('preserves a valid v1 content document', () => {
    const document = normalizeContentDocument({
      version: 1,
      kind: 'content_document',
      blocks: [{ id: 'intro', type: 'heading', level: 2, text: 'Intro' }],
    });

    expect(document).toEqual({
      version: 1,
      kind: 'content_document',
      blocks: [{ id: 'intro', type: 'heading', level: 2, text: 'Intro' }],
    });
  });

  it('normalizes legacy editor block names before storage/rendering', () => {
    const document = normalizeContentDocument({
      blocks: [
        { id: 'a', type: 'alert', props: { type: 'warning' }, text: 'Careful' },
        { id: 'b', type: 'roundupList', items: [{ article_id: 2, title: 'Pick' }] },
      ],
    });

    expect(document.blocks[0].type).toBe('tip_box');
    expect((document.blocks[0] as any).variant).toBe('warning');
    expect(document.blocks[1].type).toBe('roundup_item');
  });

  it('normalizes legacy FAQ q/a fields to question/answer', () => {
    const document = normalizeContentDocument({
      blocks: [
        {
          id: 'faq',
          type: 'faqSection',
          items: [{ q: 'Can I freeze it?', a: 'Yes.' }],
        },
      ],
    });

    expect(document.blocks[0]).toEqual({
      id: 'faq',
      type: 'faq_section',
      items: [{ question: 'Can I freeze it?', answer: 'Yes.' }],
    });
  });

  it('normalizes legacy video fields to snake_case storage fields', () => {
    const document = normalizeContentDocument({
      blocks: [
        {
          id: 'video',
          type: 'video',
          provider: 'youtube',
          videoId: 'abc123',
          aspectRatio: '16:9',
        },
      ],
    });

    expect(document.blocks[0]).toEqual({
      id: 'video',
      type: 'video',
      provider: 'youtube',
      video_id: 'abc123',
      aspect_ratio: '16:9',
    });
  });

  it('does not produce reserved layout blocks in canonical output', () => {
    const document = normalizeContentDocument({
      blocks: [
        { id: 'spacer', type: 'spacer', size: 'lg' },
        { id: 'ad', type: 'ad_slot', variant: 'in-content' },
        { id: 'paragraph', type: 'paragraph', text: 'Visible' },
      ],
    });

    expect(document.blocks).toEqual([
      { id: 'paragraph', type: 'paragraph', text: 'Visible' },
    ]);
  });
});

describe('ContentDocumentInputSchema', () => {
  it('accepts official v1 blocks with required ids', () => {
    const result = ContentDocumentInputSchema.safeParse({
      version: 1,
      kind: 'content_document',
      blocks: [
        { id: 'intro', type: 'paragraph', text: 'Hello' },
        {
          id: 'related',
          type: 'related_content',
          layout: 'grid',
          items: [
            {
              content_type: 'recipe',
              article_id: 123,
              slug: 'easy-pasta',
              title: 'Easy Pasta',
              image: {
                media_id: 55,
                alt: 'Bowl of pasta',
                variants: {
                  sm: { url: '/api/images/media/55/sm.webp', width: 720, height: 480 },
                  md: { url: '/api/images/media/55/md.webp', width: 1200, height: 800 },
                },
              },
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects canonical documents with missing block ids', () => {
    const result = ContentDocumentInputSchema.safeParse({
      version: 1,
      kind: 'content_document',
      blocks: [{ type: 'paragraph', text: 'Hello' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects reserved layout blocks in strict save validation', () => {
    const result = ContentDocumentInputSchema.safeParse({
      version: 1,
      kind: 'content_document',
      blocks: [{ id: 'ad', type: 'ad_slot', variant: 'in-content' }],
    });

    expect(result.success).toBe(false);
  });

  it('rejects related_content image snapshots with r2_key', () => {
    const result = ContentDocumentInputSchema.safeParse({
      version: 1,
      kind: 'content_document',
      blocks: [
        {
          id: 'related',
          type: 'related_content',
          layout: 'grid',
          items: [
            {
              content_type: 'recipe',
              article_id: 1,
              slug: 'pasta',
              title: 'Pasta',
              image: {
                media_id: 55,
                alt: 'Pasta',
                variants: {
                  sm: { r2_key: 'private/key.webp', width: 720, height: 480 },
                },
              },
            },
          ],
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('rejects empty roundup_item blocks', () => {
    const result = ContentDocumentInputSchema.safeParse({
      version: 1,
      kind: 'content_document',
      blocks: [{ id: 'item', type: 'roundup_item' }],
    });

    expect(result.success).toBe(false);
  });
});
