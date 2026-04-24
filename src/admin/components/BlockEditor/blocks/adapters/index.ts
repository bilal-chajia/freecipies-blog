import { registerBlockAdapter } from '../BlockAdapter';
import { ParagraphAdapter } from './ParagraphAdapter';
import { HeadingAdapter } from './HeadingAdapter';
import { ImageAdapter } from './ImageAdapter';
import { VideoAdapter } from './VideoAdapter';
import { AlertAdapter } from './AlertAdapter';
import { BlockquoteAdapter } from './BlockquoteAdapter';
import { ListAdapter } from './ListAdapter';
import { FAQAdapter } from './FAQAdapter';
import { RelatedContentAdapter } from './RelatedContentAdapter';
import { DividerAdapter } from './DividerAdapter';
import { TableAdapter } from './TableAdapter';
import { BeforeAfterAdapter } from './BeforeAfterAdapter';
import { RoundupListAdapter } from './RoundupListAdapter';

export {
    ParagraphAdapter,
    HeadingAdapter,
    ImageAdapter,
    VideoAdapter,
    AlertAdapter,
    BlockquoteAdapter,
    ListAdapter,
    FAQAdapter,
    RelatedContentAdapter,
    DividerAdapter,
    TableAdapter,
    BeforeAfterAdapter,
    RoundupListAdapter,
};

/**
 * Register all block adapters into the global registry.
 * Call once at application initialization.
 */
export function registerAllBlockAdapters(): void {
    registerBlockAdapter(ParagraphAdapter);
    registerBlockAdapter(HeadingAdapter);
    registerBlockAdapter(ImageAdapter);
    registerBlockAdapter(VideoAdapter);
    registerBlockAdapter(AlertAdapter);
    registerBlockAdapter(BlockquoteAdapter);
    registerBlockAdapter(ListAdapter);
    registerBlockAdapter(FAQAdapter);
    registerBlockAdapter(RelatedContentAdapter);
    registerBlockAdapter(DividerAdapter);
    registerBlockAdapter(TableAdapter);
    registerBlockAdapter(BeforeAfterAdapter);
    registerBlockAdapter(RoundupListAdapter);
}
