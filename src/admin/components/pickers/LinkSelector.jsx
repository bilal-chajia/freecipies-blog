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
import { Input } from '@/ui/input.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select.jsx';

const LINK_TYPES = [
    { value: 'custom', label: 'Custom URL', icon: Link2 },
    { value: 'article', label: 'Article', icon: FolderOpen },
    { value: 'category', label: 'Category', icon: LayoutGrid },
    { value: 'tag', label: 'Tag', icon: Star },
];

const LinkSelector = ({ url, onUrlChange, onLabelChange, currentLabel }) => {
    const [linkType, setLinkType] = useState('custom');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);

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
    }, []);

    // Fetch search results based on type
    const handleSearch = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        try {
            let endpoint = '';
            switch (linkType) {
                case 'article':
                    endpoint = `/api/articles?search=${encodeURIComponent(query)}&limit=10`;
                    break;
                case 'category':
                    endpoint = `/api/categories?search=${encodeURIComponent(query)}&limit=10`;
                    break;
                case 'tag':
                    endpoint = `/api/tags?search=${encodeURIComponent(query)}&limit=10`;
                    break;
                default:
                    setSearchResults([]);
                    setIsSearching(false);
                    return;
            }

            const response = await fetch(endpoint);
            const data = await response.json();

            // Normalize results
            const items = Array.isArray(data) ? data : (data.data || data.items || []);
            setSearchResults(items.slice(0, 8));
        } catch (error) {
            console.error('Search failed:', error);
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
    const handleSelect = (item) => {
        let newUrl = '';
        let newLabel = item.title || item.name || item.label || '';

        switch (linkType) {
            case 'article':
                newUrl = `/recipes/${item.slug}`;
                break;
            case 'category':
                newUrl = `/categories/${item.slug}`;
                break;
            case 'tag':
                newUrl = `/tags/${item.slug}`;
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

    const handleTypeChange = (newType) => {
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
                <SelectTrigger className="w-[100px] h-[30px] text-xs rounded-[2px] border-[#757575] focus:ring-0 focus:border-[#007cba]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {LINK_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-1.5">
                                <type.icon className="w-3 h-3" />
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
                            className="h-[30px] text-sm rounded-[2px] border-[#757575] focus:border-[#007cba]"
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
                                    searchResults.map((item) => (
                                        <button
                                            key={item.id || item.slug}
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
