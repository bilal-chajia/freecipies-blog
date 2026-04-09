import React from 'react';
import { List, Link2, ExternalLink, Hash, ArrowRight } from 'lucide-react';
import { Button } from "@/ui/button";
import { Badge } from "@/ui/badge";
import { ScrollArea } from "@/ui/scroll-area";
import { SidebarSection } from "./SettingsSidebar";

/**
 * CuratedListSettings
 * 
 * Sidebar component that displays an overview of all Roundup Items
 * currently in the editor.
 */
export default function CuratedListSettings({ 
    roundupJson, 
    onSelectBlock,
    editor 
}) {
    const data = typeof roundupJson === 'string' 
        ? JSON.parse(roundupJson || '{"items":[]}') 
        : (roundupJson || { items: [] });
        
    const items = data.items || [];

    const handleJumpToBlock = (articleId, externalUrl) => {
        if (!editor) return;
        
        // Find the block corresponding to this item
        const blocks = editor.document;
        const targetBlock = blocks.find(b => 
            b.type === 'roundupItem' && 
            (b.props.articleId === articleId || b.props.externalUrl === externalUrl)
        );

        if (targetBlock) {
            onSelectBlock?.(targetBlock.id);
            // Scroll to block
            const element = document.querySelector(`[data-id="${targetBlock.id}"]`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    return (
        <div className="flex flex-col h-full">
            <SidebarSection title="Curated List Overview" defaultOpen={true}>
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                        Summary of all items added to this roundup. Click an item to jump to its editor block.
                    </p>

                    {items.length === 0 ? (
                        <div className="py-8 text-center border border-dashed rounded-lg bg-muted/20">
                            <List className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">No items added yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {items.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleJumpToBlock(item.article_id, item.external_url)}
                                    className="w-full flex items-start gap-3 p-2 rounded-md hover:bg-muted/80 transition-colors text-left group border border-transparent hover:border-border"
                                >
                                    <div className="h-5 w-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                                        {item.position || idx + 1}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                                            {item.title || "Untitled Item"}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            {item.article_id ? (
                                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 gap-1 font-normal uppercase tracking-wider">
                                                    <Hash className="h-2 w-2" /> ID: {item.article_id}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 gap-1 font-normal uppercase tracking-wider">
                                                    <ExternalLink className="h-2 w-2" /> External
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </SidebarSection>
            
            <SidebarSection title="List Stats">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 p-3 rounded-lg border text-center">
                        <div className="text-2xl font-bold">{items.length}</div>
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold">Total Items</div>
                    </div>
                    <div className="bg-muted/30 p-3 rounded-lg border text-center">
                        <div className="text-2xl font-bold">
                            {items.filter(i => i.article_id).length}
                        </div>
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold">Internal</div>
                    </div>
                </div>
            </SidebarSection>
        </div>
    );
}
