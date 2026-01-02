/**
 * Block Inserter Component
 * 
 * Left panel in the WordPress Block Editor layout.
 * Provides a searchable list of available blocks that can be inserted into the editor.
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    X,
    ChevronDown,
    Type,
    Image,
    Video,
    Table2,
    HelpCircle,
    LayoutGrid,
    Minus,
    Lightbulb,
    SplitSquareHorizontal,
    Hash,
    FileText,
    List,
    Quote,
    Code,
    Utensils,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/scroll-area';
import { Input } from '@/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';

// Block categories with their blocks
const blockCategories = [
    {
        id: 'text',
        label: 'Text',
        blocks: [
            { type: 'paragraph', icon: Type, label: 'Paragraph', description: 'Start with basic text' },
            { type: 'heading', icon: Hash, label: 'Heading', description: 'Add a heading' },
            { type: 'list', icon: List, label: 'List', description: 'Create a bulleted or numbered list' },
            { type: 'quote', icon: Quote, label: 'Quote', description: 'Add a quote' },
            { type: 'code', icon: Code, label: 'Code', description: 'Display code snippets' },
        ],
    },
    {
        id: 'media',
        label: 'Media',
        blocks: [
            { type: 'customImage', icon: Image, label: 'Image', description: 'Insert an image' },
            { type: 'video', icon: Video, label: 'Video', description: 'Embed a video' },
            { type: 'beforeAfter', icon: SplitSquareHorizontal, label: 'Before/After', description: 'Compare two images' },
        ],
    },
    {
        id: 'content',
        label: 'Content',
        blocks: [
            { type: 'alert', icon: Lightbulb, label: 'Tip Box', description: 'Add a callout or tip' },
            { type: 'faqSection', icon: HelpCircle, label: 'FAQ', description: 'Add frequently asked questions' },
            { type: 'simpleTable', icon: Table2, label: 'Table', description: 'Insert a table' },
            { type: 'relatedContent', icon: LayoutGrid, label: 'Related Content', description: 'Show related items' },
            { type: 'divider', icon: Minus, label: 'Divider', description: 'Add a horizontal line' },
        ],
    },
    {
        id: 'recipe',
        label: 'Recipe',
        blocks: [
            { type: 'mainRecipe', icon: Utensils, label: 'Recipe Details', description: 'The main recipe editor for this post' },
            { type: 'recipeEmbed', icon: FileText, label: 'Embed Recipe', description: 'Link to another recipe' },
        ],
    },
];

/**
 * Block Inserter Panel
 */
export default function BlockInserter({
    isOpen = true,
    onClose,
    onInsertBlock,
    contentType = 'article', // article, recipe, roundup
    className,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState(
        blockCategories.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
    );

    // Filter blocks based on content type
    const filteredCategories = useMemo(() => {
        return blockCategories
            .filter(cat => {
                // Hide recipe category for non-recipe content
                if (cat.id === 'recipe' && contentType !== 'recipe') return false;
                return true;
            })
            .map(cat => ({
                ...cat,
                blocks: cat.blocks.filter(block => {
                    // Filter by search query
                    if (searchQuery) {
                        const query = searchQuery.toLowerCase();
                        return (
                            block.label.toLowerCase().includes(query) ||
                            block.description.toLowerCase().includes(query)
                        );
                    }
                    return true;
                }),
            }))
            .filter(cat => cat.blocks.length > 0);
    }, [searchQuery, contentType]);

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId],
        }));
    };

    const handleBlockClick = (blockType) => {
        onInsertBlock?.(blockType);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
                'wp-block-inserter',
                'w-[280px] h-full',
                'bg-[var(--wp-inserter-bg)] border-r border-[var(--wp-inserter-border)]',
                'flex flex-col',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-semibold">Blocks</h3>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className={cn(
                            'flex items-center justify-center',
                            'w-7 h-7 rounded-sm',
                            'text-muted-foreground hover:text-foreground',
                            'hover:bg-muted'
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Search */}
            <div className="px-3 py-2 border-b border-border">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search blocks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-sm"
                    />
                </div>
            </div>

            {/* Block List */}
            <ScrollArea className="flex-1">
                <div className="p-2 space-y-1">
                    {filteredCategories.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                            No blocks found
                        </div>
                    ) : (
                        filteredCategories.map((category) => (
                            <div key={category.id} className="mb-2">
                                {/* Category header */}
                                <button
                                    type="button"
                                    onClick={() => toggleCategory(category.id)}
                                    className={cn(
                                        'flex items-center justify-between w-full',
                                        'px-2 py-1.5 text-xs font-semibold uppercase tracking-wide',
                                        'text-muted-foreground hover:text-foreground',
                                        'rounded-sm hover:bg-muted/50'
                                    )}
                                >
                                    {category.label}
                                    <ChevronDown
                                        className={cn(
                                            'w-3.5 h-3.5 transition-transform',
                                            expandedCategories[category.id] && 'rotate-180'
                                        )}
                                    />
                                </button>

                                {/* Blocks */}
                                <AnimatePresence>
                                    {expandedCategories[category.id] && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.15 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="py-1 space-y-0.5">
                                                {category.blocks.map((block) => (
                                                    <Tooltip key={block.type}>
                                                        <TooltipTrigger asChild>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleBlockClick(block.type)}
                                                                className={cn(
                                                                    'flex items-center gap-3 w-full',
                                                                    'px-2 py-2 rounded-md',
                                                                    'text-left text-sm',
                                                                    'hover:bg-[var(--wp-inserter-item-hover)]',
                                                                    'transition-colors'
                                                                )}
                                                            >
                                                                <div className={cn(
                                                                    'flex items-center justify-center',
                                                                    'w-9 h-9 rounded-md',
                                                                    'bg-muted/50 text-muted-foreground'
                                                                )}>
                                                                    <block.icon className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-medium truncate">
                                                                        {block.label}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="right" className="text-xs">
                                                            {block.description}
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>
        </motion.div>
    );
}
