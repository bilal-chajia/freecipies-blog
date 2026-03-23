import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import {
    Alert,
    VideoBlock,
    ImageBlock,
    FAQSectionBlock,
    DividerBlock,
    RecipeEmbedBlock,
    MainRecipeBlock,
    RoundupListBlock,
    RelatedContentBlock,
    TableBlock,
    BeforeAfterBlock
} from './blocks';

/**
 * BlockNote Schema Definition
 * 
 * Centralized schema with both default and custom blocks.
 */
export const schema = BlockNoteSchema.create({
    blockSpecs: {
        ...defaultBlockSpecs,
        alert: Alert(),
        video: VideoBlock(),
        customImage: ImageBlock(),
        faqSection: FAQSectionBlock(),
        divider: DividerBlock(),
        recipeEmbed: RecipeEmbedBlock(),
        mainRecipe: MainRecipeBlock(),
        roundupList: RoundupListBlock(),
        relatedContent: RelatedContentBlock(),
        simpleTable: TableBlock(),
        beforeAfter: BeforeAfterBlock(),
    },
});

export type AppSchema = typeof schema;
