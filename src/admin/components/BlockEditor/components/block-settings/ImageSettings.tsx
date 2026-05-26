import { Settings, FolderOpen, Upload } from 'lucide-react';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { SettingsSection } from '../DocumentSettings';
import {
    IMAGE_BLOCK_OPEN_MEDIA_EVENT,
    IMAGE_BLOCK_OPEN_UPLOADER_EVENT,
    dispatchImageBlockEvent,
} from '../../blocks/shared/image-block-events';

interface ImageSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
}

export default function ImageSettings({ selectedBlock, updateProps }: ImageSettingsProps) {
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
                    <Label className="text-xs">Alignment</Label>
                    <Select
                        value={selectedBlock.props.alignment || 'center'}
                        onValueChange={(val) => updateProps({ alignment: val })}
                    >
                        <SelectTrigger className="h-8 text-sm w-full">
                            <SelectValue placeholder="Select alignment" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="left">Left</SelectItem>
                            <SelectItem value="center">Center</SelectItem>
                            <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Caption</Label>
                    <Input
                        className="h-8 text-sm w-full"
                        value={selectedBlock.props.caption || ''}
                        onChange={(e) => updateProps({ caption: e.target.value })}
                        placeholder="Image caption"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs">Alt Text</Label>
                    <Input
                        className="h-8 text-sm w-full"
                        value={selectedBlock.props.alt || ''}
                        onChange={(e) => updateProps({ alt: e.target.value })}
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
