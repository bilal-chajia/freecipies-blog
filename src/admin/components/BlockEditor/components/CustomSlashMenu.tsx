import React from 'react';
import type { ReactNode } from 'react';
import { X, Type } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEditorProseMirrorView } from '../utils/editorView';

type SlashMenuItem = {
    title: string;
    subtext?: string;
    group?: string;
    icon?: ReactNode;
    actualIndex?: number;
    [key: string]: unknown;
};

type CustomSlashMenuProps = {
    items?: SlashMenuItem[];
    selectedIndex?: number;
    onItemClick?: (item: SlashMenuItem) => void;
    editor?: unknown;
};

const shortcutMapping: Record<string, string> = {
    'Image': 'Img',
    'Video': 'Vid',
    'Before / After': 'B/A',
    'Alert Box': 'Box',
    'FAQ Section': 'FAQ',
    'Related Content': 'Link',
    'Table': 'Tbl',
    'Divider': 'Div',
    'Roundup List': 'Rnd',
    'Recipe Details': 'Rec',
    'Text': 'T',
    'Heading 1': 'H1',
    'Heading 2': 'H2',
    'Heading 3': 'H3',
    'Heading 4': 'H4',
    'Heading 5': 'H5',
    'Heading 6': 'H6',
    'Bullet List': 'List',
    'Numbered List': 'Num',
    'Quote': 'Q',
};

function HighlightMatch({ text, query }: { text: string; query: string }) {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
        <span>
            {parts.map((part, index) => 
                part.toLowerCase() === query.toLowerCase()
                    ? <span key={index} className="bg-primary/20 text-primary font-semibold px-0.5 rounded">{part}</span>
                    : <span key={index}>{part}</span>
            )}
        </span>
    );
}

export default function CustomSlashMenu({ items, selectedIndex, onItemClick, editor }: CustomSlashMenuProps) {
    const menuItems = items ?? [];
    const selectedRef = React.useRef<HTMLButtonElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Scroll active item into view
    React.useEffect(() => {
        if (selectedRef.current) {
            selectedRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
            });
        }
    }, [selectedIndex]);

    // Extract search query
    const query = React.useMemo(() => {
        return getEditorProseMirrorView<{ state?: { selection?: { $from?: { parent?: { textContent?: string } } } } }>(editor)?.state?.selection?.$from?.parent?.textContent?.split('/').pop() || '';
    }, [editor, menuItems]);

    const groupedItems = React.useMemo(() => {
        const groups: Record<string, Array<SlashMenuItem & { actualIndex: number }>> = {};
        menuItems.forEach((item, index) => {
            const groupName = item.group || 'General';
            if (!groups[groupName]) groups[groupName] = [];
            groups[groupName].push({ ...item, actualIndex: index });
        });
        return groups;
    }, [menuItems]);

    return (
        <div 
            ref={containerRef}
            className="z-[9999] w-[330px] overflow-hidden rounded-xl border border-border/80 bg-background/95 backdrop-blur-md p-0 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/40 select-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Blocks
                </span>
                <span className="text-[9px] text-muted-foreground/80 bg-background border border-border px-1.5 py-0.5 rounded shadow-sm font-semibold">
                    Esc to close
                </span>
            </div>

            {/* List area */}
            <div className="max-h-[380px] overflow-y-auto overflow-x-hidden p-2 space-y-4 scrollbar-thin">
                {menuItems.length > 0 ? (
                    Object.entries(groupedItems).map(([group, groupItems]) => (
                        <div key={group} className="space-y-1">
                            {/* Group Title */}
                            <div className="px-2 pb-1 text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                                {group}
                            </div>
                            
                            {/* Group Items */}
                            <div className="flex flex-col gap-0.5">
                                {groupItems.map((item) => {
                                    const isSelected = item.actualIndex === selectedIndex;
                                    const shortcut = shortcutMapping[item.title];
                                    return (
                                        <button
                                            key={item.title + item.actualIndex}
                                            ref={isSelected ? selectedRef : null}
                                            className={cn(
                                                'group flex items-center gap-3 w-full text-left px-2.5 py-2 rounded-lg transition-all duration-100 relative border border-transparent cursor-pointer',
                                                isSelected
                                                    ? 'bg-primary/10 border-primary/20 shadow-[0_2px_8px_rgba(var(--primary-rgb),0.04)]'
                                                    : 'hover:bg-muted/80'
                                            )}
                                            onClick={() => onItemClick?.(item)}
                                        >
                                            {/* Icon */}
                                            <div className={cn(
                                                'flex-shrink-0 size-8 rounded-lg flex items-center justify-center transition-all duration-100',
                                                isSelected 
                                                    ? 'bg-primary text-primary-foreground' 
                                                    : 'bg-muted text-muted-foreground group-hover:bg-muted-foreground/10'
                                            )}>
                                                {item.icon || <Type className="size-4" />}
                                            </div>

                                            {/* Labels */}
                                            <div className="flex-1 min-w-0 pr-1 select-none">
                                                <div className={cn(
                                                    'text-xs font-semibold leading-none truncate mb-1',
                                                    isSelected ? 'text-primary' : 'text-foreground'
                                                )}>
                                                    <HighlightMatch text={item.title} query={query} />
                                                </div>
                                                <div className="text-[10px] text-muted-foreground/60 leading-normal truncate">
                                                    {item.subtext || 'Insert block'}
                                                </div>
                                            </div>

                                            {/* Keyboard shortcut or active indicator */}
                                            {shortcut ? (
                                                <span className={cn(
                                                    "text-[9px] border px-1.5 py-0.5 rounded font-mono select-none ml-auto transition-colors",
                                                    isSelected 
                                                        ? "text-primary/70 border-primary/20 bg-background" 
                                                        : "text-muted-foreground/60 border-border/40 bg-muted/30 group-hover:bg-background"
                                                )}>
                                                    {shortcut}
                                                </span>
                                            ) : isSelected && (
                                                <div className="size-1.5 rounded-full bg-primary animate-pulse ml-auto" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="px-4 py-8 text-center select-none">
                        <p className="text-xs font-medium text-muted-foreground italic">
                            No blocks found matching "{query}"
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
