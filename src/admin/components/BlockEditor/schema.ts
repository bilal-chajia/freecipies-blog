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
import { CUSTOM_EDITOR_TYPES } from './blocks/registry';

/**
 * BlockNote Schema Definition
 *
 * Centralized schema with both default and custom blocks. The custom spec keys
 * below are the React implementation for each block; the canonical block list
 * (and every other derived lookup) lives in blocks/registry.ts. The dev guard
 * fails loud if the two drift apart when a block is added or renamed.
 */
const customSpecs = {
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

if (import.meta.env?.DEV) {
    const missingFromSchema = CUSTOM_EDITOR_TYPES.filter((t) => !(t in customSpecs));
    const missingFromRegistry = Object.keys(customSpecs).filter(
        (t) => !CUSTOM_EDITOR_TYPES.includes(t)
    );
    if (missingFromSchema.length || missingFromRegistry.length) {
        console.error(
            '[schema] Block registry / schema spec mismatch.',
            { missingFromSchema, missingFromRegistry }
        );
    }
}

export const schema = BlockNoteSchema.create({
    blockSpecs: (() => {
        const { table, ...rest } = defaultBlockSpecs;
        return {
            ...rest,
            ...customSpecs,
        };
    })(),
});

export type AppSchema = typeof schema;
export type AppEditor = BlockNoteEditor<
    AppSchema["blockSchema"],
    AppSchema["inlineContentSchema"],
    AppSchema["styleSchema"]
>;

