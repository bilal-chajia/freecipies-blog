/**
 * ImagePickerField - Media Library integration for image selection
 * 
 * Features:
 * - URL input with manual entry
 * - Media library browser button
 * - Image preview with change/remove actions
 */

import React, { useState } from 'react';
import { Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { MediaDialog } from '@admin/features/media/components';
import type { MediaRecord } from '@modules/media/types/media.types';

interface ImagePickerFieldProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

interface SelectableMediaItem extends MediaRecord {
    url?: string;
    path?: string;
}

const ImagePickerField: React.FC<ImagePickerFieldProps> = ({ 
    value, 
    onChange, 
    placeholder = 'Enter image URL' 
}) => {
    const [isMediaOpen, setIsMediaOpen] = useState<boolean>(false);

    const handleMediaSelect = (item: MediaRecord) => {
        const selectableItem = item as SelectableMediaItem;
        const imageUrl = selectableItem.url || selectableItem.path || '';
        onChange(imageUrl);
    };

    const handleClear = () => {
        onChange('');
    };

    return (
        <div className="space-y-2">
            {/* Image Preview */}
            {value && (
                <div className="relative group rounded-lg overflow-hidden border bg-muted/30">
                    <img
                        src={value}
                        alt="Selected"
                        width={500}
                        height={128}
                        loading="lazy"
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsMediaOpen(true)}
                        >
                            <ImageIcon className="size-4 mr-1" />
                            Change
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleClear}
                        >
                            <X className="size-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Input and Button */}
            <div className="flex gap-2">
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="font-mono text-sm h-8 rounded-sm border-input focus:border-ring"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsMediaOpen(true)}
                    title="Select from Media Library"
                    className="h-8 w-8 rounded-sm border-input text-muted-foreground hover:text-foreground hover:border-input"
                >
                    <ImageIcon className="size-4" />
                </Button>
            </div>

            {/* Media Dialog */}
            <MediaDialog
                open={isMediaOpen}
                onOpenChange={setIsMediaOpen}
                onSelect={handleMediaSelect}
            />
        </div>
    );
};

export default ImagePickerField;
