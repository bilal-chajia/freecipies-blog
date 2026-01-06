/**
 * ImagePickerField - Media Library integration for image selection
 * 
 * Features:
 * - URL input with manual entry
 * - Media library browser button
 * - Image preview with change/remove actions
 */

import React, { useState } from 'react';
import { Image, X } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import MediaDialog from '@/components/MediaDialog';

const ImagePickerField = ({ value, onChange, placeholder = 'Enter image URL' }) => {
    const [isMediaOpen, setIsMediaOpen] = useState(false);

    const handleMediaSelect = (item) => {
        const imageUrl = item?.url || item?.path || '';
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
                        className="w-full h-32 object-cover"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setIsMediaOpen(true)}
                        >
                            <Image className="w-4 h-4 mr-1" />
                            Change
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleClear}
                        >
                            <X className="w-4 h-4" />
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
                    className="font-mono text-sm h-[30px] rounded-[2px] border-[#757575] focus:border-[#007cba]"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setIsMediaOpen(true)}
                    title="Select from Media Library"
                    className="h-[30px] w-[30px] rounded-[2px] border-[#757575] text-[#757575] hover:text-[#1e1e1e] hover:border-[#1e1e1e]"
                >
                    <Image className="w-4 h-4" />
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
