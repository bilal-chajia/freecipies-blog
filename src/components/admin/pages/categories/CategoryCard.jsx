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

const CategoryCard = ({ category, onDelete, onUpdate }) => {
    const { settings } = useSettingsStore();
    const [updating, setUpdating] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorTriggerRef = useRef(null);

    const getTriggerRect = () => colorTriggerRef.current?.getBoundingClientRect() || null;

    const handleToggle = async (field, value) => {
        if (updating) return;
        setUpdating(true);
        try {
            await onUpdate(category.slug, { [field]: value });
        } finally {
            setUpdating(false);
        }
    };

    const handleColorChange = async (newColor) => {
        setUpdating(true);
        try {
            await onUpdate(category.slug, { color: newColor });
        } finally {
            setUpdating(false);
        }
    };

    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="h-full"
        >
            <Card className="group relative overflow-hidden border-0 bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-xl h-full flex flex-col aspect-square p-0 gap-0">
                {/* Image Section - Full Cover */}
                <div className="absolute inset-0 z-0">
                    {category.image?.url ? (
                        <motion.img
                            src={category.image.url}
                            alt={category.image.alt || category.label}
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
                <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 pointer-events-auto w-max max-w-[90%] flex-wrap justify-center">
                    {/* Online Toggle */}
                    <div
                        className="flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full h-6 px-1.5"
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
                    </div>

                    {/* Featured Toggle */}
                    <div
                        className="flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full h-6 px-1.5"
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
                    </div>

                    <div className="w-px h-4 bg-white/20 mx-0.5"></div>

                    {/* Color Picker */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <Button
                            ref={colorTriggerRef}
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6 bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm rounded-full overflow-hidden"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            title="Change Badge Color"
                        >
                            <div
                                className="absolute inset-1 rounded-full"
                                style={{ backgroundColor: category.color || '#ff6600' }}
                            />
                        </Button>
                        {showColorPicker && (
                            <ColorPicker
                                color={category.color || '#ff6600'}
                                onChange={handleColorChange}
                                onClose={() => setShowColorPicker(false)}
                                triggerRect={getTriggerRect()}
                            />
                        )}
                    </div>
                    <Link to={`/categories/${category.slug}`}>
                        <Button variant="secondary" size="icon" className="h-6 w-6 bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm rounded-full">
                            <Edit2 className="h-3 w-3" />
                        </Button>
                    </Link>
                    <Button
                        variant="destructive"
                        size="icon"
                        className="h-6 w-6 bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm rounded-full"
                        onClick={() => onDelete(category)}
                    >
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 flex flex-col h-full p-4 text-white pointer-events-none">
                    <div className="mt-auto space-y-3 pointer-events-auto">
                        <div className="border-t border-white/20 pt-3">
                            <h3
                                className="font-bold text-sm tracking-tight mb-2 inline-block px-3 py-1 rounded-full shadow-sm whitespace-nowrap"
                                style={{
                                    backgroundColor: settings?.badgeColor || '#3b82f6',
                                    color: category.color || '#ffffff'
                                }}
                            >
                                {category.label}
                            </h3>
                            <p className="text-xs text-gray-300 line-clamp-2">
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
