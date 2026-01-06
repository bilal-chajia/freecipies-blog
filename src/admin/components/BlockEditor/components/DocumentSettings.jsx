/**
 * Document Settings
 * 
 * Collapsible sections for the WordPress Block Editor Settings Sidebar.
 * Contains document-level settings like SEO, Media, Tags, and Excerpts.
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronDown,
    Tag,
    Image,
    Search,
    FileText,
    Globe,
    Calendar,
    User,
    FolderOpen,
    Star,
    ChevronsUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { extractImage, getImageSrcSet } from '@shared/utils';
import { buildImageStyle, toAdminImageUrl, toAdminSrcSet } from '../../../utils/helpers';
import TagSelector from '../../TagSelector';

/**
 * Collapsible Section Component
 */
function SettingsSection({
    title,
    icon: Icon,
    defaultOpen = false,
    children,
    className
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={cn('border-b border-border', className)}>
            <div className="px-2 py-2">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        'structure-item w-full justify-between',
                        isOpen && 'is-active'
                    )}
                >
                    <div className="flex items-center gap-2 min-w-0">
                        {Icon && <Icon className="structure-item-icon" />}
                        <span className="structure-item-label">{title}</span>
                    </div>
                    <ChevronDown
                        className={cn(
                            'w-4 h-4 text-muted-foreground transition-transform',
                            isOpen && 'rotate-180'
                        )}
                    />
                </button>
            </div>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function ChipSelect({
    value,
    options,
    onChange,
    placeholder = 'Select option...',
    searchPlaceholder = 'Search...',
    popoverClassName,
    buttonClassName,
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const selected = options.find((option) => String(option.id) === String(value));
    const filtered = options.filter((option) =>
        option.label?.toLowerCase().includes(query.trim().toLowerCase())
    );
    const getOptionColor = (option) => {
        if (option?.color) return option.color;
        const style = option?.style_json ?? option?.styleJson ?? option?.style;
        if (!style) return null;
        if (typeof style === 'string') {
            try {
                const parsed = JSON.parse(style);
                return parsed?.color || null;
            } catch {
                return null;
            }
        }
        return style?.color || null;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    type="button"
                    className={cn('w-full justify-between h-8 text-xs', buttonClassName)}
                >
                    {selected?.label || placeholder}
                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className={cn('w-[260px] p-2', popoverClassName)}
                align="start"
            >
                <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={searchPlaceholder}
                    className="h-8 text-xs"
                />
                <div className="mt-2 max-h-[200px] overflow-y-auto flex flex-wrap gap-1">
                    {filtered.length === 0 ? (
                        <div className="text-xs text-muted-foreground px-1 py-2">
                            No matches.
                        </div>
                    ) : (
                        filtered.map((option) => {
                            const isSelected = String(option.id) === String(value);
                            const optionColor = getOptionColor(option);
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        onChange(option.id);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        'px-2 py-1 rounded-full border text-xs transition-colors',
                                        isSelected
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-muted/60 text-foreground border-transparent hover:bg-muted'
                                    )}
                                    style={optionColor ? { borderColor: optionColor } : undefined}
                                >
                                    {option.label}
                                </button>
                            );
                        })
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}

/**
 * Status & Visibility Section
 */
function StatusSection({
    formData,
    onInputChange,
    categories,
    authors,
}) {
    return (
        <div className="space-y-2">
            <div className="structure-item">
                <FolderOpen className="structure-item-icon" />
                <span className="structure-item-label">Category</span>
                <div className="ml-auto w-[170px]">
                    <ChipSelect
                        value={formData.categoryId}
                        options={categories || []}
                        onChange={(value) => onInputChange('categoryId', value)}
                        placeholder="Select category"
                        searchPlaceholder="Search categories..."
                        buttonClassName="h-8 text-xs"
                    />
                </div>
            </div>

            <div className="structure-item">
                <User className="structure-item-icon" />
                <span className="structure-item-label">Author</span>
                <div className="ml-auto w-[170px]">
                    <Select
                        value={formData.authorId ? String(formData.authorId) : undefined}
                        onValueChange={(value) => onInputChange('authorId', value)}
                    >
                        <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue placeholder="Select author" />
                        </SelectTrigger>
                        <SelectContent>
                            {(authors || []).map((author) => (
                                <SelectItem key={author.id} value={String(author.id)}>
                                    {author.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="structure-item">
                <Globe className="structure-item-icon" />
                <span className="structure-item-label">Status</span>
                <Badge
                    variant={formData.isOnline ? 'default' : 'secondary'}
                    className={cn(
                        'ml-auto cursor-pointer text-xs',
                        formData.isOnline ? 'bg-green-600 hover:bg-green-700' : ''
                    )}
                    onClick={() => onInputChange('isOnline', !formData.isOnline)}
                >
                    {formData.isOnline ? 'Online' : 'Draft'}
                </Badge>
            </div>

            <div className="structure-item">
                <Star className={cn('structure-item-icon', formData.isFavorite ? 'text-yellow-500' : '')} />
                <span className="structure-item-label">Favorite</span>
                <button
                    type="button"
                    onClick={() => onInputChange('isFavorite', !formData.isFavorite)}
                    className={cn(
                        'ml-auto flex items-center justify-center',
                        'h-8 w-8 rounded-md transition-colors',
                        formData.isFavorite
                            ? 'text-yellow-500 bg-yellow-50 hover:bg-yellow-100'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                >
                    <Star className={cn('h-4 w-4', formData.isFavorite ? 'fill-current' : '')} />
                </button>
            </div>

            <div className="structure-item">
                <Calendar className="structure-item-icon" />
                <span className="structure-item-label">Publish date</span>
                <Input
                    type="datetime-local"
                    value={formData.publishedAt || ''}
                    onChange={(e) => onInputChange('publishedAt', e.target.value)}
                    className="ml-auto h-8 text-xs w-[180px]"
                />
            </div>
        </div>
    );
}

/**
 * Tags Section
 */
function TagsSectionContent({ formData, onInputChange, tags }) {
    return (
        <div className="structure-item flex-col items-start gap-3">
            <TagSelector
                tags={tags}
                selectedTags={formData.selectedTags}
                onTagsChange={(newTags) => onInputChange('selectedTags', newTags)}
                containerClassName="w-full space-y-2"
                buttonClassName="h-7 text-[11px]"
                popoverClassName="w-[260px]"
                badgeClassName="text-[10px] px-1.5 py-0.5"
                useChips
            />
        </div>
    );
}

/**
 * SEO Section
 */
function SEOSectionContent({ formData, onInputChange, isEditMode }) {
    const metaTitleLength = (formData.metaTitle || '').length;
    const metaDescLength = (formData.metaDescription || '').length;

    return (
        <div className="space-y-2">
            <div className="structure-item flex-col items-start gap-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="metaTitle" className="text-xs font-medium">Meta Title</Label>
                    <span className={cn(
                        'text-[10px]',
                        metaTitleLength > 60 ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                        {metaTitleLength}/60
                    </span>
                </div>
                <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) => onInputChange('metaTitle', e.target.value)}
                    placeholder="SEO title"
                    className="text-sm h-8"
                />
            </div>

            <div className="structure-item flex-col items-start gap-2">
                <div className="flex items-center justify-between">
                    <Label htmlFor="metaDescription" className="text-xs font-medium">Meta Description</Label>
                    <span className={cn(
                        'text-[10px]',
                        metaDescLength > 160 ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                        {metaDescLength}/160
                    </span>
                </div>
                <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => onInputChange('metaDescription', e.target.value)}
                    placeholder="SEO description"
                    rows={2}
                    className="text-sm resize-none"
                />
            </div>

            <div className="structure-item flex-col items-start gap-2">
                <Label htmlFor="canonicalUrl" className="text-xs font-medium">Canonical URL</Label>
                <Input
                    id="canonicalUrl"
                    value={formData.canonicalUrl}
                    onChange={(e) => onInputChange('canonicalUrl', e.target.value)}
                    placeholder="https://..."
                    className="text-sm h-8"
                />
            </div>
        </div>
    );
}

/**
 * Media Section
 */
function MediaSectionContent({
    formData,
    imagesData,
    onInputChange,
    onImageRemove,
    onMediaDialogOpen,
}) {
    const featured = extractImage(imagesData, 'thumbnail', 720);
    const featuredSrcSet = toAdminSrcSet(getImageSrcSet(imagesData, 'thumbnail'));
    const featuredUrl = toAdminImageUrl(featured.imageUrl || formData.imageUrl);
    const featuredAlt = formData.imageAlt || featured.imageAlt || 'Featured';
    const featuredStyle = buildImageStyle(featured);

    const cover = extractImage(imagesData, 'cover', 1200);
    const coverSrcSet = toAdminSrcSet(getImageSrcSet(imagesData, 'cover'));
    const coverUrl = toAdminImageUrl(cover.imageUrl || formData.coverUrl);
    const coverAlt = formData.coverAlt || cover.imageAlt || 'Cover';
    const coverStyle = buildImageStyle(cover);

    return (
        <div className="space-y-2">
            {/* Featured Image */}
            <div className="structure-item flex-col items-start gap-2">
                <Label className="text-xs font-medium">Featured Image</Label>
                <div className="w-full space-y-2 max-w-[240px]">
                    {featuredUrl ? (
                        <div className="relative group">
                            <img
                                src={featuredUrl}
                                alt={featuredAlt}
                                srcSet={featuredSrcSet || undefined}
                                sizes="280px"
                                className="w-full aspect-video object-cover rounded-md border"
                                style={featuredStyle}
                            />
                            <div className={cn(
                                'absolute inset-0 bg-black/60 rounded-md',
                                'opacity-0 group-hover:opacity-100 transition-opacity',
                                'flex items-center justify-center gap-2'
                            )}>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onMediaDialogOpen('image')}
                                    className="h-7 text-xs"
                                >
                                    Replace
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onImageRemove?.('image')}
                                    className="h-7 text-xs"
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onMediaDialogOpen('image')}
                            className={cn(
                                'w-full aspect-video border-2 border-dashed rounded-md',
                                'flex flex-col items-center justify-center gap-2',
                                'hover:bg-muted/50 hover:border-primary/30 transition-colors'
                            )}
                        >
                            <Image className="w-6 h-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Set featured image</span>
                        </button>
                    )}
                    <Input
                        placeholder="Alt text"
                        value={formData.imageAlt}
                        onChange={(e) => onInputChange('imageAlt', e.target.value)}
                        className="text-sm h-8"
                    />
                </div>
            </div>

            {/* Cover Image */}
            <div className="structure-item flex-col items-start gap-2">
                <Label className="text-xs font-medium">Cover Image</Label>
                <div className="w-full space-y-2 max-w-[240px]">
                    {coverUrl ? (
                        <div className="relative group">
                            <img
                                src={coverUrl}
                                alt={coverAlt}
                                srcSet={coverSrcSet || undefined}
                                sizes="280px"
                                className="w-full aspect-video object-cover rounded-md border"
                                style={coverStyle}
                            />
                            <div className={cn(
                                'absolute inset-0 bg-black/60 rounded-md',
                                'opacity-0 group-hover:opacity-100 transition-opacity',
                                'flex items-center justify-center gap-2'
                            )}>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onMediaDialogOpen('cover')}
                                    className="h-7 text-xs"
                                >
                                    Replace
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onImageRemove?.('cover')}
                                    className="h-7 text-xs"
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onMediaDialogOpen('cover')}
                            className={cn(
                                'w-full aspect-video border-2 border-dashed rounded-md',
                                'flex flex-col items-center justify-center gap-2',
                                'hover:bg-muted/50 hover:border-primary/30 transition-colors'
                            )}
                        >
                            <Image className="w-6 h-6 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Set cover image</span>
                        </button>
                    )}
                    <Input
                        placeholder="Alt text"
                        value={formData.coverAlt}
                        onChange={(e) => onInputChange('coverAlt', e.target.value)}
                        className="text-sm h-8"
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Excerpts Section
 */
function ExcerptsSectionContent({ formData, onInputChange }) {
    return (
        <div className="space-y-2">
            <div className="structure-item flex-col items-start gap-2">
                <Label htmlFor="headline" className="text-xs font-medium">Headline</Label>
                <Input
                    id="headline"
                    value={formData.headline}
                    onChange={(e) => onInputChange('headline', e.target.value)}
                    placeholder="Short subtitle for the post"
                    className="text-sm h-8"
                />
            </div>
            <div className="structure-item flex-col items-start gap-2">
                <Label htmlFor="shortDescription" className="text-xs font-medium">Short Description</Label>
                <Textarea
                    id="shortDescription"
                    value={formData.shortDescription}
                    onChange={(e) => onInputChange('shortDescription', e.target.value)}
                    placeholder="Brief description for listings"
                    rows={2}
                    className="text-sm resize-none"
                />
            </div>

            <div className="structure-item flex-col items-start gap-2">
                <Label htmlFor="tldr" className="text-xs font-medium">TL;DR</Label>
                <Textarea
                    id="tldr"
                    value={formData.tldr}
                    onChange={(e) => onInputChange('tldr', e.target.value)}
                    placeholder="Too long; didn't read"
                    rows={2}
                    className="text-sm resize-none"
                />
            </div>

            <div className="structure-item flex-col items-start gap-2">
                <Label htmlFor="introduction" className="text-xs font-medium">Introduction</Label>
                <Textarea
                    id="introduction"
                    value={formData.introduction}
                    onChange={(e) => onInputChange('introduction', e.target.value)}
                    placeholder="Article introduction"
                    rows={2}
                    className="text-sm resize-none"
                />
            </div>

            <div className="structure-item flex-col items-start gap-2">
                <Label htmlFor="summary" className="text-xs font-medium">Summary</Label>
                <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => onInputChange('summary', e.target.value)}
                    placeholder="Article summary"
                    rows={2}
                    className="text-sm resize-none"
                />
            </div>
        </div>
    );
}

/**
 * Main Document Settings Component
 */
export default function DocumentSettings({
    formData,
    onInputChange,
    imagesData,
    onImageRemove,
    onMediaDialogOpen,
    tags,
    categories,
    authors,
    isEditMode,
}) {
    return (
        <div className="divide-y divide-border">
            <SettingsSection title="Post" icon={Globe} defaultOpen>
                <StatusSection
                    formData={formData}
                    onInputChange={onInputChange}
                    categories={categories}
                    authors={authors}
                />
            </SettingsSection>

            <SettingsSection title="Tags" icon={Tag} defaultOpen>
                <TagsSectionContent
                    formData={formData}
                    onInputChange={onInputChange}
                    tags={tags}
                />
            </SettingsSection>

            <SettingsSection title="Featured Media" icon={Image}>
                <MediaSectionContent
                    formData={formData}
                    imagesData={imagesData}
                    onInputChange={onInputChange}
                    onImageRemove={onImageRemove}
                    onMediaDialogOpen={onMediaDialogOpen}
                />
            </SettingsSection>

            <SettingsSection title="SEO" icon={Search}>
                <SEOSectionContent
                    formData={formData}
                    onInputChange={onInputChange}
                    isEditMode={isEditMode}
                />
            </SettingsSection>

            <SettingsSection title="Excerpts" icon={FileText}>
                <ExcerptsSectionContent
                    formData={formData}
                    onInputChange={onInputChange}
                />
            </SettingsSection>
        </div>
    );
}

// Export individual sections for flexibility
export {
    SettingsSection,
    StatusSection,
    TagsSectionContent,
    SEOSectionContent,
    MediaSectionContent,
    ExcerptsSectionContent,
};
