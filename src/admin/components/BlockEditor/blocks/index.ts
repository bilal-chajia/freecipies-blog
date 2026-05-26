/**
 * Custom Blocks Barrel Export
 */

// Adapter contract + registry
export {
    blockAdapters,
    registerBlockAdapter,
    getBlockAdapter,
} from './BlockAdapter';

// Existing blocks (refactored)
export { default as Alert } from './TipBoxBlock';
export { default as VideoBlock } from './VideoBlock';
export { default as ImageBlock } from './ImageBlock';
export { default as FAQSectionBlock } from './FAQSectionBlock';
export { default as DividerBlock } from './DividerBlock';
export { MainRecipeBlock } from './MainRecipeBlock';
export { RoundupListBlock } from './RoundupListBlock';
export { RelatedContentBlock } from './RelatedContentBlock';
export { default as TableBlock } from './TableBlock';
export { default as BeforeAfterBlock } from './BeforeAfterBlock';
