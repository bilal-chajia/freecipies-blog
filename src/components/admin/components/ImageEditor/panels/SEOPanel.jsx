import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Wand2, Loader2, Sparkles } from 'lucide-react';

import { QUALITY_PRESETS } from '../constants';

const SEOPanel = ({
    altText,
    selectedAuthor,
    authors,
    compressionQuality,
    imageUrl, // New prop - the current working image URL/dataURL
    onAltTextChange,
    onSelectedAuthorChange,
    onCompressionQualityChange,
}) => {
    const [generating, setGenerating] = useState(false);
    const [puterLoaded, setPuterLoaded] = useState(false);
    const [error, setError] = useState('');

    // Load Puter.js when panel mounts
    useEffect(() => {
        if (window.puter) {
            setPuterLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.src = 'https://js.puter.com/v2/';
        script.async = true;
        script.onload = () => setPuterLoaded(true);
        script.onerror = () => setError('Failed to load AI');
        document.head.appendChild(script);
    }, []);

    const handleGenerateAltText = async () => {
        if (!imageUrl || !puterLoaded) return;

        setGenerating(true);
        setError('');

        try {
            // Use puter.ai.chat with image analysis capability
            const prompt = `Generate a concise, descriptive alt text for this image. The alt text should be:
- Under 125 characters
- Descriptive but concise
- Focused on the main subject
- Good for SEO and accessibility
- Just return the alt text, no quotes or explanations`;

            const response = await window.puter.ai.chat(prompt, imageUrl, {
                model: 'gpt-4o-mini'
            });

            // Extract the text from response
            let altTextResult = '';
            if (typeof response === 'string') {
                altTextResult = response;
            } else if (response?.message?.content) {
                altTextResult = response.message.content;
            } else if (response?.text) {
                altTextResult = response.text;
            } else {
                altTextResult = String(response);
            }

            // Clean up the result
            altTextResult = altTextResult.replace(/^["']|["']$/g, '').trim();
            onAltTextChange(altTextResult);
        } catch (err) {
            console.error('Alt text generation error:', err);
            setError('Failed to generate alt text');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Alt Text with AI Generate */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-sm text-muted-foreground">Alt Text (SEO)</Label>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateAltText}
                        disabled={generating || !imageUrl || !puterLoaded}
                        className="h-7 text-xs gap-1.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/30 hover:border-purple-500/50"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-3 h-3" />
                                AI Generate
                            </>
                        )}
                    </Button>
                </div>
                <Input
                    value={altText}
                    onChange={(e) => onAltTextChange(e.target.value)}
                    placeholder="Describe the image for SEO & accessibility"
                    className="bg-zinc-800 border-zinc-700"
                />
                {error ? (
                    <p className="text-xs text-red-400">{error}</p>
                ) : (
                    <p className="text-xs text-muted-foreground">
                        {puterLoaded ? 'Click AI Generate or type manually' : 'Loading AI...'}
                    </p>
                )}
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
