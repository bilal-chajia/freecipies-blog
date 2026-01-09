/**
 * Custom Block: Related Content
 *
 * Curate related recipes, articles, or roundups to show inside content_json.
 */

import { createReactBlockSpec } from '@blocknote/react';
import { useMemo } from 'react';
import { LayoutGrid } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { getBestVariantUrl, getSrcSet } from '@shared/types/images';
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar from '../components/BlockToolbar';
import { useBlockSelection } from '../selection-context';

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

            const moveBlockUp = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksUp();
                requestAnimationFrame(() => selectBlock());
            };

            const moveBlockDown = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksDown();
                requestAnimationFrame(() => selectBlock());
            };

            const {
                attributes: dragAttributes,
                listeners: dragListeners,
                setNodeRef: setDragNodeRef,
                transform: dragTransform,
                isDragging,
            } = useDraggable({ id: block.id });
            const dragHandleProps = { ...dragAttributes, ...dragListeners };
            const dragStyle = dragTransform ? { transform: CSS.Transform.toString(dragTransform) } : undefined;

            const toolbar = (
                <BlockToolbar
                    blockIcon={LayoutGrid}
                    blockLabel="Related Content"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    dragHandleProps={dragHandleProps}
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
                if (itemType === 'recipe') {
                    const meta = [];
                    if (typeof item.total_time === 'number') meta.push(`${item.total_time} min`);
                    if (item.difficulty) meta.push(String(item.difficulty));
                    return meta.join(' | ');
                }
                if (itemType === 'article') {
                    if (typeof item.reading_time === 'number') return `${item.reading_time} min read`;
                }
                if (itemType === 'roundup') {
                    if (typeof item.item_count === 'number') return `${item.item_count} items`;
                }
                return '';
            };

            const getLayoutClasses = (layoutValue) => {
                if (layoutValue === 'list') {
                    return {
                        listClass: 'grid grid-cols-1 gap-3',
                        cardClass: 'flex items-center gap-3',
                        mediaClass: 'w-24 h-24 flex-shrink-0',
                        isCarousel: false,
                    };
                }
                if (layoutValue === 'carousel') {
                    return {
                        listClass: 'grid grid-flow-col auto-cols-[minmax(220px,260px)] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory',
                        cardClass: 'flex flex-col gap-3',
                        mediaClass: 'w-full aspect-[4/3]',
                        isCarousel: true,
                    };
                }
                return {
                    listClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
                    cardClass: 'flex flex-col gap-3',
                    mediaClass: 'w-full aspect-[4/3]',
                    isCarousel: false,
                };
            };

            const renderPreviewCards = (groupsList, layoutValue) => {
                const { listClass, cardClass, mediaClass, isCarousel } = getLayoutClasses(layoutValue);
                return groupsList.map((group) => (
                    <div key={group.type} className="space-y-2">
                        {groupsList.length > 1 && (
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                                {group.label}
                            </div>
                        )}
                        <div className={listClass}>
                            {group.items.map((item) => {
                                const { url, srcSet, style } = resolveThumbnail(item.thumbnail);
                                const meta = buildMeta(item, item.__type);
                                return (
                                    <div
                                        key={item.id}
                                        className={`relative border border-gray-200 rounded-xl bg-white p-3 shadow-sm transition ${cardClass} ${isCarousel ? 'snap-start' : ''}`}
                                    >
                                        <div className={`${mediaClass} rounded-lg overflow-hidden bg-gray-100`}>
                                            {url ? (
                                                <img
                                                    src={url}
                                                    alt={item.headline || ''}
                                                    srcSet={srcSet || undefined}
                                                    sizes={layoutValue === 'list' ? '120px' : '(max-width: 768px) 100vw, 260px'}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                    style={style}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div
                                                className="text-[11px] font-bold uppercase tracking-wide text-white px-2 py-1 rounded w-fit"
                                                style={{ backgroundColor: normalizeCategoryColor(item.categoryColor) }}
                                            >
                                                {item.categoryName || TYPE_LABEL_SINGULAR[item.__type] || group.label}
                                            </div>
                                            <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                                                {item.headline}
                                            </div>
                                            {meta && (
                                                <div className="text-xs text-gray-500">{meta}</div>
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
                    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <LayoutGrid className="w-4 h-4 text-gray-500" />
                            <h4 className="font-medium text-sm text-gray-700">Related Content</h4>
                        </div>

                        {savedTotalSelected === 0 ? (
                            <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                                No related content selected yet. Use the Block tab to configure.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {savedTitleValue && (
                                    <div className="text-base font-semibold text-gray-900">{savedTitleValue}</div>
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




