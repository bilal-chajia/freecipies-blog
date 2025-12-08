import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const QUALITY_PRESETS = {
    low: { quality: 0.6, label: 'Low (Smallest file)' },
    medium: { quality: 0.75, label: 'Medium (Balanced)' },
    high: { quality: 0.85, label: 'High (Best quality)' },
    original: { quality: 0.92, label: 'Original (Minimal compression)' },
};

const SEOPanel = ({
    altText,
    selectedAuthor,
    authors,
    compressionQuality,
    onAltTextChange,
    onSelectedAuthorChange,
    onCompressionQualityChange,
}) => {
    return (
        <div className="space-y-4">
            {/* Alt Text */}
            <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Alt Text (SEO)</Label>
                <Input
                    value={altText}
                    onChange={(e) => onAltTextChange(e.target.value)}
                    placeholder="Describe the image for SEO & accessibility"
                    className="bg-zinc-800 border-zinc-700"
                />
                <p className="text-xs text-muted-foreground">
                    Helps search engines understand your image
                </p>
            </div>

            {/* Author / Attribution */}
            <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Attribution (Author)</Label>
                <Select value={selectedAuthor} onValueChange={onSelectedAuthorChange}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Select author" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No attribution</SelectItem>
                        {authors.map((author) => (
                            <SelectItem key={author.slug} value={author.slug}>
                                {author.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Credit the image creator
                </p>
            </div>

            {/* Compression Quality */}
            <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Compression Quality</Label>
                <Select value={compressionQuality} onValueChange={onCompressionQualityChange}>
                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Select quality" />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(QUALITY_PRESETS).map(([key, preset]) => (
                            <SelectItem key={key} value={key}>
                                {preset.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                    Higher quality = larger file size
                </p>
            </div>
        </div>
    );
};

export { SEOPanel, QUALITY_PRESETS };
export default SEOPanel;
