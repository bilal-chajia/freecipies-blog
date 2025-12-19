import React, { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';
import { Button } from '@/ui/button.jsx';
import { Label } from '@/ui/label.jsx';
import { Badge } from '@/ui/badge.jsx';
import { Upload, X, Globe, Check, Loader2 } from 'lucide-react';
import { brandingAPI } from '../services/api';

const FAVICON_SIZES = [
    { name: 'favicon-16x16.png', size: 16, label: '16×16' },
    { name: 'favicon-32x32.png', size: 32, label: '32×32' },
    { name: 'apple-touch-icon.png', size: 180, label: 'Apple Touch (180×180)' },
    { name: 'android-chrome-192x192.png', size: 192, label: 'Android (192×192)' },
    { name: 'android-chrome-512x512.png', size: 512, label: 'Android Large (512×512)' },
];

const ACCEPTED_TYPES = '.svg,.png,.jpg,.jpeg,.webp,.gif,.ico';

const FaviconUploader = ({ favicon, faviconVariants, onFaviconChange, onFaviconDelete }) => {
    const [uploading, setUploading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({});
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    // Generate a favicon variant at specified size
    const generateFaviconVariant = async (sourceImage, size, filename) => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            // Draw the image scaled to the target size
            ctx.drawImage(sourceImage, 0, 0, size, size);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve({ blob, filename, size });
                    } else {
                        reject(new Error('Failed to generate blob'));
                    }
                },
                'image/png',
                1.0
            );
        });
    };

    // Upload a generated variant
    const uploadVariant = async (blob, filename) => {
        const response = await brandingAPI.uploadFaviconVariant(blob, filename);
        return response.data;
    };

    const handleFileSelect = async (file) => {
        if (!file) return;

        // Validate file type
        const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon'];
        if (!validTypes.includes(file.type)) {
            alert('Invalid file type. Please upload SVG, PNG, JPG, WebP, GIF, or ICO.');
            return;
        }

        // Validate file size (max 2MB for favicon)
        if (file.size > 2 * 1024 * 1024) {
            alert('File too large. Maximum size is 2MB for favicons.');
            return;
        }

        try {
            setUploading(true);

            // Upload the original favicon
            const response = await brandingAPI.uploadFavicon(file);

            if (!response.data?.success) {
                alert(response.data?.error || 'Failed to upload favicon');
                return;
            }

            onFaviconChange(response.data.data.url);

            // Now generate variants
            setGenerating(true);
            setGenerationProgress({});

            // Load the image for generation
            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = response.data.data.url + '?t=' + Date.now(); // Cache bust
            });

            // Generate each variant
            for (const { name, size, label } of FAVICON_SIZES) {
                try {
                    setGenerationProgress(prev => ({ ...prev, [name]: 'generating' }));

                    const { blob, filename } = await generateFaviconVariant(img, size, name);

                    setGenerationProgress(prev => ({ ...prev, [name]: 'uploading' }));

                    await uploadVariant(blob, filename);

                    setGenerationProgress(prev => ({ ...prev, [name]: 'done' }));
                } catch (error) {
                    console.error(`Failed to generate ${name}:`, error);
                    setGenerationProgress(prev => ({ ...prev, [name]: 'error' }));
                }
            }

        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload favicon');
        } finally {
            setUploading(false);
            setGenerating(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete the favicon and all generated variants?')) return;

        try {
            const response = await brandingAPI.deleteFavicon();

            if (response.data?.success) {
                onFaviconDelete();
                setGenerationProgress({});
            } else {
                alert(response.data?.error || 'Failed to delete favicon');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert(error.response?.data?.error || 'Failed to delete favicon');
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'generating':
            case 'uploading':
                return <Loader2 className="w-3 h-3 animate-spin" />;
            case 'done':
                return <Check className="w-3 h-3 text-green-500" />;
            case 'error':
                return <X className="w-3 h-3 text-red-500" />;
            default:
                return null;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Favicon Management
                </CardTitle>
                <CardDescription>
                    Upload a favicon and we'll automatically generate all required sizes for different platforms.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Upload Area */}
                <div className="space-y-2">
                    <Label>Favicon Image</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                        Upload a square image (at least 512×512 for best results). SVG is recommended.
                    </p>

                    <div
                        className={`
                            relative border-2 border-dashed rounded-lg p-4 transition-colors
                            ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                            ${favicon ? 'bg-muted/30' : 'hover:border-muted-foreground/50'}
                        `}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {favicon ? (
                            <div className="flex items-center gap-4">
                                <div className="relative w-16 h-16 bg-muted rounded flex items-center justify-center overflow-hidden border">
                                    <img
                                        src={favicon}
                                        alt="Favicon"
                                        className="w-12 h-12 object-contain"
                                    />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Current favicon</p>
                                    <p className="text-xs text-muted-foreground truncate max-w-xs">
                                        {favicon}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={uploading || generating}
                                    >
                                        <Upload className="w-4 h-4 mr-1" />
                                        Replace
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleDelete}
                                        disabled={uploading || generating}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex flex-col items-center justify-center py-6 cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {uploading ? (
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                                        <p className="text-sm font-medium">
                                            Drop file here or click to upload
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            SVG, PNG, JPG, WebP, GIF, ICO (max 2MB)
                                        </p>
                                    </>
                                )}
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPTED_TYPES}
                            className="hidden"
                            onChange={(e) => handleFileSelect(e.target.files?.[0])}
                        />
                    </div>
                </div>

                {/* Generation Progress / Variants */}
                {(generating || Object.keys(generationProgress).length > 0 || (faviconVariants && Object.keys(faviconVariants).length > 0)) && (
                    <div className="space-y-3">
                        <Label>Generated Sizes</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {FAVICON_SIZES.map(({ name, label }) => {
                                const status = generationProgress[name];
                                const exists = faviconVariants?.[name];

                                return (
                                    <div
                                        key={name}
                                        className="flex items-center justify-between p-2 rounded bg-muted/50 text-sm"
                                    >
                                        <span className="text-muted-foreground">{label}</span>
                                        <div className="flex items-center gap-2">
                                            {status ? (
                                                <>
                                                    {getStatusIcon(status)}
                                                    <span className="text-xs capitalize">{status}</span>
                                                </>
                                            ) : exists ? (
                                                <Badge variant="secondary" className="text-xs">
                                                    <Check className="w-3 h-3 mr-1" />
                                                    Ready
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Not generated</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Browser Tab Preview */}
                {favicon && (
                    <div className="mt-6 pt-6 border-t">
                        <Label className="mb-4 block">Browser Tab Preview</Label>
                        <div className="rounded-lg border bg-zinc-100 p-3">
                            <div className="flex items-center gap-2 bg-white rounded-t-lg px-3 py-2 shadow-sm border-b max-w-xs">
                                <img
                                    src={favicon}
                                    alt="Favicon"
                                    className="w-4 h-4 object-contain"
                                />
                                <span className="text-sm text-zinc-600 truncate">
                                    Freecipies - Delicious Recipes
                                </span>
                                <X className="w-3 h-3 text-zinc-400 ml-auto" />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default FaviconUploader;
