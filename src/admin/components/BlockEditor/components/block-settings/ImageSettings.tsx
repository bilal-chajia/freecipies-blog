import { Settings, FolderOpen, Upload } from 'lucide-react';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { SettingsSection } from '../DocumentSettings';
import {
    IMAGE_BLOCK_OPEN_MEDIA_EVENT,
    IMAGE_BLOCK_OPEN_UPLOADER_EVENT,
    dispatchImageBlockEvent,
} from '../../blocks/shared/image-block-events';
import { patchContentImageSlot } from '../../blocks/shared/content-image-slots';

interface ImageSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
    imagesData?: unknown;
    onImagesChange?: (next: unknown) => void;
}

export default function ImageSettings({ selectedBlock, updateProps, imagesData, onImagesChange }: ImageSettingsProps) {
    /**
     * Caption/alt edits update the block props (for immediate inline display)
     * and write through to the canonical images_json.content_images slot, which
     * is the single source of truth (P6). No effect mirrors props -> slot.
     */
    const updateSlotField = (field: 'caption' | 'alt', value: string) => {
        updateProps({ [field]: value });
        const ref = selectedBlock?.props?.imageRef;
        if (!ref || !onImagesChange) return;
        const next = patchContentImageSlot(imagesData, ref, { [field]: value });
        if (next) onImagesChange(next);
    };
    /** Tells the ImageBlock to open its own Media Library dialog. */
    const openBlockMediaDialog = () => {
        if (!selectedBlock?.id) return;
        dispatchImageBlockEvent(IMAGE_BLOCK_OPEN_MEDIA_EVENT, { blockId: selectedBlock.id });
    };

    /** Tells the ImageBlock to open its own Image Uploader dialog. */
    const openBlockUploaderDialog = () => {
        if (!selectedBlock?.id) return;
        dispatchImageBlockEvent(IMAGE_BLOCK_OPEN_UPLOADER_EVENT, { blockId: selectedBlock.id });
    };

    return (
        <SettingsSection title="Image Settings" icon={Settings} defaultOpen>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs">Replace image</Label>
                    <div className="flex gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 gap-1.5"
                            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                            onClick={(e) => { e.stopPropagation(); openBlockMediaDialog(); }}
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                            Media Library
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="h-8 gap-1.5"
                            onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                            onClick={(e) => { e.stopPropagation(); openBlockUploaderDialog(); }}
                        >
                            <Upload className="w-3.5 h-3.5" />
                            Upload
                        </Button>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-xs">Caption</Label>
                    <Input
                        className="h-8 text-sm w-full"
                        value={selectedBlock.props.caption || ''}
                        onChange={(e) => updateSlotField('caption', e.target.value)}
                        placeholder="Image caption"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Alt Text</Label>
                    <Input
                        className="h-8 text-sm w-full"
                        value={selectedBlock.props.alt || ''}
                        onChange={(e) => updateSlotField('alt', e.target.value)}
                        placeholder="Describe the image"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Credit</Label>
                    <div className="min-h-8 rounded-md border border-input/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                        {selectedBlock.props.credit || 'Select an uploaded media item to set image credit.'}
                    </div>
                </div>
            </div>
        </SettingsSection>
    );
}
