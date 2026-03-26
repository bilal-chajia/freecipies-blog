/**
 * Custom Block: Related Content
 *
 * Curate related recipes, articles, or roundups to show inside content_json.
 */

import { createReactBlockSpec } from '@blocknote/react';
import { useMemo } from 'react';
import { LayoutGrid } from 'lucide-react';
import { getBestVariantUrl, getSrcSet } from '@shared/types/images';
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar from '../components/BlockToolbar';
import { useBlockSelection } from '../selection-context';
import { useBlockActionPrimitives, useBlockDragHandle } from './primitives';

const parseList = (value) => {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const GROUP_LABELS = {
    recipe: 'Recipes',
    article: 'Articles',
    roundup: 'Roundups',
};

const TYPE_LABEL_SINGULAR = {
    recipe: 'Recipe',
    article: 'Article',
    roundup: 'Roundup',
};

// Normalize hex color - strip alpha if 8 chars (#rrggbbaa -> #rrggbb)
const normalizeCategoryColor = (color) => {
    if (!color) return '#ff6600';
    const hex = color.startsWith('#') ? color : `#${color}`;
    // If 9 chars (#rrggbbaa), strip last 2 (alpha)
    return hex.length === 9 ? hex.slice(0, 7) : hex;
};

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

            const savedLayout = block.props.layout || 'grid';
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
                const withType = (items, type) => (Array.isArray(items)
                    ? items.map((item) => ({ ...item, __type: type }))
                    : []);
                return [
                    { type: 'recipe', label: GROUP_LABELS.recipe, items: withType(savedRecipes, 'recipe') },
                    { type: 'article', label: GROUP_LABELS.article, items: withType(savedArticles, 'article') },
                    { type: 'roundup', label: GROUP_LABELS.roundup, items: withType(savedRoundups, 'roundup') },
                ].filter((group) => group.items.length > 0);
            }, [savedRecipes, savedArticles, savedRoundups]);

            const savedTotalSelected = savedRecipes.length + savedArticles.length + savedRoundups.length;
            const savedTitleValue = savedTitle.trim();

            const resolveThumbnail = (slot) => {
                if (!slot) return { url: '', srcSet: '', style: undefined };
                const url = getBestVariantUrl(slot) || slot.url || '';
                const srcSet = getSrcSet(slot) || '';
                const style = {};
                if (slot.focal_point) {
                    style.objectPosition = `${slot.focal_point.x}% ${slot.focal_point.y}%`;
                }
                if (slot.aspectRatio) {
                    style.aspectRatio = slot.aspectRatio.includes(':')
                        ? slot.aspectRatio.replace(':', ' / ')
                        : slot.aspectRatio;
                }
                return { url, srcSet, style: Object.keys(style).length ? style : undefined };
            };

            const buildMeta = (item, itemType) => {
                const parts = [];
                if (itemType === 'recipe') {
                    if (typeof item.total_time === 'number') parts.push(`${item.total_time} min`);
                    if (item.difficulty) parts.push(String(item.difficulty));
                }
                if (itemType === 'article') {
                    if (typeof item.reading_time === 'number') parts.push(`${item.reading_time} min read`);
                }
                if (itemType === 'roundup') {
                    if (typeof item.item_count === 'number') parts.push(`${item.item_count} items`);
                }
                return parts;
            };

            const getLayoutClasses = (layoutValue) => {
                if (layoutValue === 'list') {
                    return {
                        listClass: 'flex flex-col',
                        isList: true,
                        isCarousel: false,
                    };
                }
                if (layoutValue === 'carousel') {
                    return {
                        listClass: 'grid grid-flow-col auto-cols-[260px] gap-6 overflow-x-auto pb-2 snap-x snap-mandatory',
                        isList: false,
                        isCarousel: true,
                    };
                }
                return {
                    listClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
                    isList: false,
                    isCarousel: false,
                };
            };

            const renderPreviewCards = (groupsList, layoutValue) => {
                const { listClass, isList, isCarousel } = getLayoutClasses(layoutValue);
                return groupsList.map((group) => (
                    <div key={group.type} className="space-y-2">
                        {groupsList.length > 1 && (
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                {group.label}
                            </div>
                        )}
                        <div className={listClass}>
                            {group.items.map((item) => {
                                const { url, srcSet, style } = resolveThumbnail(item.thumbnail);
                                const metaParts = buildMeta(item, item.__type);

                                if (isList) {
                                    // List layout — matching Stitch list design
                                    return (
                                        <div
                                            key={item.id}
                                            className="flex items-center gap-4 py-3 px-3 border-b border-border last:border-b-0 transition-colors hover:bg-accent/30"
                                            style={{ borderRadius: '8px' }}
                                        >
                                            <div className="w-[90px] h-[90px] flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                                                {url ? (
                                                    <img
                                                        src={url}
                                                        alt={item.headline || ''}
                                                        srcSet={srcSet || undefined}
                                                        sizes="90px"
                                                        loading="lazy"
                                                        className="w-full h-full object-cover"
                                                        style={style}
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div
                                                    className="text-[11px] font-bold uppercase tracking-wider"
                                                    style={{ color: normalizeCategoryColor(item.categoryColor) }}
                                                >
                                                    {item.categoryName || TYPE_LABEL_SINGULAR[item.__type] || group.label}
                                                </div>
                                                <div className="text-sm font-bold text-foreground line-clamp-2">
                                                    {item.headline}
                                                </div>
                                                {metaParts.length > 0 && (
                                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                        {metaParts.map((part, i) => (
                                                            <span key={i} className="flex items-center gap-1.5">
                                                                {i > 0 && <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />}
                                                                {part}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                // Grid / Carousel card — matching Stitch design
                                return (
                                    <div
                                        key={item.id}
                                        className={`flex flex-col h-full border border-border overflow-hidden bg-card shadow-sm transition hover:shadow-md ${isCarousel ? 'snap-start' : ''}`}
                                        style={{ borderRadius: '12px' }}
                                    >
                                        <div className="relative w-full overflow-hidden bg-muted" style={{ paddingTop: isCarousel ? '62.5%' : '100%' }}>
                                            {url ? (
                                                <img
                                                    src={url}
                                                    alt={item.headline || ''}
                                                    srcSet={srcSet || undefined}
                                                    sizes={isCarousel ? '260px' : '(max-width: 768px) 50vw, 280px'}
                                                    loading="lazy"
                                                    className="absolute inset-0 w-full h-full object-cover"
                                                    style={style}
                                                />
                                            ) : (
                                                <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted/50" />
                                            )}
                                        </div>
                                        <div className="flex flex-col flex-grow p-4">
                                            <div
                                                className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                                                style={{ color: normalizeCategoryColor(item.categoryColor) }}
                                            >
                                                {item.categoryName || TYPE_LABEL_SINGULAR[item.__type] || group.label}
                                            </div>
                                            <div className="text-sm font-bold text-foreground line-clamp-2 mb-2">
                                                {item.headline}
                                            </div>
                                            {metaParts.length > 0 && (
                                                <div className="mt-auto pt-2 border-t border-border flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    {metaParts.map((part, i) => (
                                                        <span key={i} className="flex items-center gap-1.5">
                                                            {i > 0 && <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />}
                                                            {part}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ));
            };

            return (
                <BlockWrapper
                    ref={setDragNodeRef}
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    onFocus={selectBlock}
                    onPointerDownCapture={selectBlock}
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
                                        <div className="mt-1.5 w-12 h-1 rounded-full" style={{ background: '#ff6600' }} />
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




