import { Image as ImageIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBestVariantUrl } from '@shared/types/images';
import { Button } from '@/ui/button';
import type { ImageSlotKey, BeforeAfterSlot } from './BeforeAfterBlock.types';

interface ImageSlotEditorProps {
    blockId: string;
    slotKey: ImageSlotKey;
    slotData: BeforeAfterSlot | null;
    isSelected: boolean;
    onUpdateSlot: (key: ImageSlotKey, slot: BeforeAfterSlot | null) => void;
    onChooseImage: (key: ImageSlotKey) => void;
}

export default function ImageSlotEditor({
    blockId,
    slotKey,
    slotData,
    isSelected,
    onUpdateSlot,
    onChooseImage,
}: ImageSlotEditorProps) {
    const preview = slotData?.variants
        ? getBestVariantUrl(slotData as Parameters<typeof getBestVariantUrl>[0]) || ''
        : '';
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
                            onClick={() => onUpdateSlot(slotKey, null)}
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
                                onClick={() => onChooseImage(slotKey)}
                                className="gap-1 text-xs"
                            >
                                <ImageIcon className="w-3 h-3" />
                                Choose image
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <input
                                id={`ba-${blockId}-${slotKey}-alt`}
                                name={`ba-${blockId}-${slotKey}-alt`}
                                type="text"
                                value={slotData?.alt || ''}
                                onChange={(e) => onUpdateSlot(slotKey, { ...slotData, alt: e.target.value })}
                                placeholder="Alt text"
                                aria-label={`${label} alt text`}
                                className={cn(
                                    'w-full px-2 py-1 text-xs',
                                    'bg-background border border-input rounded-md',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                                )}
                            />
                            <input
                                id={`ba-${blockId}-${slotKey}-label`}
                                name={`ba-${blockId}-${slotKey}-label`}
                                type="text"
                                value={slotData?.label || ''}
                                onChange={(e) => onUpdateSlot(slotKey, { ...slotData, label: e.target.value })}
                                placeholder="Label (optional)"
                                aria-label={`${label} label`}
                                className={cn(
                                    'w-full px-2 py-1 text-xs',
                                    'bg-background border border-input rounded-md',
                                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                                )}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
