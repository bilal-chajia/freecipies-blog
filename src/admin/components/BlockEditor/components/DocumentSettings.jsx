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
    User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Button } from '@/ui/button';
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
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    'flex items-center justify-between w-full',
                    'px-4 py-3 text-sm font-medium',
                    'hover:bg-muted/50 transition-colors',
                    'text-left'
                )}
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                    {title}
                </div>
                <ChevronDown
                    className={cn(
                        'w-4 h-4 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180'
                    )}
                />
            </button>
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

/**
 * Status & Visibility Section
 */
function StatusSection({ formData, onInputChange, categories, authors }) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{formData.status || 'Draft'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Visibility</span>
                <span className="font-medium">Public</span>
            </div>
            {formData.publishDate && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Publish</span>
                    <span className="font-medium">{new Date(formData.publishDate).toLocaleDateString()}</span>
                </div>
            )}
        </div>
    );
}

/**
 * Tags Section
 */
function TagsSectionContent({ formData, onInputChange, tags }) {
    return (
        <TagSelector
            tags={tags}
            selectedTags={formData.selectedTags}
            onTagsChange={(newTags) => onInputChange('selectedTags', newTags)}
        />
    );
}

/**
 * SEO Section
 */
function SEOSectionContent({ formData, onInputChange, isEditMode }) {
    const metaTitleLength = (formData.metaTitle || '').length;
    const metaDescLength = (formData.metaDescription || '').length;

    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="slug" className="text-xs font-medium">URL Slug</Label>
                </div>
                <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => onInputChange('slug', e.target.value)}
                    placeholder="article-slug"
                    disabled={isEditMode}
                    className="text-sm h-8"
                />
            </div>

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
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
        <div className="space-y-4">
            {/* Featured Image */}
            <div className="space-y-2">
                <Label className="text-xs font-medium">Featured Image</Label>
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

            {/* Cover Image */}
            <div className="space-y-2">
                <Label className="text-xs font-medium">Cover Image</Label>
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
    );
}

/**
 * Excerpts Section
 */
function ExcerptsSectionContent({ formData, onInputChange }) {
    return (
        <div className="space-y-3">
            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
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

            <div className="space-y-1.5">
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
            <SettingsSection title="Status" icon={Globe} defaultOpen>
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
