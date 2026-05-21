import React from 'react';
import type { ReactNode } from 'react';
import { X, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    editor?: {
        _tiptapEditor?: {
            state?: {
                selection?: {
                    $from?: {
                        parent?: {
                            textContent?: string;
                        };
                    };
                };
            };
        };
    };
};

export default function CustomSlashMenu({ items, selectedIndex, onItemClick, editor }: CustomSlashMenuProps) {
    const menuItems = items ?? [];
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
        <div className="z-[9999] min-w-[720px] overflow-hidden rounded-2xl border border-border/60 bg-popover/95 backdrop-blur-xl p-0 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">
                    Insert a block
                </span>
                <span className="text-[10px] text-muted-foreground bg-background border border-border px-1.5 py-0.5 rounded shadow-sm">
                    Esc to close
                </span>
            </div>

            <div className="max-h-[450px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                {menuItems.length > 0 ? (
                    <div className="p-2 space-y-4">
                        {Object.entries(groupedItems).map(([group, groupItems]) => (
                            <div key={group} className="space-y-1.5 px-1">
                                <div className="px-2 pb-1 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-tighter">
                                    {group}
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {groupItems.map((item) => {
                                        const isSelected = item.actualIndex === selectedIndex;
                                        return (
                                            <button
                                                key={item.title + item.actualIndex}
                                                className={cn(
                                                    'group flex items-start gap-3 w-full text-left p-2.5 rounded-xl transition-all duration-150 relative',
                                                    isSelected
                                                        ? 'bg-primary/5 shadow-[0_4px_12px_rgba(var(--primary-rgb),0.1)] ring-1 ring-primary/20'
                                                        : 'hover:bg-muted active:scale-[0.98]'
                                                )}
                                                onClick={() => onItemClick?.(item)}
                                            >
                                                <div className={cn(
                                                    'flex-shrink-0 size-9 rounded-lg flex items-center justify-center transition-colors',
                                                    isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground group-hover:bg-muted/80'
                                                )}>
                                                    {item.icon || <Type className="size-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-1">
                                                    <div className={cn(
                                                        'text-sm font-medium leading-none truncate mb-1',
                                                        isSelected ? 'text-primary' : 'text-foreground'
                                                    )}>
                                                        {item.title}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground/70 leading-tight line-clamp-1">
                                                        {item.subtext || 'Insert this block'}
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute right-2 top-2">
                                                        <div className="size-1.5 rounded-full bg-primary animate-pulse" />
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="px-4 py-8 text-center">
                        <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                            <X className="size-6 text-muted-foreground/30" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground italic">
                            No blocks found for "{editor?._tiptapEditor?.state?.selection?.$from?.parent?.textContent?.split('/').pop() || ''}"
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
