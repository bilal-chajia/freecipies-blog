import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Edit2, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import {
    Card,
} from '@/components/ui/card.jsx';
import { Switch } from '@/components/ui/switch';
import ColorPicker from '../../components/ColorPicker';
import { getContrastColor } from '../../utils/helpers';
import { useSettingsStore } from '../../store/useStore';

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

    // Handle color change locally (no API call)
    const handleColorChange = (newColor) => {
        setPendingColor(newColor);
    };

    // Save color when picker closes
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

    return (
        <motion.div
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="h-full"
        >
            <Card className="group relative overflow-hidden border-0 bg-card shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg rounded-lg h-full flex flex-col aspect-square p-0 gap-0">
                {/* Image Section - Full Cover */}
                <div className="absolute inset-0 z-0">
                    {category.imageUrl ? (
                        <motion.img
                            src={category.imageUrl}
                            alt={category.imageAlt || category.label}
                            className="h-full w-full object-cover"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.5 }}
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
                            <span className="text-sm font-medium">No Image</span>
                        </div>
                    )}
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
                </div>

                {/* Action Buttons - Top Center (Hover Only) */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 pointer-events-auto bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                    {/* Online Toggle */}
                    <Switch
                        id={`online-${category.slug}`}
                        checked={category.isOnline}
                        onCheckedChange={(checked) => handleToggle('isOnline', checked)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isUpdating}
                        className="scale-[0.65] data-[state=checked]:bg-emerald-500"
                        title="Online Status"
                    />

                    {/* Featured Toggle */}
                    <Switch
                        id={`featured-${category.slug}`}
                        checked={category.isFavorite}
                        onCheckedChange={(checked) => handleToggle('isFavorite', checked)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isUpdating}
                        className="scale-[0.65] data-[state=checked]:bg-yellow-400"
                        title="Featured Status"
                    />

                    <div className="w-px h-4 bg-white/30 mx-0.5"></div>

                    {/* Color Picker */}
                    <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
                        <button
                            ref={colorTriggerRef}
                            className="h-4 w-4 rounded-full overflow-hidden border border-white/30 hover:border-white/60 transition-colors flex-shrink-0"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            title="Change Badge Color"
                        >
                            <div
                                className="w-full h-full"
                                style={{ backgroundColor: pendingColor || category.color || '#ff6600' }}
                            />
                        </button>
                        {showColorPicker && (
                            <ColorPicker
                                color={pendingColor || category.color || '#ff6600'}
                                onChange={handleColorChange}
                                onClose={handleColorPickerClose}
                                triggerRect={getTriggerRect()}
                            />
                        )}
                    </div>

                    {/* Edit Button */}
                    <Link to={`/categories/${category.slug}`} onClick={(e) => e.stopPropagation()} className="flex items-center">
                        <button className="h-4 w-4 flex items-center justify-center text-white/80 hover:text-white transition-colors" title="Edit">
                            <Edit2 className="h-3 w-3" />
                        </button>
                    </Link>

                    {/* Delete Button */}
                    <button
                        className="h-4 w-4 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors"
                        onClick={(e) => { e.stopPropagation(); onDelete(category); }}
                        title="Delete"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 flex flex-col h-full p-3 text-white pointer-events-none">
                    <div className="mt-auto space-y-1.5 pointer-events-auto">
                        <div className="border-t border-white/20 pt-2">
                            <h3
                                className="font-semibold text-xs tracking-tight mb-1 inline-flex items-center justify-center px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap leading-none"
                                style={{
                                    backgroundColor: pendingColor || category.color || '#ff6600',
                                    color: '#000000'
                                }}
                            >
                                {category.label}
                            </h3>
                            <p className="text-[10px] text-gray-300 line-clamp-1">
                                {category.shortDescription || 'No description provided.'}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

export default CategoryCard;
