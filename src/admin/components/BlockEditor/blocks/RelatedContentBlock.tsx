/**
 * Custom Block: Related Content
 *
 * Curate related recipes, articles, or roundups to show inside content_json.
 */

import { createReactBlockSpec } from '@blocknote/react';
import { useMemo } from 'react';
import { LayoutGrid } from 'lucide-react';
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar from '../components/BlockToolbar';
import { useBlockSelection } from '../selection-context';
import { useBlockActionPrimitives, useBlockDragHandle } from './primitives';
import type { RelatedContentType, RelatedItem, RelatedLayout, TypedRelatedItem, RelatedGroup } from './related-content/RelatedContentBlock.types';
import { GROUP_LABELS, parseList } from './related-content/utils';
import { renderPreviewCards } from './related-content/RelatedItemCard';

export const RelatedContentBlock = createReactBlockSpec(
    {
        type: 'relatedContent',
        propSchema: {
            title: { default: '' },
            layout: { default: 'grid', values: ['grid', 'carousel', 'list'] },
            mode: { default: 'manual', values: ['manual', 'auto'] },
            limit: { default: 4 },
            recipesJson: { default: '[]' },
            articlesJson: { default: '[]' },
            roundupsJson: { default: '[]' },
            itemsJson: { default: '[]' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const { isSelected, selectBlock } = useBlockSelection(block.id);
            const {
                moveUp: moveBlockUp,
                moveDown: moveBlockDown,
                remove: removeBlock,
            } = useBlockActionPrimitives({
                editor,
                blockId: block.id,
                onSelect: selectBlock,
            });
            const {
                dragHandleProps,
                setDragNodeRef,
                dragStyle,
                isDragging,
            } = useBlockDragHandle(block.id);

            const toolbar = (
                <BlockToolbar
                    blockIcon={LayoutGrid}
                    blockLabel="Related Content"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    dragHandleProps={dragHandleProps}
                    onDelete={removeBlock}
                    showMoreMenu={false}
                />
            );

            const savedLayout = (block.props.layout || 'grid') as RelatedLayout;
            const savedTitle = block.props.title || '';

            const savedRecipes = useMemo(
                () => parseList(block.props.recipesJson),
                [block.props.recipesJson]
            );
            const savedArticles = useMemo(
                () => parseList(block.props.articlesJson),
                [block.props.articlesJson]
            );
            const savedRoundups = useMemo(
                () => parseList(block.props.roundupsJson),
                [block.props.roundupsJson]
            );

            const savedGroups = useMemo(() => {
                const withType = (items: RelatedItem[], type: RelatedContentType): TypedRelatedItem[] => (Array.isArray(items)
                    ? items.map((item) => ({ ...item, __type: type }))
                    : []);
                return [
                    { type: 'recipe', label: GROUP_LABELS.recipe, items: withType(savedRecipes, 'recipe') },
                    { type: 'article', label: GROUP_LABELS.article, items: withType(savedArticles, 'article') },
                    { type: 'roundup', label: GROUP_LABELS.roundup, items: withType(savedRoundups, 'roundup') },
                ].filter((group): group is RelatedGroup => group.items.length > 0);
            }, [savedRecipes, savedArticles, savedRoundups]);

            const savedTotalSelected = savedRecipes.length + savedArticles.length + savedRoundups.length;
            const savedTitleValue = savedTitle.trim();

            return (
                <BlockWrapper
                    ref={setDragNodeRef}
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    blockType="related-content"
                    blockId={block.id}
                    style={{
                        ...dragStyle,
                        opacity: isDragging ? 0.5 : undefined,
                        pointerEvents: isDragging ? 'none' : undefined,
                    }}
                >
                    <div className="border border-border rounded-lg p-4 bg-card shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <LayoutGrid className="size-4 text-muted-foreground" />
                            <h4 className="font-medium text-sm text-foreground">Related Content</h4>
                        </div>

                        {savedTotalSelected === 0 ? (
                            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                                No related content selected yet. Use the Block tab to configure.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {savedTitleValue && (
                                    <div>
                                        <div className="text-base font-bold text-foreground">{savedTitleValue}</div>
                                        <div className="mt-1.5 w-12 h-1 rounded-full bg-brand-secondary" />
                                    </div>
                                )}
                                {renderPreviewCards(savedGroups, savedLayout)}
                            </div>
                        )}
                    </div>
                </BlockWrapper>
            );
        },
    }
);

export default RelatedContentBlock;
