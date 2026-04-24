import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import type { BlockNoteEditor } from '@blocknote/core';
import {
    Alert,
    VideoBlock,
    ImageBlock,
    FAQSectionBlock,
    DividerBlock,
    MainRecipeBlock,
    RoundupListBlock,
    RelatedContentBlock,
    TableBlock,
    BeforeAfterBlock,
} from './blocks';

/**
 * BlockNote Schema Definition
 *
 * Centralized schema with both default and custom blocks.
 */
export const schema = BlockNoteSchema.create({
    blockSpecs: (() => {
        const { table, ...rest } = defaultBlockSpecs;
        return {
            ...rest,
            alert: Alert(),
            video: VideoBlock(),
            customImage: ImageBlock(),
            faqSection: FAQSectionBlock(),
            divider: DividerBlock(),
            mainRecipe: MainRecipeBlock(),
            roundupList: RoundupListBlock(),
            relatedContent: RelatedContentBlock(),
            simpleTable: TableBlock(),
            beforeAfter: BeforeAfterBlock(),
        };
    })(),
});

export type AppSchema = typeof schema;
export type AppEditor = BlockNoteEditor<AppSchema>;
