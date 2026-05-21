import React, { useState, useEffect, useCallback } from 'react';
import { Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/ui/popover";
import { articlesAPI } from '../services/api';
import { extractImage } from '@shared/utils/hydration';
import { toast } from 'sonner';

type ArticleSearchResult = {
    id: number | string;
    headline: string;
    type?: string | null;
    imagesJson?: string | null;
};

type ArticleSearchAutocompleteProps = {
    onSelect: (article: ArticleSearchResult) => void;
    placeholder?: string;
    className?: string;
};

type ArticlesListPayload = ArticleSearchResult[] | {
    items?: ArticleSearchResult[];
};

export function ArticleSearchAutocomplete({ onSelect, placeholder = "Search recipes...", className }: ArticleSearchAutocompleteProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<ArticleSearchResult[]>([]);

    const fetchResults = useCallback(async (searchQuery: string) => {
        if (!searchQuery || searchQuery.length < 2) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            const response = await articlesAPI.getAll({ 
                search: searchQuery,
                limit: 10,
                status: 'all' 
            });
            
            if (response.data?.success) {
                // Ensure we have an array of items
                const payload = response.data.data as ArticlesListPayload | undefined;
                const items = Array.isArray(payload)
                    ? payload
                    : (payload?.items || []);
                setResults(items);
            }
        } catch (error) {
            toast.error('Failed to fetch articles');
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (query) fetchResults(query);
            else setResults([]);
        }, 300);

        return () => clearTimeout(timer);
    }, [query, fetchResults]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal", className)}
                >
                    <div className="flex items-center gap-2 overflow-hidden">
                        <Search className="h-4 w-4 shrink-0 opacity-50" />
                        <span className="truncate">{placeholder}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput 
                        placeholder="Type to search..." 
                        value={query}
                        onValueChange={setQuery}
                    />
                    <CommandList>
                        {loading && (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                        )}
                        {!loading && results.length === 0 && query.length >= 2 && (
                            <CommandEmpty>No recipes found.</CommandEmpty>
                        )}
                        {!loading && query.length < 2 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Type at least 2 characters to search...
                            </div>
                        )}
                        <CommandGroup>
                            {results.map((article) => {
                                const thumbnailInfo = extractImage(article.imagesJson, 'thumbnail');
                                return (
                                    <CommandItem
                                        key={article.id}
                                        value={article.id.toString()}
                                        onSelect={() => {
                                            onSelect(article);
                                            setOpen(false);
                                            setQuery("");
                                        }}
                                        className="flex items-center gap-3 p-2 cursor-pointer"
                                    >
                                        <div className="h-10 w-10 shrink-0 rounded bg-muted overflow-hidden">
                                            {thumbnailInfo.imageUrl ? (
                                                <img 
                                                    src={thumbnailInfo.imageUrl} 
                                                    alt="" 
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="h-full w-full flex items-center justify-center text-[10px] text-muted-foreground">
                                                    No Img
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-medium truncate">{article.headline}</span>
                                            <span className="text-xs text-muted-foreground truncate italic">
                                                ID: {article.id} • {article.type || 'article'}
                                            </span>
                                        </div>
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4 opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
