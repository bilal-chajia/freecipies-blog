import { describe, it, expect } from 'vitest';
import { ParagraphAdapter } from '../ParagraphAdapter';
import type { ParagraphBlock } from '../../../../../modules/articles/types/content-blocks.types';

describe('ParagraphAdapter', () => {
    const adapter = ParagraphAdapter;

    it('converts DB paragraph to editor block', () => {
        const dbBlock: ParagraphBlock = { type: 'paragraph', text: 'Hello **world**' };
        const editorBlock = adapter.toEditor(dbBlock);
        expect(editorBlock.type).toBe('paragraph');
        expect(editorBlock.content).toBeDefined();
    });

    it('converts editor paragraph back to DB block with bold/italic styles', () => {
        const editorBlock = {
            type: 'paragraph',
            content: [
                { type: 'text', text: 'Hello ', styles: {} },
                { type: 'text', text: 'world', styles: { bold: true } },
                { type: 'text', text: ' and ', styles: {} },
                { type: 'text', text: 'moon', styles: { italic: true } },
            ],
        } as any;
        const dbBlock = adapter.fromEditor(editorBlock);
        expect(dbBlock?.type).toBe('paragraph');
        expect(dbBlock?.text).toContain('**world**');
        expect(dbBlock?.text).toContain('*moon*');
    });

    it('returns null for empty content', () => {
        const editorBlock = {
            type: 'paragraph',
            content: [{ type: 'text', text: '', styles: {} }],
        } as any;
        const dbBlock = adapter.fromEditor(editorBlock);
        expect(dbBlock).toBeNull();
    });
});
