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
    GripVertical,
    MoreVertical,
    Copy,
    Trash2,
    Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/scroll-area';
import { Input } from '@/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';

const escapeHtml = (value) => (
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
);

const sanitizeHref = (href) => {
    if (!href) return '';
    if (href.startsWith('/') || href.startsWith('#')) return href;
    try {
        const url = new URL(href);
        if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
            return href;
        }
    } catch {
        return '';
    }
    return '';
};

const renderInlineStyles = (value) => (
    value
        .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
);

const renderInlineLabel = (text) => {
    const source = String(text || '');
    if (!source) return '';
    const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(source)) !== null) {
        if (match.index > lastIndex) {
            const chunk = escapeHtml(source.slice(lastIndex, match.index));
            result += renderInlineStyles(chunk);
        }
        const label = escapeHtml(match[1]);
        const safeHref = sanitizeHref(match[2] || '');
        const styledLabel = renderInlineStyles(label);
        if (safeHref) {
            result += `<a href="${safeHref}">${styledLabel}</a>`;
        } else {
            result += styledLabel;
        }
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < source.length) {
        const tail = escapeHtml(source.slice(lastIndex));
        result += renderInlineStyles(tail);
    }

    return result;
};

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
    onConvertBlock,
    contentType = 'article', // article, recipe, roundup
    structureItems = [],
    activeBlockId = null,
    onSelectBlock,
    onReorderBlock,
    onBlockAction,
    className,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [panelTab, setPanelTab] = useState('blocks');
    const [draggedId, setDraggedId] = useState(null);
    const [dropTarget, setDropTarget] = useState(null);
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

    const outlineItems = useMemo(
        () => structureItems.filter((item) => item.type === 'heading'),
        [structureItems]
    );

    const visibleStructureItems = panelTab === 'outline' ? outlineItems : structureItems;
    const draggedItem = draggedId ? structureItems.find((item) => item.id === draggedId) : null;

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ width: '270px' }}
            className={cn(
                'wp-block-inserter',
                'h-full min-h-0 overflow-hidden',
                'bg-[var(--wp-inserter-bg)] border-r border-[var(--wp-inserter-border)]',
                'flex flex-col',
                className
            )}
        >
            <div className="px-3 py-2 border-b border-border">
                <div className="structure-tabs justify-between w-full">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            className={cn('structure-tab', panelTab === 'blocks' && 'is-active')}
                            onClick={() => setPanelTab('blocks')}
                        >
                            Blocks
                        </button>
                        <button
                            type="button"
                            className={cn('structure-tab', panelTab === 'list' && 'is-active')}
                            onClick={() => setPanelTab('list')}
                        >
                            List View
                        </button>
                        <button
                            type="button"
                            className={cn('structure-tab', panelTab === 'outline' && 'is-active')}
                            onClick={() => setPanelTab('outline')}
                        >
                            Outline
                        </button>
                    </div>
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
            </div>

            {panelTab === 'blocks' && (
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
            )}

            <ScrollArea className="flex-1 min-h-0">
                {panelTab === 'blocks' ? (
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
                                                                    className={cn('structure-item', 'w-full')}
                                                                >
                                                                    <block.icon className="structure-item-icon" />
                                                                    <span className="structure-item-label">
                                                                        {block.label}
                                                                    </span>
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
                ) : (
                    <div className="structure-panel-list">
                        {visibleStructureItems.length === 0 ? (
                            <div className="structure-empty">No blocks yet.</div>
                        ) : (
                            visibleStructureItems.map((item) => {
                                const Icon = item.icon || FileText;
                                const isActive = activeBlockId === item.id;
                                const isDropTarget = dropTarget?.targetId === item.id;
                                const dropPosition = isDropTarget ? dropTarget.position : null;
                                const isOutline = panelTab === 'outline';
                                const headingDepth = Math.max(0, (item.level || 2) - 2);
                                const indentDepth = isOutline ? headingDepth : (item.depth || 0);
                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            'structure-item group',
                                            isActive && 'is-active',
                                            dropPosition === 'before' && 'border-t border-primary/60',
                                            dropPosition === 'after' && 'border-b border-primary/60'
                                        )}
                                        style={{ paddingLeft: `${12 + indentDepth * 14}px` }}
                                        onClick={() => onSelectBlock?.(item.id)}
                                        onDragOver={(event) => {
                                            if (!draggedItem || draggedItem.id === item.id) return;
                                            if (draggedItem.parentId !== item.parentId) return;
                                            event.preventDefault();
                                            const rect = event.currentTarget.getBoundingClientRect();
                                            const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
                                            setDropTarget({ targetId: item.id, position });
                                        }}
                                        onDragLeave={() => {
                                            if (dropTarget?.targetId === item.id) {
                                                setDropTarget(null);
                                            }
                                        }}
                                        onDrop={(event) => {
                                            event.preventDefault();
                                            if (!draggedItem || draggedItem.id === item.id) return;
                                            if (draggedItem.parentId !== item.parentId) return;
                                            onReorderBlock?.(draggedItem.id, item.id, dropTarget?.position || 'after');
                                            setDraggedId(null);
                                            setDropTarget(null);
                                        }}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <button
                                                type="button"
                                                draggable
                                                className="text-muted-foreground hover:text-foreground"
                                                onClick={(event) => event.stopPropagation()}
                                                onDragStart={(event) => {
                                                    event.dataTransfer.setData('text/plain', item.id);
                                                    event.dataTransfer.effectAllowed = 'move';
                                                    setDraggedId(item.id);
                                                }}
                                                onDragEnd={() => {
                                                    setDraggedId(null);
                                                    setDropTarget(null);
                                                }}
                                                title="Drag to reorder"
                                            >
                                                <GripVertical className="w-3.5 h-3.5" />
                                            </button>
                                            <Icon className="structure-item-icon" />
                                            <span
                                                className="structure-item-label"
                                                dangerouslySetInnerHTML={{ __html: renderInlineLabel(item.label) }}
                                            />
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button
                                                    type="button"
                                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                                                    onClick={(event) => event.stopPropagation()}
                                                    title="Block actions"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={() => onBlockAction?.('duplicate', item.id)}
                                                >
                                                    <Copy className="w-4 h-4 mr-2" />
                                                    Duplicate
                                                </DropdownMenuItem>
                                                {(item.type === 'heading' || item.type === 'paragraph') && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => onConvertBlock?.(item.id, { type: 'paragraph' })}
                                                        >
                                                            Paragraph
                                                        </DropdownMenuItem>
                                                        {[2, 3, 4, 5, 6].map((level) => (
                                                            <DropdownMenuItem
                                                                key={`heading-${item.id}-${level}`}
                                                                onClick={() => onConvertBlock?.(item.id, { type: 'heading', level })}
                                                            >
                                                                Heading {level}
                                                            </DropdownMenuItem>
                                                        ))}
                                                    </>
                                                )}
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => onBlockAction?.('add-before', item.id)}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add before
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => onBlockAction?.('add-after', item.id)}
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add after
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-destructive"
                                                    onClick={() => onBlockAction?.('delete', item.id)}
                                                >
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </ScrollArea>
        </motion.div>
    );
}
