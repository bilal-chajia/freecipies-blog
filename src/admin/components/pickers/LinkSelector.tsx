/**
 * LinkSelector - Multi-type link picker with autocomplete
 * 
 * Features:
 * - Type selection: Custom URL, Article, Category, Tag
 * - Auto-detection of link type from existing URL
 * - Debounced search with API integration
 * - Auto-fill label from selected item
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Link2, FolderOpen, LayoutGrid, Star } from 'lucide-react';
import { Input } from '@/ui/input';
import { toast } from 'sonner';
import api from '@admin/services/api-client';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select';

const LINK_TYPES = [
    { value: 'custom', label: 'Custom URL', icon: Link2 },
    { value: 'article', label: 'Article', icon: FolderOpen },
    { value: 'category', label: 'Category', icon: LayoutGrid },
    { value: 'tag', label: 'Tag', icon: Star },
] as const;

interface LinkSelectorItem {
    id?: number | string;
    slug?: string;
    title?: string;
    name?: string;
    label?: string;
    url?: string;
}

interface LinkSelectorProps {
    url: string;
    onUrlChange: (url: string) => void;
    onLabelChange?: (label: string) => void;
    currentLabel?: string;
}

interface LinkSelectorApiResponse {
    data?: LinkSelectorItem[];
    items?: LinkSelectorItem[];
}

const LinkSelector: React.FC<LinkSelectorProps> = ({ url, onUrlChange, onLabelChange, currentLabel }) => {
    const [linkType, setLinkType] = useState<string>('custom');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<LinkSelectorItem[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [showDropdown, setShowDropdown] = useState<boolean>(false);

    // Detect link type from URL
    useEffect(() => {
        if (url?.startsWith('/recipes/') || url?.startsWith('/articles/')) {
            setLinkType('article');
        } else if (url?.startsWith('/categories/')) {
            setLinkType('category');
        } else if (url?.startsWith('/tags/')) {
            setLinkType('tag');
        } else {
            setLinkType('custom');
        }
    }, [url]);

    // Fetch search results based on type
    const handleSearch = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            let endpoint = '';
            let params: Record<string, unknown> = {};
            switch (linkType) {
                case 'article':
                    endpoint = '/articles';
                    params = { search: query, limit: 10 };
                    break;
                case 'category':
                    endpoint = '/categories';
                    params = { search: query, limit: 10 };
                    break;
                case 'tag':
                    endpoint = '/tags';
                    params = { search: query, limit: 10 };
                    break;
                default:
                    setSearchResults([]);
                    setIsSearching(false);
                    return;
            }

            const response = await api.get(endpoint, { params });
            const data = response.data as LinkSelectorApiResponse | LinkSelectorItem[];

            // Normalize results
            const items = Array.isArray(data) ? data : (data.data || data.items || []);
            setSearchResults(items.slice(0, 8));
        } catch (error) {
            toast.error('Search failed');
            setSearchResults([]);
        }
        setIsSearching(false);
    }, [linkType]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery && linkType !== 'custom') {
                handleSearch(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, linkType, handleSearch]);

    // Handle selection from dropdown
    const handleSelect = (item: LinkSelectorItem) => {
        let newUrl = '';
        const newLabel = item.title || item.name || item.label || '';

        switch (linkType) {
            case 'article':
                newUrl = item.slug ? `/recipes/${item.slug}` : '';
                break;
            case 'category':
                newUrl = item.slug ? `/categories/${item.slug}` : '';
                break;
            case 'tag':
                newUrl = item.slug ? `/tags/${item.slug}` : '';
                break;
            default:
                newUrl = item.url || '#';
        }

        onUrlChange(newUrl);
        if (onLabelChange && (!currentLabel || currentLabel === 'New Link')) {
            onLabelChange(newLabel);
        }
        setShowDropdown(false);
        setSearchQuery('');
    };

    const handleTypeChange = (newType: string) => {
        setLinkType(newType);
        setSearchResults([]);
        setSearchQuery('');
        if (newType === 'custom') {
            setShowDropdown(false);
        }
    };

    return (
        <div className="relative flex gap-1.5">
            {/* Type Selector */}
            <Select value={linkType} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-24 h-7 text-xs rounded-sm border-input focus:ring-0 focus:border-ring">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {LINK_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-1.5">
                                <type.icon className="size-3" />
                                <span>{type.label}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* URL Input or Search */}
            <div className="relative flex-1">
                {linkType === 'custom' ? (
                    <Input
                        value={url}
                        onChange={(e) => onUrlChange(e.target.value)}
                        className="h-7 text-sm font-mono"
                        placeholder="/url or https://..."
                    />
                ) : (
                    <>
                        <Input
                            value={searchQuery || url}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            className="h-7 text-sm rounded-sm border-input focus:border-ring"
                            placeholder={`Search ${linkType}...`}
                        />

                        {/* Search Results Dropdown */}
                        {showDropdown && (searchResults.length > 0 || isSearching) && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-48 overflow-auto">
                                {isSearching ? (
                                    <div className="p-2 text-center text-sm text-muted-foreground">
                                        Searching...
                                    </div>
                                ) : (
                                    searchResults.map((item, index) => (
                                        <button
                                            key={item.id || item.slug || index}
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                            onClick={() => handleSelect(item)}
                                        >
                                            <span className="truncate">
                                                {item.title || item.name || item.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                /{item.slug}
                                            </span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default LinkSelector;
