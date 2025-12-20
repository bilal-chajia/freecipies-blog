import React, { useRef, useState } from 'react';
import { Card, CardContent } from '@/ui/card.jsx';
import { Button } from '@/ui/button.jsx';
import { Badge } from '@/ui/badge.jsx';
import { Upload, Trash2, RefreshCw, Image as ImageIcon, Moon, Sun, Smartphone, Globe, Check } from 'lucide-react';
import { brandingAPI } from '../services/api';

const BRANDING_ITEMS = [
    {
        id: 'main',
        type: 'logo',
        label: 'Main Logo',
        subtitle: 'Light mode header',
        icon: Sun,
        previewBg: 'bg-gradient-to-br from-white to-gray-50',
        iconColor: 'text-amber-500',
        borderColor: 'hover:border-amber-200'
    },
    {
        id: 'dark',
        type: 'logo',
        label: 'Dark Logo',
        subtitle: 'Dark mode header',
        icon: Moon,
        previewBg: 'bg-gradient-to-br from-zinc-800 to-zinc-900',
        iconColor: 'text-indigo-400',
        borderColor: 'hover:border-indigo-200'
    },
    {
        id: 'mobile',
        type: 'logo',
        label: 'Mobile Logo',
        subtitle: 'Compact version',
        icon: Smartphone,
        previewBg: 'bg-gradient-to-br from-gray-50 to-gray-100',
        iconColor: 'text-emerald-500',
        borderColor: 'hover:border-emerald-200'
    },
    {
        id: 'favicon',
        type: 'favicon',
        label: 'Favicon',
        subtitle: 'Browser tab icon',
        icon: Globe,
        previewBg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
        iconColor: 'text-blue-500',
        borderColor: 'hover:border-blue-200'
    },
];

const ACCEPTED_TYPES = '.svg,.png,.jpg,.jpeg,.webp,.gif';
const FAVICON_ACCEPTED_TYPES = '.svg,.png,.jpg,.jpeg,.webp,.gif,.ico';

