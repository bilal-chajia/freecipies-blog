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
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { toast } from 'sonner';
import api from '@admin/services/api-client';

/**
 * Strip absolute dev URLs to relative paths.
 * Prevents storing http://localhost:XXXX or http://127.0.0.1:XXXX in the DB.
 */
const toRelativeUrl = (url: string | null | undefined): string => {
    if (!url || typeof url !== 'string') return '';
    // Strip absolute localhost / 127.0.0.1 origins
    return url.replace(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/, '');
};

interface ArticleApiItem {
    id: number | string;
    title: string;
    slug: string;
    imageUrl?: string;
    featured_image?: string;
    image?: string;
    excerpt?: string;
    metaDescription?: string;
}

export interface ArticlePickerValue {
    articleId: number | string;
    title: string;
    url: string;
    image: string;
    description: string;
}

export interface ArticlePickerProps {
    value: ArticlePickerValue | null | undefined;
    onChange: (value: ArticlePickerValue | null) => void;
}

interface ArticlesApiResponse {
    data?: ArticleApiItem[];
}

const ArticlePicker: React.FC<ArticlePickerProps> = ({ value, onChange }) => {
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [searchResults, setSearchResults] = useState<ArticleApiItem[]>([]);
    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [showDropdown, setShowDropdown] = useState<boolean>(false);
    const [selectedArticle, setSelectedArticle] = useState<ArticleApiItem | null>(null);

    // Load selected article info
    useEffect(() => {
        if (value?.articleId && !selectedArticle) {
            api.get('/articles', { params: { limit: 1, id: value.articleId } })
                .then(res => res.data as ArticleApiItem[] | ArticlesApiResponse)
                .then(data => {
                    const items = Array.isArray(data) ? data : (data.data || []);
                    const article = items[0];
                    if (article) {
                        setSelectedArticle(article);
                    }
                })
                .catch(() => { });
        }
    }, [value?.articleId, selectedArticle]);

    // Search articles
    const handleSearch = useCallback(async (query: string) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const response = await api.get('/articles', { params: { search: query, limit: 8 } });
            const data = response.data as ArticleApiItem[] | ArticlesApiResponse;
            const items = Array.isArray(data) ? data : (data.data || []);
            setSearchResults(items);
        } catch (error) {
            toast.error('Search failed');
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
    const handleSelect = (article: ArticleApiItem) => {
        setSelectedArticle(article);
        // Use imageUrl (current API field) with fallbacks, and ensure relative paths
        const rawImage = article.imageUrl || article.featured_image || article.image || '';
        onChange({
            articleId: article.id,
            title: article.title,
            url: `/recipes/${article.slug}`,
            image: toRelativeUrl(rawImage),
            description: article.excerpt || article.metaDescription || '',
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
                <div className="flex items-start gap-3 p-3 rounded-sm border border-border bg-muted/50">
                    {selectedArticle.featured_image && (
                        <img
                            src={selectedArticle.featured_image}
                            alt=""
                            width={64}
                            height={48}
                            loading="lazy"
                            className="w-16 h-12 object-cover rounded-sm"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">{selectedArticle.title}</p>
                        <p className="text-xs text-muted-foreground font-mono">/recipes/{selectedArticle.slug}</p>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={handleClear}
                    >
                        <X className="size-4" />
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
                        className="h-8 text-sm border-input rounded-sm focus:border-ring"
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
                                                width={40}
                                                height={32}
                                                loading="lazy"
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
                <p className="text-xs text-muted-foreground/70">
                    Start typing to search for articles
                </p>
            )}
        </div>
    );
};

export default ArticlePicker;
