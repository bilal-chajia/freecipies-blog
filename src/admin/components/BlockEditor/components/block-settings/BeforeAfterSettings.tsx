import { Settings, FolderOpen, Trash2 } from 'lucide-react';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { SettingsSection } from '../DocumentSettings';
import { patchContentImageSlot, removeContentImageSlot } from '../../blocks/shared/content-image-slots';
import { dispatchBeforeAfterEvent } from '../../blocks/shared/before-after-events';
import type { BeforeAfterSlot } from '../../blocks/before-after/BeforeAfterBlock.types';

interface BeforeAfterSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
    imagesData?: unknown;
    onImagesChange?: (next: unknown) => void;
}

const parseSlot = (value: string): BeforeAfterSlot | null => {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
};

export default function BeforeAfterSettings({
    selectedBlock,
    updateProps,
    imagesData,
    onImagesChange,
}: BeforeAfterSettingsProps) {
    const before = parseSlot(selectedBlock.props.beforeJson);
    const after = parseSlot(selectedBlock.props.afterJson);

    const updateSlot = (slotKey: 'before' | 'after', nextSlot: BeforeAfterSlot | null) => {
        const refProp = slotKey === 'before' ? selectedBlock.props.beforeImageRef : selectedBlock.props.afterImageRef;
        const ref = typeof refProp === 'string' ? refProp : '';

        if (!nextSlot) {
            updateProps({ [`${slotKey}Json`]: '' });
            if (ref && onImagesChange) onImagesChange(removeContentImageSlot(imagesData, ref));
            return;
        }

        updateProps({
            [`${slotKey}Json`]: JSON.stringify(nextSlot),
            [`${slotKey}Label`]: nextSlot.label ?? '',
        });

        if (ref && onImagesChange) {
            const patched = patchContentImageSlot(imagesData, ref, {
                alt: nextSlot.alt ?? '',
                label: nextSlot.label ?? '',
            });
            if (patched) onImagesChange(patched);
        }
    };

    const updateSlotField = (slotKey: 'before' | 'after', field: 'alt' | 'label', val: string) => {
        const slot = slotKey === 'before' ? before : after;
        if (!slot) return;
        updateSlot(slotKey, { ...slot, [field]: val });
    };

    const openMediaDialog = (slotKey: 'before' | 'after') => {
        if (!selectedBlock?.id) return;
        dispatchBeforeAfterEvent({ blockId: selectedBlock.id, slotKey });
    };

    return (
        <SettingsSection title="Before / After Settings" icon={Settings} defaultOpen>
            <div className="space-y-4">
                {/* General Layout */}
                <div className="space-y-2">
                    <Label className="text-xs">Layout</Label>
                    <Select
                        value={selectedBlock.props.layout || 'slider'}
                        onValueChange={(val) => updateProps({ layout: val })}
                    >
                        <SelectTrigger className="h-8 text-sm w-full">
                            <SelectValue placeholder="Select layout" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="slider">Slider</SelectItem>
                            <SelectItem value="side_by_side">Side by side</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Before Image Section */}
                <div className="space-y-3 pt-2 border-t border-border/45">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground/80">Before Image</Label>
                        {before && (
                            <button
                                type="button"
                                onClick={() => updateSlot('before', null)}
                                className="text-[10px] text-destructive hover:underline flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" />
                                Remove
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 gap-1.5 w-full text-xs font-medium"
                            onClick={() => openMediaDialog('before')}
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            {before ? 'Replace Image' : 'Choose Image'}
                        </Button>
                    </div>
                    {before && (
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Alt Text</Label>
                                <Input
                                    className="h-8 text-xs w-full"
                                    value={before.alt || ''}
                                    onChange={(e) => updateSlotField('before', 'alt', e.target.value)}
                                    placeholder="Describe the image"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Label</Label>
                                <Input
                                    className="h-8 text-xs w-full"
                                    value={before.label || ''}
                                    onChange={(e) => updateSlotField('before', 'label', e.target.value)}
                                    placeholder="Before"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* After Image Section */}
                <div className="space-y-3 pt-2 border-t border-border/45">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground/80">After Image</Label>
                        {after && (
                            <button
                                type="button"
                                onClick={() => updateSlot('after', null)}
                                className="text-[10px] text-destructive hover:underline flex items-center gap-1"
                            >
                                <Trash2 className="w-3 h-3" />
                                Remove
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 gap-1.5 w-full text-xs font-medium"
                            onClick={() => openMediaDialog('after')}
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            {after ? 'Replace Image' : 'Choose Image'}
                        </Button>
                    </div>
                    {after && (
                        <div className="space-y-2">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Alt Text</Label>
                                <Input
                                    className="h-8 text-xs w-full"
                                    value={after.alt || ''}
                                    onChange={(e) => updateSlotField('after', 'alt', e.target.value)}
                                    placeholder="Describe the image"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Label</Label>
                                <Input
                                    className="h-8 text-xs w-full"
                                    value={after.label || ''}
                                    onChange={(e) => updateSlotField('after', 'label', e.target.value)}
                                    placeholder="After"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </SettingsSection>
    );
}
