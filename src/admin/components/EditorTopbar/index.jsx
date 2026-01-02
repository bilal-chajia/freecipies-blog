/**
 * EditorTopbar Component
 * 
 * Compact horizontal toolbar with publishing and organization controls
 * Displayed in the header area of the article editor
 * 
 * UI/UX Order: Category → Author → Status → Favorite → Date
 * Save button is placed in the main header (between Preview and Cancel)
 */

import { Calendar, Star, Globe, FolderOpen, User, Check, Code, LayoutTemplate } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { Separator } from '@/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Badge } from '@/ui/badge';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';

const containerVariants = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: {
            staggerChildren: 0.05,
        },
    },
};

const itemVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
};

export default function EditorTopbar({
    formData,
    onInputChange,
    categories,
    authors,
    viewMode = 'visual',
    onViewModeChange,
}) {
    return (
        <motion.div
            className="flex items-center gap-3"
            variants={containerVariants}
            initial="initial"
            animate="animate"
        >
            {/* 1. Category Selector */}
            <motion.div variants={itemVariants}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            className="flex items-center gap-1.5"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            <Select
                                value={formData.categoryId ? String(formData.categoryId) : undefined}
                                onValueChange={(value) => onInputChange('categoryId', value)}
                            >
                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id} value={String(cat.id)}>
                                            {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Select category</p>
                    </TooltipContent>
                </Tooltip>
            </motion.div>

            {/* 2. Author Selector */}
            <motion.div variants={itemVariants}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            className="flex items-center gap-1.5"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <Select
                                value={formData.authorId ? String(formData.authorId) : undefined}
                                onValueChange={(value) => onInputChange('authorId', value)}
                            >
                                <SelectTrigger className="w-[110px] h-8 text-xs">
                                    <SelectValue placeholder="Author" />
                                </SelectTrigger>
                                <SelectContent>
                                    {authors.map((author) => (
                                        <SelectItem key={author.id} value={String(author.id)}>
                                            {author.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Select author</p>
                    </TooltipContent>
                </Tooltip>
            </motion.div>

            <motion.div variants={itemVariants}>
                <Separator orientation="vertical" className="h-6" />
            </motion.div>

            {/* 3. Status Toggle */}
            <motion.div variants={itemVariants}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Badge
                                variant={formData.isOnline ? "default" : "secondary"}
                                className={`cursor-pointer transition-colors ${formData.isOnline ? 'bg-green-600 hover:bg-green-700' : ''}`}
                                onClick={() => onInputChange('isOnline', !formData.isOnline)}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={formData.isOnline ? 'online' : 'draft'}
                                        initial={{ opacity: 0, y: -5 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 5 }}
                                        transition={{ duration: 0.15 }}
                                        className="flex items-center"
                                    >
                                        <Globe className="h-3 w-3 mr-1" />
                                        {formData.isOnline ? 'Online' : 'Draft'}
                                    </motion.span>
                                </AnimatePresence>
                            </Badge>
                        </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Toggle visibility status</p>
                    </TooltipContent>
                </Tooltip>
            </motion.div>

            {/* 4. Favorite Toggle */}
            <motion.div variants={itemVariants}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.button
                            type="button"
                            onClick={() => onInputChange('isFavorite', !formData.isFavorite)}
                            className={`p-1.5 rounded-md transition-colors ${formData.isFavorite
                                ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                }`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            animate={formData.isFavorite ? { rotate: [0, -15, 15, 0] } : {}}
                            transition={{ duration: 0.3 }}
                        >
                            <motion.div
                                animate={formData.isFavorite ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                                transition={{ duration: 0.2 }}
                            >
                                <Star className={`h-4 w-4 ${formData.isFavorite ? 'fill-current' : ''}`} />
                            </motion.div>
                        </motion.button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{formData.isFavorite ? 'Remove from favorites' : 'Add to favorites'}</p>
                    </TooltipContent>
                </Tooltip>
            </motion.div>

            <motion.div variants={itemVariants}>
                <Separator orientation="vertical" className="h-6" />
            </motion.div>

            {/* 5. Publish Date Popover */}
            <motion.div variants={itemVariants}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {formData.publishedAt
                                            ? new Date(formData.publishedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                                            : 'Schedule'
                                        }
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-3" align="end">
                                    <motion.div
                                        className="space-y-2"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <Label className="text-xs font-medium">Published Date</Label>
                                        <Input
                                            type="datetime-local"
                                            value={formData.publishedAt}
                                            onChange={(e) => onInputChange('publishedAt', e.target.value)}
                                            className="text-sm h-9"
                                        />
                                    </motion.div>
                                </PopoverContent>
                            </Popover>
                        </motion.div>
                    </TooltipTrigger>
                </Tooltip>
            </motion.div>

            {/* 6. View Mode Toggle */}
            <motion.div variants={itemVariants}>
                <Separator orientation="vertical" className="h-6" />
            </motion.div>

            <motion.div variants={itemVariants}>
                <div className="flex bg-muted/50 p-0.5 rounded-lg border">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => onViewModeChange?.('visual')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'visual'
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <LayoutTemplate className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>Visual Editor</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => onViewModeChange?.('json')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'json'
                                    ? 'bg-background shadow-sm text-foreground'
                                    : 'text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                <Code className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>JSON Data</TooltipContent>
                    </Tooltip>
                </div>
            </motion.div>
        </motion.div>
    );
}
