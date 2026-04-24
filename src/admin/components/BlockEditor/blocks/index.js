/**
 * Custom Blocks Barrel Export
 */

// Adapter contract + registry
export {
    BlockAdapter,
    blockAdapters,
    registerBlockAdapter,
    getBlockAdapter,
} from './BlockAdapter';

// Existing blocks (refactored)
export { Alert } from './TipBoxBlock';
export { VideoBlock } from './VideoBlock';
export { ImageBlock } from './ImageBlock';
export { FAQSectionBlock } from './FAQSectionBlock';
export { DividerBlock } from './DividerBlock';
export { MainRecipeBlock } from './MainRecipeBlock';
export { RoundupListBlock } from './RoundupListBlock';
export { RelatedContentBlock } from './RelatedContentBlock';
export { TableBlock } from './TableBlock';
export { BeforeAfterBlock } from './BeforeAfterBlock';


