import { BlockNoteSchema, defaultBlockSpecs, defaultStyleSpecs } from '@blocknote/core';
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
    // Restrict inline styles to the subset the content_json contract can persist
    // and the renderer can produce: bold + italic only. BlockNote's default
    // styleSchema also ships underline/strike/code/text+background color, none of
    // which the markdown serializer can represent — they would be applied in the
    // editor then silently dropped at save. Constraining the schema keeps
    // editor = contract = render. Links are inline content, not a style, so they
    // are unaffected. Block-level textColor/backgroundColor props are separate
    // from this inline styleSchema and remain intact.
    styleSpecs: {
        bold: defaultStyleSpecs.bold,
        italic: defaultStyleSpecs.italic,
    },
});

export type AppSchema = typeof schema;
export type AppEditor = BlockNoteEditor<
    AppSchema["blockSchema"],
    AppSchema["inlineContentSchema"],
    AppSchema["styleSchema"]
>;

