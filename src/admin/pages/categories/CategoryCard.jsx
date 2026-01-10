import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Star, Eye, EyeOff, FolderTree, ExternalLink } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Card } from '@/ui/card.jsx';
import ColorPicker from '@/components/ColorPicker';
import { buildImageStyle, getContrastColor, toAdminImageUrl, toAdminSrcSet } from '../../utils/helpers';
import { extractImage, getImageSrcSet } from '@shared/utils';

const CategoryCard = ({ category, onDelete, onUpdate, isUpdating = false }) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [pendingColor, setPendingColor] = useState(null);
    const [localUpdating, setLocalUpdating] = useState(false);
    const colorTriggerRef = useRef(null);

    const getTriggerRect = () => colorTriggerRef.current?.getBoundingClientRect() || null;

    const handleToggle = async (field, value, e) => {
        e?.stopPropagation();
        e?.preventDefault();
        if (isUpdating || localUpdating) return;
        await onUpdate(category.slug, { [field]: value });
    };

    const handleColorChange = (newColor) => {
        setPendingColor(newColor);
    };

    const handleColorPickerClose = async () => {
        setShowColorPicker(false);
        if (pendingColor && pendingColor !== category.color) {
            setLocalUpdating(true);
            try {
                await onUpdate(category.slug, { color: pendingColor });
            } finally {
                setLocalUpdating(false);
                setPendingColor(null);
            }
        } else {
            setPendingColor(null);
        }
    };

    const badgeColor = pendingColor || category.color || '#ff6600';
    const textColor = getContrastColor(badgeColor);
    const cover = extractImage(category.imagesJson, 'cover', 1200);
    const thumbnail = extractImage(category.imagesJson, 'thumbnail', 720);
    const slotName = cover.imageUrl ? 'cover' : 'thumbnail';
    const selectedImage = cover.imageUrl ? cover : thumbnail;
    const imageUrl = toAdminImageUrl(selectedImage.imageUrl || category.imageUrl);
    const srcSet = toAdminSrcSet(getImageSrcSet(category.imagesJson, slotName));
    const sizes = srcSet ? '320px' : undefined;
    const imageStyle = buildImageStyle(selectedImage);

    return (
        <Link to={`/categories/${category.slug}`} className="block">
            <Card
                className="group relative overflow-hidden bg-accent/50 hover:ring-2 hover:ring-primary/40 transition-all duration-300 aspect-square rounded-2xl cursor-pointer shadow-sm p-0"
                style={{ border: `1px solid ${badgeColor}` }}
            >
                {/* Background Image */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    {imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={category.label}
                            width={selectedImage.imageWidth || 720}
                            height={selectedImage.imageHeight || 720}
                            srcSet={srcSet || undefined}
                            sizes={sizes}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                            style={imageStyle}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted text-muted-foreground">
                            <FolderTree className="h-10 w-10 opacity-20" />
                        </div>
                    )}
                </div>

                {/* Action Icons (Top Right) - appear on hover */}
                <div className="absolute top-2 right-2 flex gap-1 translate-y-[-8px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20">
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-black/50 backdrop-blur-md border-none text-white hover:bg-white hover:text-black"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`/${category.slug}`, '_blank'); }}
                        title="View Live"
                    >
                        <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className={`h-6 w-6 rounded-full backdrop-blur-md border-none text-white ${category.isFeatured ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-black/50 hover:bg-yellow-500'}`}
                        onClick={(e) => handleToggle('isFeatured', !category.isFeatured, e)}
                        title={category.isFeatured ? 'Unfeature' : 'Feature'}
                    >
                        <Star className={`h-3 w-3 ${category.isFeatured ? 'fill-current' : ''}`} />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        className="h-6 w-6 rounded-full bg-black/50 backdrop-blur-md border-none text-white hover:bg-red-500"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(category); }}
                        title="Delete"
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>

                {/* Status Toggle (Top Left) */}
                <button
                    className={`absolute top-2 left-2 z-20 p-1.5 rounded-full backdrop-blur-sm shadow-sm transition-colors ${category.isOnline
                        ? 'bg-emerald-500/90 hover:bg-emerald-600'
                        : 'bg-zinc-700/90 hover:bg-emerald-500'
                        }`}
                    onClick={(e) => handleToggle('isOnline', !category.isOnline, e)}
                    title={category.isOnline ? 'Online' : 'Offline'}
                >
                    {category.isOnline ? (
                        <Eye className="h-3 w-3 text-white" />
                    ) : (
                        <EyeOff className="h-3 w-3 text-white/70" />
                    )}
                </button>

                <div
                    className="absolute bottom-0 left-0 right-0 z-20 px-4 pt-8 pb-3 flex flex-col justify-end"
                    style={{
                        background: `linear-gradient(to top, ${badgeColor} 10%, transparent 100%)`
                    }}
                >
                    <span
                        className="font-bold text-[11px] uppercase tracking-wide line-clamp-1 w-full pr-6 leading-tight"
                        style={{ color: '#ffffff' }}
                    >
                        {category.label}
                    </span>

                    <span
                        className="text-[9px] mt-0.5 font-medium leading-none"
                        style={{ color: '#ffffff' }}
                    >
                        {category.cachedPostCount || 0} posts
                    </span>

                    {/* Color Picker */}
                    <div
                        className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            ref={colorTriggerRef}
                            className="h-4 w-4 rounded-full ring-2 ring-white shadow-sm hover:scale-110 transition-all"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowColorPicker(!showColorPicker); }}
                            title="Change Color"
                            style={{ backgroundColor: badgeColor }}
                        />
                        {showColorPicker && (
                            <ColorPicker
                                color={badgeColor}
                                onChange={handleColorChange}
                                onClose={handleColorPickerClose}
                                triggerRect={getTriggerRect()}
                            />
                        )}
                    </div>
                </div>
            </Card>
        </Link>
    );
};

export default CategoryCard;
