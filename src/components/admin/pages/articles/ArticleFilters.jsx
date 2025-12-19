import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, X, Calendar, Plus } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Badge } from '@/ui/badge.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select.jsx';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu.jsx';

const ArticleFilters = ({
    localFilters,
    onFilterChange,
    showFilters,
    setShowFilters,
    hasActiveFilters,
    onClearFilters,
    categories,
    authors,
    tags
}) => {
    return (
        <div className="space-y-4">
            {/* Search and Filter Toggle */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search articles by title, content, or author..."
                            value={localFilters.search}
                            onChange={(e) => onFilterChange('search', e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                >
                    <Filter className="w-4 h-4" />
                    Filters
                    {hasActiveFilters && (
                        <Badge variant="secondary" className="ml-1 px-1 min-w-[20px] h-5 text-xs">
                            {Object.values(localFilters).filter(v => v !== '' && v !== 'all' && (!Array.isArray(v) || v.length > 0)).length}
                        </Badge>
                    )}
                </Button>
                {hasActiveFilters && (
                    <Button variant="ghost" onClick={onClearFilters} className="gap-2">
                        <X className="w-4 h-4" />
                        Clear
                    </Button>
                )}
                <Link to="/articles/new">
                    <Button className="gap-2">
                        <Plus className="w-4 h-4" />
                        New Article
                    </Button>
                </Link>
            </div>

            {/* Advanced Filters */}
            {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
                    {/* Type Filter */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Type</label>
                        <Select
                            value={localFilters.type}
                            onValueChange={(value) => onFilterChange('type', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="article">Articles</SelectItem>
                                <SelectItem value="recipe">Recipes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category Filter */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select
                            value={localFilters.category}
                            onValueChange={(value) => onFilterChange('category', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.slug} value={cat.slug}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Author Filter */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Author</label>
                        <Select
                            value={localFilters.author}
                            onValueChange={(value) => onFilterChange('author', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Authors" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Authors</SelectItem>
                                {authors.map((author) => (
                                    <SelectItem key={author.slug} value={author.slug}>
                                        {author.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Status</label>
                        <Select
                            value={localFilters.status}
                            onValueChange={(value) => onFilterChange('status', value)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="online">Online</SelectItem>
                                <SelectItem value="offline">Offline</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Range Filters */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Date From
                        </label>
                        <Input
                            type="date"
                            value={localFilters.dateFrom}
                            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Date To
                        </label>
                        <Input
                            type="date"
                            value={localFilters.dateTo}
                            onChange={(e) => onFilterChange('dateTo', e.target.value)}
                        />
                    </div>

                    {/* Tags Filter - Multi-select */}
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Tags</label>
                        <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px] bg-background">
                            {localFilters.tags.map((tagId) => {
                                const tag = tags.find(t => t.id === tagId);
                                return (
                                    <Badge key={tagId} variant="secondary" className="gap-1">
                                        {tag?.label || tagId}
                                        <X
                                            className="w-3 h-3 cursor-pointer"
                                            onClick={() => {
                                                const newTags = localFilters.tags.filter(t => t !== tagId);
                                                onFilterChange('tags', newTags);
                                            }}
                                        />
                                    </Badge>
                                );
                            })}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                        + Add Tag
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-48">
                                    {tags
                                        .filter(tag => !localFilters.tags.includes(tag.id))
                                        .map((tag) => (
                                            <DropdownMenuItem
                                                key={tag.id}
                                                onClick={() => {
                                                    const newTags = [...localFilters.tags, tag.id];
                                                    onFilterChange('tags', newTags);
                                                }}
                                            >
                                                {tag.label}
                                            </DropdownMenuItem>
                                        ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArticleFilters;
