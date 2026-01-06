/**
 * ArticlePicker - Search and select articles for featured content
 * 
 * Features:
 * - Debounced search with API integration
 * - Article preview with image, title, and slug
 * - Selection state management
 */

import React, { useState, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';

const ArticlePicker = ({ value, onChange }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedArticle, setSelectedArticle] = useState(null);

    // Load selected article info
    useEffect(() => {
        if (value?.articleId && !selectedArticle) {
            fetch(`/api/articles?limit=1&id=${value.articleId}`)
                .then(res => res.json())
                .then(data => {
                    const article = data.data?.[0] || data[0];
                    if (article) {
                        setSelectedArticle(article);
                    }
                })
                .catch(() => { });
        }
    }, [value?.articleId]);

    // Search articles
    const handleSearch = useCallback(async (query) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const response = await fetch(`/api/articles?search=${encodeURIComponent(query)}&limit=8`);
            const data = await response.json();
            const items = Array.isArray(data) ? data : (data.data || []);
            setSearchResults(items);
        } catch (error) {
            console.error('Search failed:', error);
            setSearchResults([]);
        }
        setIsSearching(false);
    }, []);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) {
                handleSearch(searchQuery);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    // Handle article selection
    const handleSelect = (article) => {
        setSelectedArticle(article);
        onChange({
            articleId: article.id,
            title: article.title,
            url: `/recipes/${article.slug}`,
            image: article.featured_image || article.image || '',
            description: article.excerpt || article.meta_description || '',
        });
        setShowDropdown(false);
        setSearchQuery('');
    };

    const handleClear = () => {
        setSelectedArticle(null);
        onChange(null);
    };

    return (
        <div className="space-y-3">
            {/* Selected Article Preview */}
            {selectedArticle ? (
                <div className="flex items-start gap-3 p-3 rounded-[2px] border border-[#e0e0e0] bg-[#f8f9fa]">
                    {selectedArticle.featured_image && (
                        <img
                            src={selectedArticle.featured_image}
                            alt=""
                            className="w-16 h-12 object-cover rounded-[2px]"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[#1e1e1e]">{selectedArticle.title}</p>
                        <p className="text-xs text-[#757575] font-mono">/recipes/{selectedArticle.slug}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0 text-[#757575] hover:text-red-600"
                        onClick={handleClear}
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                /* Search Input */
                <div className="relative">
                    <Input
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search articles..."
                        className="h-[30px] text-sm border-[#757575] rounded-[2px] focus:border-[#007cba]"
                    />

                    {/* Search Results Dropdown */}
                    {showDropdown && (searchResults.length > 0 || isSearching) && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
                            {isSearching ? (
                                <div className="p-3 text-center text-sm text-muted-foreground">
                                    Searching...
                                </div>
                            ) : (
                                searchResults.map((article) => (
                                    <button
                                        key={article.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-3"
                                        onClick={() => handleSelect(article)}
                                    >
                                        {article.featured_image && (
                                            <img
                                                src={article.featured_image}
                                                alt=""
                                                className="w-10 h-8 object-cover rounded"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{article.title}</p>
                                            <p className="text-xs text-muted-foreground truncate">{article.slug}</p>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {!selectedArticle && (
                <p className="text-[11px] text-muted-foreground/70">
                    Start typing to search for articles
                </p>
            )}
        </div>
    );
};

export default ArticlePicker;
