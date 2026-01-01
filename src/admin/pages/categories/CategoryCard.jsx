import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Edit2, Trash2, Star, Eye, EyeOff, MoreVertical, FolderTree, ArrowUpRight } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Card } from '@/ui/card.jsx';
import { Switch } from '@/ui/switch';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu.jsx';
import ColorPicker from '../../components/ColorPicker';
import { buildImageStyle, getContrastColor, toAdminImageUrl, toAdminSrcSet } from '../../utils/helpers';
import { useSettingsStore } from '../../store/useStore';
import { extractImage, getImageSrcSet } from '@shared/utils';

const CategoryCard = ({ category, onDelete, onUpdate, isUpdating = false }) => {
    const { settings } = useSettingsStore();
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [pendingColor, setPendingColor] = useState(null);
    const [localUpdating, setLocalUpdating] = useState(false);
    const colorTriggerRef = useRef(null);

    const getTriggerRect = () => colorTriggerRef.current?.getBoundingClientRect() || null;

    const handleToggle = async (field, value) => {
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
        <Card className="group relative overflow-hidden border-none bg-card shadow-sm hover:shadow-xl transition-all duration-500 rounded-2xl aspect-square flex flex-col p-0">
            {/* Background Image & Overlay */}
            <div className="absolute inset-0 z-0 overflow-hidden">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={category.label}
                        width={selectedImage.imageWidth || 720}
                        height={selectedImage.imageHeight || 720}
                        srcSet={srcSet || undefined}
                        sizes={sizes}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        style={imageStyle}
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted/50 to-muted text-muted-foreground">
                        <FolderTree className="h-10 w-10 opacity-20" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />
            </div>

            {/* Top Status Indicators (Fixed) */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 z-20 pointer-events-none">
                {category.isOnline ? (
                    <div className="bg-emerald-500/90 backdrop-blur-sm p-1 rounded-full shadow-sm" title="Online">
                        <Eye className="h-3 w-3 text-white" />
                    </div>
                ) : (
                    <div className="bg-zinc-800/90 backdrop-blur-sm p-1 rounded-full shadow-sm" title="Offline">
                        <EyeOff className="h-3 w-3 text-white/60" />
                    </div>
                )}
                {category.isFeatured && (
                    <div className="bg-yellow-400/90 backdrop-blur-sm p-1 rounded-full shadow-sm" title="Featured">
                        <Star className="h-3 w-3 text-black fill-black" />
                    </div>
                )}
            </div>

            {/* Quick Actions Dropdown (Top Right) */}
            <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-md text-white border-none">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40 rounded-xl">
                        <DropdownMenuItem asChild>
                            <Link to={`/categories/${category.slug}`} className="cursor-pointer">
                                <Edit2 className="mr-2 h-4 w-4" />
                                Edit Details
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleToggle('isFeatured', !category.isFeatured)}
                            className="cursor-pointer text-yellow-600 dark:text-yellow-400"
                        >
                            <Star className={`mr-2 h-4 w-4 ${category.isFeatured ? 'fill-current' : ''}`} />
                            {category.isFeatured ? 'Unfeature' : 'Feature'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => handleToggle('isOnline', !category.isOnline)}
                            className="cursor-pointer"
                        >
                            {category.isOnline ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                            {category.isOnline ? 'Take Offline' : 'Go Online'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => onDelete(category)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Bottom Content Area */}
            <div className="relative mt-auto p-4 z-10 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                    <div
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm"
                        style={{ backgroundColor: badgeColor, color: textColor }}
                    >
                        {category.label}
                    </div>

                    {/* Inline Color Picker Hook */}
                    <div className="relative pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        <button
                            ref={colorTriggerRef}
                            className="h-3.5 w-3.5 rounded-full ring-1 ring-white/30 hover:ring-white/80 transition-all shadow-sm flex-shrink-0"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            title="Pick Theme Color"
                        >
                            <div className="w-full h-full rounded-full" style={{ backgroundColor: badgeColor }} />
                        </button>
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

                <div className="space-y-0.5">
                    <h3 className="text-white font-bold text-sm tracking-tight leading-tight line-clamp-1">
                        {category.label}
                    </h3>
                    <p className="text-white/60 text-[11px] leading-relaxed line-clamp-2 italic">
                        {category.shortDescription || "Master category for curated culinary content."}
                    </p>
                </div>

                <Link to={`/categories/${category.slug}`} className="pt-1 pointer-events-auto">
                    <div className="text-[10px] text-white/40 group-hover:text-primary transition-colors flex items-center gap-1 font-bold uppercase tracking-widest">
                        View Analytics
                        <ArrowUpRight className="h-3 w-3" />
                    </div>
                </Link>
            </div>
        </Card>
    );
};

export default CategoryCard;
