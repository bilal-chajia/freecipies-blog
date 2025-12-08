import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Trash2, Star, Globe, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import {
    Card,
    CardContent,
    CardFooter,
} from '@/components/ui/card.jsx';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const CategoryCard = ({ category, onDelete, onUpdate }) => {
    const [updating, setUpdating] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorInputRef = useRef(null);

    const handleToggle = async (field, value) => {
        if (updating) return;
        setUpdating(true);
        try {
            await onUpdate(category.slug, { [field]: value });
        } finally {
            setUpdating(false);
        }
    };

    const handleColorChange = async (e) => {
        const newColor = e.target.value;
        setUpdating(true);
        try {
            await onUpdate(category.slug, { color: newColor });
        } finally {
            setUpdating(false);
            setShowColorPicker(false);
        }
    };

    const openColorPicker = (e) => {
        e.stopPropagation();
        colorInputRef.current?.click();
    };

    return (
        <Card className="group relative overflow-hidden border-0 bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-xl h-full flex flex-col aspect-square p-0 gap-0">
            {/* Image Section - Full Cover */}
            <div className="absolute inset-0 z-0">
                {category.image?.url ? (
                    <img
                        src={category.image.url}
                        alt={category.image.alt || category.label}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                        <span className="text-sm font-medium">No Image</span>
                    </div>
                )}
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
            </div>

            {/* Content Overlay */}
            <div className="relative z-10 flex flex-col h-full p-4 text-white">

                {/* Bottom Content */}
                <div className="mt-auto space-y-3">
                    <div>
                        <h3 className="font-bold text-xl tracking-tight text-white mb-1">
                            {category.label}
                        </h3>
                        <p className="text-xs text-gray-300 line-clamp-2">
                            {category.shortDescription || 'No description provided.'}
                        </p>
                    </div>

                    {/* Toggles and Actions - Single Line */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-2">
                            {/* Online Toggle */}
                            <div
                                className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1"
                                title="Online Status"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Switch
                                    id={`online-${category.slug}`}
                                    checked={category.isOnline}
                                    onCheckedChange={(checked) => handleToggle('isOnline', checked)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="scale-75 data-[state=checked]:bg-emerald-500"
                                />
                                {category.isOnline && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                            </div>

                            {/* Featured Toggle */}
                            <div
                                className="flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-2 py-1"
                                title="Featured Status"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Switch
                                    id={`featured-${category.slug}`}
                                    checked={category.isFavorite}
                                    onCheckedChange={(checked) => handleToggle('isFavorite', checked)}
                                    onClick={(e) => e.stopPropagation()}
                                    className="scale-75 data-[state=checked]:bg-yellow-400"
                                />
                                {category.isFavorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                            </div>
                        </div>

                        <div className="flex gap-1">
                            {/* Color Picker */}
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-7 w-7 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm rounded-full overflow-hidden"
                                    onClick={openColorPicker}
                                    title="Change Badge Color"
                                >
                                    <div
                                        className="absolute inset-1 rounded-full"
                                        style={{ backgroundColor: category.color || '#ff6600' }}
                                    />
                                </Button>
                                <input
                                    ref={colorInputRef}
                                    type="color"
                                    value={category.color || '#ff6600'}
                                    onChange={handleColorChange}
                                    className="absolute opacity-0 w-0 h-0"
                                />
                            </div>
                            <Link to={`/categories/${category.slug}`}>
                                <Button variant="secondary" size="icon" className="h-7 w-7 bg-white/10 hover:bg-white/20 text-white border-0 backdrop-blur-sm rounded-full">
                                    <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                            </Link>
                            <Button
                                variant="destructive"
                                size="icon"
                                className="h-7 w-7 bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm rounded-full"
                                onClick={() => onDelete(category)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default CategoryCard;

