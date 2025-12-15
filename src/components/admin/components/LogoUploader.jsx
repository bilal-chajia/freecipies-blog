import React, { useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Upload, X, Image as ImageIcon, Moon, Sun, Smartphone } from 'lucide-react';
import { brandingAPI } from '../services/api';

const LOGO_TYPES = [
    {
        id: 'main',
        label: 'Main Logo',
        description: 'Primary logo for light mode',
        icon: Sun
    },
    {
        id: 'dark',
        label: 'Dark Mode Logo',
        description: 'Logo for dark theme',
        icon: Moon
    },
    {
        id: 'mobile',
        label: 'Mobile Logo',
        description: 'Compact logo for mobile devices',
        icon: Smartphone
    },
];

const ACCEPTED_TYPES = '.svg,.png,.jpg,.jpeg,.webp,.gif';

const LogoUploader = ({ logos, onLogoChange, onLogoDelete }) => {
    const [uploading, setUploading] = useState({});
    const [dragOver, setDragOver] = useState({});
    const fileInputRefs = useRef({});

    const handleFileSelect = async (type, file) => {
        if (!file) return;

        // Validate file type
        const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            alert('Invalid file type. Please upload SVG, PNG, JPG, WebP, or GIF.');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('File too large. Maximum size is 5MB.');
            return;
        }

        try {
            setUploading(prev => ({ ...prev, [type]: true }));

            const response = await brandingAPI.uploadLogo(type, file);

            if (response.data?.success) {
                onLogoChange(type, response.data.data.url);
            } else {
                alert(response.data?.error || 'Failed to upload logo');
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert(error.response?.data?.error || 'Failed to upload logo');
        } finally {
            setUploading(prev => ({ ...prev, [type]: false }));
        }
    };

    const handleDelete = async (type) => {
        if (!confirm('Are you sure you want to delete this logo?')) return;

        try {
            const response = await brandingAPI.deleteLogo(type);

            if (response.data?.success) {
                onLogoDelete(type);
            } else {
                alert(response.data?.error || 'Failed to delete logo');
            }
        } catch (error) {
            console.error('Delete failed:', error);
            alert(error.response?.data?.error || 'Failed to delete logo');
        }
    };

    const handleDragOver = (e, type) => {
        e.preventDefault();
        setDragOver(prev => ({ ...prev, [type]: true }));
    };

    const handleDragLeave = (e, type) => {
        e.preventDefault();
        setDragOver(prev => ({ ...prev, [type]: false }));
    };

    const handleDrop = (e, type) => {
        e.preventDefault();
        setDragOver(prev => ({ ...prev, [type]: false }));

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(type, file);
        }
    };

    const getLogoKey = (type) => {
        const keyMap = { main: 'logoMain', dark: 'logoDark', mobile: 'logoMobile' };
        return keyMap[type];
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                <div>
                    <h3 className="text-lg font-semibold">Logo Management</h3>
                    <p className="text-sm text-muted-foreground">
                        Upload your site logos. SVG format is recommended for best quality.
                    </p>
                </div>
            </div>

            {/* Logo Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {LOGO_TYPES.map((logoType) => {
                    const Icon = logoType.icon;
                    const logoUrl = logos[getLogoKey(logoType.id)];
                    const isUploading = uploading[logoType.id];
                    const isDragOver = dragOver[logoType.id];

                    return (
                        <Card
                            key={logoType.id}
                            className={`overflow-hidden transition-all ${isDragOver ? 'ring-2 ring-primary' : ''}`}
                            onDragOver={(e) => handleDragOver(e, logoType.id)}
                            onDragLeave={(e) => handleDragLeave(e, logoType.id)}
                            onDrop={(e) => handleDrop(e, logoType.id)}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Icon className="w-4 h-4" />
                                    {logoType.label}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {logoType.description}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {logoUrl ? (
                                    <div className="space-y-3">
                                        {/* Logo Preview */}
                                        <div className="relative h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                                            <img
                                                src={logoUrl}
                                                alt={logoType.label}
                                                className="max-w-full max-h-full object-contain p-2"
                                            />
                                        </div>
                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => fileInputRefs.current[logoType.id]?.click()}
                                                disabled={isUploading}
                                            >
                                                <Upload className="w-3 h-3 mr-1" />
                                                Replace
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDelete(logoType.id)}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className={`
                                            h-32 border-2 border-dashed rounded-lg 
                                            flex flex-col items-center justify-center cursor-pointer
                                            transition-colors hover:border-primary/50 hover:bg-muted/30
                                            ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
                                        `}
                                        onClick={() => fileInputRefs.current[logoType.id]?.click()}
                                    >
                                        {isUploading ? (
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                                        ) : (
                                            <>
                                                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                                                <p className="text-xs font-medium text-center">
                                                    Drop or click
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    SVG, PNG, JPG
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}

                                <input
                                    ref={(el) => fileInputRefs.current[logoType.id] = el}
                                    type="file"
                                    accept={ACCEPTED_TYPES}
                                    className="hidden"
                                    onChange={(e) => handleFileSelect(logoType.id, e.target.files?.[0])}
                                />
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Live Preview */}
            {(logos.logoMain || logos.logoDark) && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Live Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Light mode preview */}
                            <div className="rounded-lg border bg-white p-4">
                                <p className="text-xs text-gray-500 mb-2">Light Mode</p>
                                <div className="h-10 flex items-center">
                                    {logos.logoMain ? (
                                        <img
                                            src={logos.logoMain}
                                            alt="Main Logo"
                                            className="h-8 object-contain"
                                        />
                                    ) : (
                                        <div className="h-8 w-20 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                                            No logo
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Dark mode preview */}
                            <div className="rounded-lg border bg-zinc-900 p-4">
                                <p className="text-xs text-zinc-400 mb-2">Dark Mode</p>
                                <div className="h-10 flex items-center">
                                    {logos.logoDark || logos.logoMain ? (
                                        <img
                                            src={logos.logoDark || logos.logoMain}
                                            alt="Dark Logo"
                                            className="h-8 object-contain"
                                        />
                                    ) : (
                                        <div className="h-8 w-20 bg-zinc-700 rounded flex items-center justify-center text-xs text-zinc-500">
                                            No logo
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default LogoUploader;
