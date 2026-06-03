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
        <div className="relative w-full h-40 rounded-md overflow-hidden bg-muted border border-border group/slot">
            {preview ? (
                <>
                    <img src={preview} alt={slotData?.alt || ''} className="w-full h-full object-cover animate-in fade-in duration-200" />
                    {isSelected && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover/slot:opacity-100 transition-opacity duration-150">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onChooseImage(slotKey)}
                                className="h-7 text-[10px] gap-1 px-2.5 bg-background/90 hover:bg-background border-none shadow-sm"
                            >
                                <ImageIcon className="w-3 h-3" />
                                Replace
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => onUpdateSlot(slotKey, null)}
                                className="h-7 text-[10px] gap-1 px-2.5 shadow-sm"
                            >
                                <Trash2 className="w-3 h-3" />
                                Remove
                            </Button>
                        </div>
                    )}
                </>
            ) : (
                <div className={cn(
                    "w-full h-full flex flex-col items-center justify-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-md p-4 transition-colors duration-150",
                    isSelected && "bg-background border-primary/40"
                )}>
                    <ImageIcon className="w-5 h-5 mb-1 text-muted-foreground/60" />
                    <span className="text-[10px] font-medium mb-1.5 uppercase tracking-wide">No image ({label})</span>
                    {isSelected && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onChooseImage(slotKey)}
                            className="h-7 text-[10px] gap-1 px-2.5 bg-background hover:bg-muted border border-border/50 shadow-sm"
                        >
                            <ImageIcon className="w-3 h-3" />
                            Choose Image
                        </Button>
                    )}
                </div>
            )}
            
            {/* Label floating badge */}
            <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-[2px] text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider select-none z-10 shadow-sm border border-white/10">
                {label}
            </div>
        </div>
    );
}
