/**
 * Custom Block: Before/After
 *
 * Compare two images with slider or side-by-side layout.
 * 
 * REFACTORED for WordPress Block Editor design:
 * - Proper selected/unselected visual states
 * - Block toolbar with layout toggle
 * - Clean visual styling with theme support
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { createReactBlockSpec } from '@blocknote/react';
import { useMemo, useState } from 'react';
import {
    Image as ImageIcon,
    Trash2,
    SplitSquareHorizontal,
    GalleryHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { parseVariantsJson, getVariantMap, getBestVariantUrl } from '@shared/types/images';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { Button } from '@/ui/button';
import MediaDialog from '../../MediaDialog';

const parseSlot = (value) => {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
};

const toJson = (value) => JSON.stringify(value || null);

// Layout options
const layouts = [
    { value: 'slider', icon: SplitSquareHorizontal, label: 'Slider' },
    { value: 'side_by_side', icon: GalleryHorizontal, label: 'Side by side' },
];

export const BeforeAfterBlock = createReactBlockSpec(
    {
        type: 'beforeAfter',
        propSchema: {
            layout: { default: 'slider', values: ['slider', 'side_by_side'] },
            beforeJson: { default: '' },
            afterJson: { default: '' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const before = useMemo(() => parseSlot(block.props.beforeJson), [block.props.beforeJson]);
            const after = useMemo(() => parseSlot(block.props.afterJson), [block.props.afterJson]);
            const [isSelected, setIsSelected] = useState(false);
            const [activeSlot, setActiveSlot] = useState(null);
            const [mediaDialogOpen, setMediaDialogOpen] = useState(false);

            const updateBlockProps = (updates) => {
                editor.updateBlock(block, {
                    type: 'beforeAfter',
                    props: { ...block.props, ...updates },
                });
            };

            const updateSlot = (slotKey, nextSlot) => {
                updateBlockProps({ [`${slotKey}Json`]: toJson(nextSlot) });
            };

            const resolvePreview = (slot) => {
                if (!slot?.variants) return '';
                return getBestVariantUrl(slot) || '';
            };

            const handleSelect = (item) => {
                if (!activeSlot) return;
                const parsed = parseVariantsJson(item);
                const variants = getVariantMap(parsed);
                const existing = activeSlot === 'before' ? before : after;
                const nextSlot = {
                    media_id: item.id,
                    alt: existing?.alt || item.altText || item.alt_text || item.name || '',
                    label: existing?.label || (activeSlot === 'before' ? 'Before' : 'After'),
                    variants,
                };
                updateSlot(activeSlot, nextSlot);
                setMediaDialogOpen(false);
                setActiveSlot(null);
            };

            const renderSlot = (slotKey, slotData) => {
                const preview = resolvePreview(slotData);
                const label = slotData?.label || (slotKey === 'before' ? 'Before' : 'After');

                return (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {label}
                        </div>
                        <div className={cn(
                            'border rounded-lg p-3 bg-muted/30 space-y-2',
                            'transition-colors',
                            isSelected && 'border-border'
                        )}>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{slotData?.media_id ? `Media #${slotData.media_id}` : 'No image selected'}</span>
                                {slotData?.media_id && isSelected && (
                                    <button
                                        type="button"
                                        onClick={() => updateSlot(slotKey, null)}
                                        className="inline-flex items-center gap-1 text-destructive hover:underline"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className={cn(
                                'w-full h-40 rounded-md overflow-hidden',
                                'bg-background border border-dashed border-border',
                                'flex items-center justify-center'
                            )}>
                                {preview ? (
                                    <img src={preview} alt={slotData?.alt || ''} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-xs text-muted-foreground">
                                        <ImageIcon className="w-5 h-5 mb-1" />
                                        Select image
                                    </div>
                                )}
                            </div>
                            {isSelected && (
                                <>
                                    <div className="flex items-center justify-center">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                setActiveSlot(slotKey);
                                                setMediaDialogOpen(true);
                                            }}
                                            className="gap-1 text-xs"
                                        >
                                            <ImageIcon className="w-3 h-3" />
                                            Choose image
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <input
                                            type="text"
                                            value={slotData?.alt || ''}
                                            onChange={(e) => updateSlot(slotKey, { ...slotData, alt: e.target.value })}
                                            placeholder="Alt text"
                                            className={cn(
                                                'w-full px-2 py-1 text-xs',
                                                'bg-background border border-input rounded-md',
                                                'focus:outline-none focus:ring-2 focus:ring-ring'
                                            )}
                                        />
                                        <input
                                            type="text"
                                            value={slotData?.label || ''}
                                            onChange={(e) => updateSlot(slotKey, { ...slotData, label: e.target.value })}
                                            placeholder="Label (optional)"
                                            className={cn(
                                                'w-full px-2 py-1 text-xs',
                                                'bg-background border border-input rounded-md',
                                                'focus:outline-none focus:ring-2 focus:ring-ring'
                                            )}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            };

            const currentLayout = layouts.find(l => l.value === block.props.layout) || layouts[0];

            return (
                <>
                    <div
                        className={cn(
                            'wp-block',
                            isSelected && 'is-selected',
                            'relative my-2',
                            'border rounded-lg p-4 bg-card shadow-sm space-y-4',
                            'transition-shadow duration-[var(--wp-transition-duration)]',
                            !isSelected && 'hover:shadow-[0_0_0_1px_var(--wp-block-border-hover)]',
                            isSelected && 'shadow-[0_0_0_2px_var(--wp-block-border-selected)]'
                        )}
                        data-block-type="before-after"
                        tabIndex={0}
                        onFocus={() => setIsSelected(true)}
                        onBlur={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget)) {
                                setIsSelected(false);
                            }
                        }}
                    >
                        {/* Toolbar */}
                        <AnimatePresence>
                            {isSelected && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 4 }}
                                    className={cn(
                                        'absolute -top-[44px] left-0',
                                        'flex items-center h-10 px-1',
                                        'bg-[var(--wp-toolbar-bg)] border border-[var(--wp-toolbar-border)]',
                                        'rounded-[var(--wp-toolbar-border-radius)]',
                                        'shadow-[var(--wp-toolbar-shadow)]',
                                        'z-[var(--wp-z-block-toolbar)]'
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center px-1.5 text-muted-foreground">
                                        <SplitSquareHorizontal className="w-4 h-4" />
                                    </div>

                                    <div className="w-px h-5 mx-1 bg-[var(--wp-toolbar-separator-color)]" />

                                    {/* Layout toggle */}
                                    <div className="flex items-center gap-0.5">
                                        {layouts.map((layout) => (
                                            <Tooltip key={layout.value}>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateBlockProps({ layout: layout.value })}
                                                        className={cn(
                                                            'flex items-center justify-center',
                                                            'w-8 h-8 rounded-sm',
                                                            'hover:bg-[var(--wp-toolbar-button-hover-bg)]',
                                                            block.props.layout === layout.value && 'bg-[var(--wp-toolbar-button-active-bg)]'
                                                        )}
                                                    >
                                                        <layout.icon className="w-4 h-4" />
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="text-xs">
                                                    {layout.label}
                                                </TooltipContent>
                                            </Tooltip>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <SplitSquareHorizontal className="w-4 h-4 text-muted-foreground" />
                                <h4 className="text-sm font-medium">Before / After</h4>
                            </div>
                            {!isSelected && (
                                <span className="text-xs text-muted-foreground capitalize">
                                    {currentLayout.label}
                                </span>
                            )}
                        </div>

                        {/* Slots */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {renderSlot('before', before)}
                            {renderSlot('after', after)}
                        </div>
                    </div>

                    <MediaDialog
                        open={mediaDialogOpen}
                        onOpenChange={setMediaDialogOpen}
                        onSelect={handleSelect}
                    />
                </>
            );
        },
    }
);

export default BeforeAfterBlock;
