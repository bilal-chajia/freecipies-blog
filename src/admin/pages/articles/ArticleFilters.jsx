import React from 'react';
import { Search, Filter, X, Calendar, ChevronDown } from 'lucide-react';
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
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/ui/popover.jsx';

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
    const activeFilterCount = Object.values(localFilters).filter(v => 
      v !== '' && v !== 'all' && (!Array.isArray(v) || v.length > 0)
    ).length;

    return (
        <div className="flex flex-col gap-4">
            {/* Primary Search & Main Controls */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[280px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-60" />
                    <Input
                        placeholder="Search for articles, authors, or content..."
                        value={localFilters.search}
                        onChange={(e) => onFilterChange('search', e.target.value)}
                        className="pl-10 h-11 bg-card border-none shadow-sm ring-1 ring-border/50 focus-visible:ring-primary/50 text-sm rounded-xl transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant={showFilters ? "secondary" : "outline"}
                        onClick={() => setShowFilters(!showFilters)}
                        className={`h-11 px-4 gap-2 rounded-xl transition-all ${showFilters ? 'bg-secondary' : 'bg-card border-none ring-1 ring-border/50 hover:bg-accent'}`}
                    >
                        <Filter className={`w-4 h-4 ${showFilters ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-sm font-medium">Filters</span>
                        {activeFilterCount > 0 && (
                            <div className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                                {activeFilterCount}
                            </div>
                        )}
                    </Button>

                    {hasActiveFilters && (
                        <Button 
                          variant="ghost" 
                          onClick={onClearFilters} 
                          className="h-11 px-4 rounded-xl text-muted-foreground hover:text-foreground hover:bg-transparent text-sm gap-2"
                        >
                            <X className="w-4 h-4" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Advanced Filters Panel */}
            {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-accent/30 rounded-2xl border border-dashed border-border/60 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Content Type</label>
                        <Select
                            value={localFilters.type}
                            onValueChange={(value) => onFilterChange('type', value)}
                        >
                            <SelectTrigger className="h-10 bg-card border-none shadow-sm ring-1 ring-border/50 rounded-lg">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Content</SelectItem>
                                <SelectItem value="article">Articles</SelectItem>
                                <SelectItem value="recipe">Recipes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Category</label>
                        <Select
                            value={localFilters.category}
                            onValueChange={(value) => onFilterChange('category', value)}
                        >
                            <SelectTrigger className="h-10 bg-card border-none shadow-sm ring-1 ring-border/50 rounded-lg">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Every Category</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.slug} value={cat.slug}>
                                        {cat.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Author</label>
                        <Select
                            value={localFilters.author}
                            onValueChange={(value) => onFilterChange('author', value)}
                        >
                            <SelectTrigger className="h-10 bg-card border-none shadow-sm ring-1 ring-border/50 rounded-lg">
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

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Visibility Status</label>
                        <Select
                            value={localFilters.status}
                            onValueChange={(value) => onFilterChange('status', value)}
                        >
                            <SelectTrigger className="h-10 bg-card border-none shadow-sm ring-1 ring-border/50 rounded-lg">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Any Status</SelectItem>
                                <SelectItem value="online">Published</SelectItem>
                                <SelectItem value="offline">Drafts</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5 lg:col-span-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Tags Selection</label>
                        <div className="flex flex-wrap gap-2 p-2 min-h-10 bg-card border-none shadow-sm ring-1 ring-border/50 rounded-lg">
                            {localFilters.tags.length === 0 && (
                                <span className="text-xs text-muted-foreground/60 py-1 px-2 italic">No tags selected</span>
                            )}
                            {localFilters.tags.map((tagId) => {
                                const tag = tags.find(t => t.id === tagId);
                                return (
                                    <Badge key={tagId} variant="secondary" className="gap-1.5 py-1 px-2 bg-secondary/50 hover:bg-secondary text-xs rounded-md">
                                        {tag?.label || tagId}
                                        <X
                                            className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors"
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
                                    <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[10px] font-bold uppercase tracking-tighter hover:bg-primary/10 hover:text-primary transition-colors">
                                        + Tag
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-48 max-h-[300px] overflow-auto">
                                    {tags
                                        .filter(tag => !localFilters.tags.includes(tag.id))
                                        .map((tag) => (
                                            <DropdownMenuItem
                                                key={tag.id}
                                                onClick={() => {
                                                    const newTags = [...localFilters.tags, tag.id];
                                                    onFilterChange('tags', newTags);
                                                }}
                                                className="text-xs"
                                            >
                                                {tag.label}
                                            </DropdownMenuItem>
                                        ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <div className="space-y-1.5 lg:col-span-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">Published Within</label>
                      <div className="flex items-center gap-2 h-10">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                              type="date"
                              value={localFilters.dateFrom}
                              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
                              className="h-10 pl-8 bg-card border-none shadow-sm ring-1 ring-border/50 rounded-lg text-xs"
                          />
                        </div>
                        <span className="text-muted-foreground/40 text-xs">to</span>
                        <div className="relative flex-1">
                          <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                          <Input
                              type="date"
                              value={localFilters.dateTo}
                              onChange={(e) => onFilterChange('dateTo', e.target.value)}
                              className="h-10 pl-8 bg-card border-none shadow-sm ring-1 ring-border/50 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArticleFilters;