const BrandingCards = ({ logos, favicon, onLogoChange, onLogoDelete, onFaviconChange, onFaviconDelete }) => {
    const [uploading, setUploading] = useState({});
    const [dragOver, setDragOver] = useState({});
    const [hovered, setHovered] = useState({});
    const fileInputRefs = useRef({});

    const getAssetUrl = (item) => {
        if (item.type === 'favicon') {
            return favicon;
        }
        const keyMap = { main: 'logoMain', dark: 'logoDark', mobile: 'logoMobile' };
        return logos[keyMap[item.id]];
    };

    const handleFileSelect = async (item, file) => {
        if (!file) return;

        const validTypes = item.type === 'favicon'
            ? ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon']
            : ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];

        if (!validTypes.includes(file.type)) {
            alert('Invalid file type.');
            return;
        }

        const maxSize = item.type === 'favicon' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > maxSize) {
            alert(`File too large. Maximum size is ${item.type === 'favicon' ? '2MB' : '5MB'}.`);
            return;
        }

        try {
            setUploading(prev => ({ ...prev, [item.id]: true }));

            if (item.type === 'favicon') {
                const response = await brandingAPI.uploadFavicon(file);
                if (response.data?.success) {
                    onFaviconChange(response.data.data.url);
                    await generateFaviconVariants(response.data.data.url);
                } else {
                    alert(response.data?.error || 'Failed to upload favicon');
                }
            } else {
                const response = await brandingAPI.uploadLogo(item.id, file);
                if (response.data?.success) {
                    onLogoChange(item.id, response.data.data.url);
                } else {
                    alert(response.data?.error || 'Failed to upload logo');
                }
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert(error.response?.data?.error || 'Failed to upload');
        } finally {
            setUploading(prev => ({ ...prev, [item.id]: false }));
        }
    };

    const generateFaviconVariants = async (faviconUrl) => {
        const FAVICON_SIZES = [
            { name: 'favicon-16x16.png', size: 16 },
            { name: 'favicon-32x32.png', size: 32 },
            { name: 'apple-touch-icon.png', size: 180 },
            { name: 'android-chrome-192x192.png', size: 192 },
            { name: 'android-chrome-512x512.png', size: 512 },
        ];

        try {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = faviconUrl + '?t=' + Date.now();
            });

            for (const { name, size } of FAVICON_SIZES) {
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, size, size);
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
                    if (blob) {
                        await brandingAPI.uploadFaviconVariant(blob, name);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to generate favicon variants:', error);
        }
    };

    const handleDelete = async (item) => {
        if (!confirm(`Delete this ${item.type}?`)) return;

        try {
            if (item.type === 'favicon') {
                const response = await brandingAPI.deleteFavicon();
                if (response.data?.success) onFaviconDelete();
            } else {
                const response = await brandingAPI.deleteLogo(item.id);
                if (response.data?.success) onLogoDelete(item.id);
            }
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleDragOver = (e, id) => {
        e.preventDefault();
        setDragOver(prev => ({ ...prev, [id]: true }));
    };

    const handleDragLeave = (e, id) => {
        e.preventDefault();
        setDragOver(prev => ({ ...prev, [id]: false }));
    };

    const handleDrop = (e, item) => {
        e.preventDefault();
        setDragOver(prev => ({ ...prev, [item.id]: false }));
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(item, file);
    };

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30">
                        <ImageIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">Brand Assets</h3>
                        <p className="text-sm text-muted-foreground">
                            Logos & favicon for your site
                        </p>
                    </div>
                </div>
                <Badge variant="secondary" className="text-xs">
                    SVG recommended
                </Badge>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {BRANDING_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const assetUrl = getAssetUrl(item);
                    const isUploading = uploading[item.id];
                    const isDragOver = dragOver[item.id];
                    const isHovered = hovered[item.id];

                    return (
                        <Card
                            key={item.id}
                            className={`
                                group relative overflow-hidden transition-all duration-200
                                border-2 ${item.borderColor}
                                ${isDragOver ? 'ring-2 ring-primary border-primary scale-[1.02]' : ''}
                                ${assetUrl ? 'shadow-sm hover:shadow-md' : ''}
                            `}
                            onDragOver={(e) => handleDragOver(e, item.id)}
                            onDragLeave={(e) => handleDragLeave(e, item.id)}
                            onDrop={(e) => handleDrop(e, item)}
                            onMouseEnter={() => setHovered(prev => ({ ...prev, [item.id]: true }))}
                            onMouseLeave={() => setHovered(prev => ({ ...prev, [item.id]: false }))}
                        >
                            <CardContent className="p-0">
                                {/* Preview Area */}
                                <div
                                    className={`
                                        relative h-32 ${item.previewBg} 
                                        flex items-center justify-center cursor-pointer
                                        transition-all duration-200
                                    `}
                                    onClick={() => fileInputRefs.current[item.id]?.click()}
                                >
                                    {assetUrl ? (
                                        <>
                                            <img
                                                src={assetUrl}
                                                alt={item.label}
                                                className={`
                                                    max-w-[80%] max-h-[70%] object-contain
                                                    transition-transform duration-200
                                                    ${isHovered ? 'scale-105' : ''}
                                                `}
                                            />

                                            {/* Hover Overlay with Actions */}
                                            <div className={`
                                                absolute inset-0 bg-black/40 backdrop-blur-[2px]
                                                flex items-center justify-center gap-2
                                                transition-opacity duration-200
                                                ${isHovered ? 'opacity-100' : 'opacity-0'}
                                            `}>
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    className="h-8 px-3 bg-white hover:bg-gray-100 text-gray-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        fileInputRefs.current[item.id]?.click();
                                                    }}
                                                    disabled={isUploading}
                                                >
                                                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                                                    Replace
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    className="h-8 w-8 p-0"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(item);
                                                    }}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>

                                            {/* Status indicator */}
                                            <div className="absolute top-2 right-2">
                                                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                                    <Check className="w-3 h-3 text-white" />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className={`
                                            flex flex-col items-center justify-center
                                            transition-all duration-200
                                            ${isDragOver ? 'scale-110' : ''}
                                        `}>
                                            {isUploading ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                                                    <span className="text-xs text-muted-foreground">Uploading...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className={`
                                                        p-3 rounded-full bg-white/80 dark:bg-zinc-800/80 
                                                        shadow-sm mb-2 transition-transform duration-200
                                                        group-hover:scale-110
                                                    `}>
                                                        <Upload className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                    <span className="text-xs font-medium text-muted-foreground">
                                                        {isDragOver ? 'Drop here!' : 'Click or drag'}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Label Section */}
                                <div className="px-3 py-2.5 bg-white dark:bg-zinc-900 border-t">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1 rounded ${item.iconColor} bg-opacity-10`}>
                                            <Icon className={`w-3.5 h-3.5 ${item.iconColor}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{item.label}</p>
                                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                                        </div>
                                    </div>
                                </div>

                                <input
                                    ref={(el) => fileInputRefs.current[item.id] = el}
                                    type="file"
                                    accept={item.type === 'favicon' ? FAVICON_ACCEPTED_TYPES : ACCEPTED_TYPES}
                                    className="hidden"
                                    onChange={(e) => handleFileSelect(item, e.target.files?.[0])}
                                />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default BrandingCards;
