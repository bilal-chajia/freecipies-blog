import { MoreVertical, Copy, Plus, Trash2 } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import type { StructureItem } from '../../store/blockEditorStore';

export type BlockAction = 'duplicate' | 'add-before' | 'add-after' | 'delete';

export type ConvertBlockOptions = {
    type: string;
    level?: number;
};

interface StructureActionsMenuProps {
    item: StructureItem;
    showConvertOptions: boolean;
    onConvertBlock?: (blockId: string, options: ConvertBlockOptions) => void;
    onBlockAction?: (action: BlockAction, blockId: string) => void;
}

export function StructureActionsMenu({
    item,
    showConvertOptions,
    onConvertBlock,
    onBlockAction,
}: StructureActionsMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-all mr-1 cursor-pointer"
                    onClick={(event) => event.stopPropagation()}
                    title="Block actions"
                >
                    <MoreVertical className="w-3 h-3" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => onBlockAction?.('duplicate', item.id)}
                >
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                </DropdownMenuItem>
                {showConvertOptions && (
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
    );
}
