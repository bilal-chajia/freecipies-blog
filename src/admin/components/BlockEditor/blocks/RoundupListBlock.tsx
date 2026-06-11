import React, { useMemo } from 'react';
import { createReactBlockSpec } from "@blocknote/react";
import { LayoutList, Link2, ExternalLink, Info, Plus } from 'lucide-react';
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar from '../components/BlockToolbar';
import { useCustomBlock } from './useCustomBlock';
import { getBestVariantUrl } from '@shared/types/images';

type RoundupListItem = {
    article_id?: string | number;
    external_url?: string;
    title?: string;
    subtitle?: string;
    note?: string;
    image?: Parameters<typeof getBestVariantUrl>[0];
    recipe?: {
        total_time_minutes?: number | null;
        difficulty?: string | null;
    } | null;
    rating?: {
        rating_value?: number | null;
    } | null;
};

/**
 * RoundupListBlock
 * 
 * A BlockNote custom block representing a collection of items in a roundup.
 * This is the "Smart List" version where multiple items are managed within one block.
 */
export const RoundupListBlock = createReactBlockSpec(
    {
        type: "roundupList",
        propSchema: {
            title: { default: "" },
            description: { default: "" },
            itemsJson: { default: "[]" },
            showStats: { default: true },
        },
        content: "none",
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const {
                isSelected, selectBlock,
                moveUp: moveBlockUp,
                moveDown: moveBlockDown,
                remove: removeBlock,
                dragHandleProps,
                setDragNodeRef,
                dragStyle,
                isDragging,
            } = useCustomBlock(block.id, editor);

            const items = useMemo<RoundupListItem[]>(() => {
                try {
                    const parsed = JSON.parse(block.props.itemsJson);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            }, [block.props.itemsJson]);

            const toolbar = (
                <BlockToolbar
                    blockIcon={LayoutList}
                    blockLabel="Roundup List"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    dragHandleProps={dragHandleProps}
                    onDelete={removeBlock}
                    showMoreMenu={false}
                />
            );

            return (
                <BlockWrapper
                    ref={setDragNodeRef}
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    blockType="roundup-list"
                    blockId={block.id}
                    className="my-8"
                    data-radius="2xl"
                    style={{
                        ...dragStyle,
                        opacity: isDragging ? 0.5 : undefined,
                    } as React.CSSProperties}
                >
                    <div className="bg-card border rounded-2xl overflow-hidden shadow-sm transition-all hover:border-primary/20">
                        {/* Group Header */}
                        {(block.props.title || block.props.description) ? (
                            <div className="p-6 border-b bg-muted/10">
                                {block.props.title && (
                                    <h3 className="text-xl font-bold text-foreground mb-2">
                                        {block.props.title}
                                    </h3>
                                )}
                                {block.props.description && (
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {block.props.description}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div className="p-4 border-b bg-muted/5 flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                    <LayoutList className="h-3 w-3" /> Roundup Collection
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                    {items.length} Items
                                </Badge>
                            </div>
                        )}

                        {/* Items List */}
                        <div className="p-2 space-y-2">
                            {items.length === 0 ? (
                                <div className="p-12 text-center space-y-3">
                                    <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Plus className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">Your collection is empty</p>
                                    <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                                        Search and add recipes from the "Block" settings tab in the sidebar.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    {items.map((item, index) => (
                                        <div 
                                            key={`${item.article_id || item.external_url}-${index}`}
                                            className="flex gap-4 p-3 rounded-xl border bg-background/50 hover:bg-background transition-colors group"
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-24 h-24 shrink-0 rounded-lg overflow-hidden bg-muted relative">
                                                {item.image?.variants ? (
                                                    <img 
                                                        src={getBestVariantUrl(item.image) || undefined} 
                                                        alt="" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground font-bold">
                                                        NO IMAGE
                                                    </div>
                                                )}
                                                <div className="absolute top-1 left-1 bg-primary text-primary-foreground h-5 w-5 rounded-md flex items-center justify-center text-[10px] font-bold shadow-sm">
                                                    #{index + 1}
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0 py-1">
                                                <div className="flex items-start justify-between gap-4 mb-1">
                                                    <h4 className="font-bold text-sm text-foreground line-clamp-1">
                                                        {item.title || "Untitled Item"}
                                                    </h4>
                                                    {item.article_id ? (
                                                        <Link2 className="h-3 w-3 text-muted-foreground opacity-50" />
                                                    ) : (
                                                        <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50" />
                                                    )}
                                                </div>

                                                {item.subtitle && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2 italic">
                                                        {item.subtitle}
                                                    </p>
                                                )}

                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    {item.note || "Add an editorial note in the settings side panel..."}
                                                </p>

                                                {/* Stats Mini */}
                                                {(block.props.showStats && (item.recipe || item.rating)) && (
                                                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
                                                        {item.recipe?.total_time_minutes ? (
                                                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                                                                {item.recipe.total_time_minutes}m
                                                            </span>
                                                        ) : null}
                                                        {item.recipe?.difficulty && (
                                                            <span className="text-[10px] font-bold text-muted-foreground">
                                                                {item.recipe.difficulty}
                                                            </span>
                                                        )}
                                                        {item.rating?.rating_value ? (
                                                            <span className="text-[10px] font-bold text-orange-500">
                                                                ★ {item.rating.rating_value}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer / Hint */}
                        <div className="px-4 py-3 bg-muted/5 border-t flex items-center gap-2">
                             <Info className="h-3.5 w-3.5 text-muted-foreground" />
                             <span className="text-[11px] text-muted-foreground">
                                Customize title, description and manage recipes in the <b>Block Settings</b> sidebar.
                             </span>
                        </div>
                    </div>
                </BlockWrapper>
            );
        }
    }
);
