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
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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

type SelectOption = {
    id: string | number;
    label?: string;
    name?: string;
    color?: string | null;
    style_json?: string | Record<string, unknown> | null;
    style?: string | Record<string, unknown> | null;
};

type EditorFormData = Record<string, unknown> & {
    category_id?: string | number | null;
    author_id?: string | number | null;
    workflow_status?: string;
    is_favorite?: boolean;
    published_at?: string;
    selectedTags?: Array<string | number>;
    metaTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    image_url?: string;
    imageAlt?: string;
    heroUrl?: string;
    heroAlt?: string;
    headline?: string;
    short_description?: string;
    tldr?: string;
    introduction?: string;
    summary?: string;
};

type InputChangeHandler = (field: string, value: unknown) => void;

/**
 * Collapsible Section Component
 */
function SettingsSection({
    title,
    icon: Icon,
    defaultOpen = false,
    isOpen: controlledIsOpen,
    onToggle,
    children,
    className
}: {
    title: string;
    icon?: LucideIcon;
    defaultOpen?: boolean;
    /** Controlled mode: pass isOpen + onToggle for accordion behavior */
    isOpen?: boolean;
    onToggle?: () => void;
    children: ReactNode;
    className?: string;
}) {
    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isControlled = controlledIsOpen !== undefined;
    const isOpen = isControlled ? controlledIsOpen : uncontrolledOpen;
    const handleToggle = isControlled
        ? onToggle!
        : () => setUncontrolledOpen(prev => !prev);

    return (
        <div className={cn('border-b border-border', className)}>
            <button
                type="button"
                onClick={handleToggle}
                className="flex items-center justify-between w-full py-3 px-4 hover:bg-muted/30 transition-colors text-left cursor-pointer"
            >
                <div className="flex items-center gap-2 min-w-0">
                    {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground/80 shrink-0" />}
                    <span className="text-xs font-semibold text-foreground select-none">{title}</span>
                </div>
                <ChevronDown
                    className={cn(
                        'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
                        isOpen && 'rotate-180'
                    )}
                />
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-1">
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
}: {
    value?: string | number | null;
    options: SelectOption[];
    onChange: (value: string | number) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    popoverClassName?: string;
    buttonClassName?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const selected = options.find((option) => String(option.id) === String(value));
    const filtered = options.filter((option) =>
        option.label?.toLowerCase().includes(query.trim().toLowerCase())
    );
    const getOptionColor = (option: SelectOption) => {
        if (option?.color) return option.color;
        const style = option?.style_json ?? option?.style;
        if (!style) return null;
        if (typeof style === 'string') {
            try {
                const parsed = JSON.parse(style);
                return parsed?.color || null;
            } catch {
                return null;
            }
        }
        return typeof style === 'object' ? style?.color as string | null : null;
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
}: {
    formData: EditorFormData;
    onInputChange: InputChangeHandler;
    categories?: SelectOption[];
    authors?: SelectOption[];
}) {
    return (
        <div className="space-y-2.5">
            <div className="flex items-center justify-between py-1 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground select-none">Category</span>
                </div>
                <div className="w-[170px] shrink-0">
                    <ChipSelect
                        value={formData.category_id}
                        options={categories || []}
                        onChange={(value) => onInputChange('category_id', value)}
                        placeholder="Select category"
                        searchPlaceholder="Search categories..."
                        buttonClassName="h-8 text-xs w-full"
                    />
                </div>
            </div>

            <div className="flex items-center justify-between py-1 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <User className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground select-none">Author</span>
                </div>
                <div className="w-[170px] shrink-0">
                    <Select
                        value={formData.author_id ? String(formData.author_id) : undefined}
                        onValueChange={(value) => onInputChange('author_id', value)}
                    >
                        <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue placeholder="Select author" />
                        </SelectTrigger>
                        <SelectContent>
                            {(authors || []).map((author: SelectOption) => (
                                <SelectItem key={author.id} value={String(author.id)}>
                                    {author.name || author.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center justify-between py-1 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground select-none">Status</span>
                </div>
                <div className="w-[120px] shrink-0">
                    <Select
                        value={(formData.workflow_status as string) || 'draft'}
                        onValueChange={(val) => onInputChange('workflow_status', val)}
                    >
                        <SelectTrigger className="h-8 w-full text-xs">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex items-center justify-between py-1 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Star className={cn('w-3.5 h-3.5 text-muted-foreground/70 shrink-0', formData.is_favorite ? 'text-yellow-500 fill-yellow-500' : '')} />
                    <span className="text-xs font-medium text-muted-foreground select-none">Favorite</span>
                </div>
                <button
                    type="button"
                    onClick={() => onInputChange('is_favorite', !formData.is_favorite)}
                    className={cn(
                        'flex items-center justify-center shrink-0',
                        'h-8 w-8 rounded-md transition-colors border border-input/60 cursor-pointer',
                        formData.is_favorite
                            ? 'text-yellow-500 bg-yellow-50/50 border-yellow-200 hover:bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900/50'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    )}
                >
                    <Star className={cn('h-3.5 w-3.5', formData.is_favorite ? 'fill-current' : '')} />
                </button>
            </div>

            <div className="flex items-center justify-between py-1 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                    <span className="text-xs font-medium text-muted-foreground select-none">Publish date</span>
                </div>
                <Input
                    type="datetime-local"
                    value={formData.published_at || ''}
                    onChange={(e) => onInputChange('published_at', e.target.value)}
                    className="h-8 text-xs w-[180px] shrink-0"
                />
            </div>
        </div>
    );
}

/**
 * Tags Section
 */
function TagsSectionContent({ formData, onInputChange, tags }: { formData: EditorFormData; onInputChange: InputChangeHandler; tags?: SelectOption[] }) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex h-7 shrink-0 items-center gap-2 text-xs font-semibold text-foreground">
                <Tag className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                <span className="select-none text-xs font-semibold">Tags</span>
            </div>
            <TagSelector
                tags={tags ?? []}
                selectedTags={formData.selectedTags ?? []}
                onTagsChange={(newTags: Array<string | number>) => onInputChange('selectedTags', newTags)}
                containerClassName="min-w-0 flex-1 space-y-2"
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
function SEOSectionContent({ formData, onInputChange, isEditMode }: { formData: EditorFormData; onInputChange: InputChangeHandler; isEditMode?: boolean }) {
    const metaTitleLength = (formData.metaTitle || '').length;
    const metaDescLength = (formData.metaDescription || '').length;

    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="metaTitle" className="text-xs font-semibold text-muted-foreground select-none">Meta Title</Label>
                    <span className={cn(
                        'text-[10px]',
                        metaTitleLength > 60 ? 'text-destructive' : 'text-muted-foreground/60'
                    )}>
                        {metaTitleLength}/60
                    </span>
                </div>
                <Input
                    id="metaTitle"
                    value={formData.metaTitle || ''}
                    onChange={(e) => onInputChange('metaTitle', e.target.value)}
                    placeholder="SEO title"
                    className="text-xs h-8"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <Label htmlFor="metaDescription" className="text-xs font-semibold text-muted-foreground select-none">Meta Description</Label>
                    <span className={cn(
                        'text-[10px]',
                        metaDescLength > 160 ? 'text-destructive' : 'text-muted-foreground/60'
                    )}>
                        {metaDescLength}/160
                    </span>
                </div>
                <Textarea
                    id="metaDescription"
                    value={formData.metaDescription || ''}
                    onChange={(e) => onInputChange('metaDescription', e.target.value)}
                    placeholder="SEO description"
                    rows={2}
                    className="text-xs resize-none"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="canonicalUrl" className="text-xs font-semibold text-muted-foreground select-none">Canonical URL</Label>
                <Input
                    id="canonicalUrl"
                    value={formData.canonicalUrl || ''}
                    onChange={(e) => onInputChange('canonicalUrl', e.target.value)}
                    placeholder="https://..."
                    className="text-xs h-8"
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
}: {
    formData: EditorFormData;
    imagesData?: string | Record<string, any> | null;
    onInputChange: InputChangeHandler;
    onImageRemove?: (slot: string) => void;
    onMediaDialogOpen: (slot: string) => void;
}) {
    const featured = extractImage(imagesData as any, 'thumbnail', 720);
    const featuredSrcSet = toAdminSrcSet(getImageSrcSet(imagesData as any, 'thumbnail'));
    const featuredUrl = toAdminImageUrl(featured.image_url || (typeof formData.image_url === 'string' ? formData.image_url : undefined));
    const featuredAlt = (typeof formData.imageAlt === 'string' ? formData.imageAlt : undefined) || featured.imageAlt || 'Featured';
    const featuredStyle = buildImageStyle(featured);

    const hero = extractImage(imagesData as any, 'hero', 1200);
    const heroSlotSrcSet = toAdminSrcSet(getImageSrcSet(imagesData as any, 'hero'));
    const heroUrl = toAdminImageUrl(hero.image_url || (typeof formData.heroUrl === 'string' ? formData.heroUrl : undefined));
    const heroAlt = (typeof formData.heroAlt === 'string' ? formData.heroAlt : undefined) || hero.imageAlt || 'Hero';
    const heroStyle = buildImageStyle(hero);

    return (
        <div className="space-y-4">
            {/* Featured Image */}
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground select-none">Featured Image</Label>
                <div className="w-full space-y-2">
                    {featuredUrl ? (
                        <div className="relative group overflow-hidden rounded-md border border-border">
                            <img
                                src={featuredUrl}
                                alt={featuredAlt}
                                srcSet={featuredSrcSet || undefined}
                                sizes="280px"
                                className="w-full aspect-video object-cover"
                                style={featuredStyle}
                            />
                            <div className={cn(
                                'absolute inset-0 bg-black/60',
                                'opacity-0 group-hover:opacity-100 transition-opacity',
                                'flex items-center justify-center gap-2'
                            )}>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onMediaDialogOpen('image')}
                                    className="h-7 text-xs cursor-pointer"
                                >
                                    Replace
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onImageRemove?.('image')}
                                    className="h-7 text-xs cursor-pointer"
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
                                'w-full aspect-video border border-dashed rounded-md',
                                'flex flex-col items-center justify-center gap-2 cursor-pointer',
                                'hover:bg-muted/50 hover:border-primary/30 transition-colors'
                            )}
                        >
                            <Image className="w-5 h-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground select-none">Set featured image</span>
                        </button>
                    )}
                    <Input
                        placeholder="Alt text"
                        value={formData.imageAlt || ''}
                        onChange={(e) => onInputChange('imageAlt', e.target.value)}
                        className="text-xs h-8"
                    />
                </div>
            </div>

            {/* Hero Image */}
            <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold text-muted-foreground select-none">Hero Image</Label>
                <div className="w-full space-y-2">
                    {heroUrl ? (
                        <div className="relative group overflow-hidden rounded-md border border-border">
                            <img
                                src={heroUrl}
                                alt={heroAlt}
                                srcSet={heroSlotSrcSet || undefined}
                                sizes="280px"
                                className="w-full aspect-video object-cover"
                                style={heroStyle}
                            />
                            <div className={cn(
                                'absolute inset-0 bg-black/60',
                                'opacity-0 group-hover:opacity-100 transition-opacity',
                                'flex items-center justify-center gap-2'
                            )}>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onMediaDialogOpen('hero')}
                                    className="h-7 text-xs cursor-pointer"
                                >
                                    Replace
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onImageRemove?.('hero')}
                                    className="h-7 text-xs cursor-pointer"
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => onMediaDialogOpen('hero')}
                            className={cn(
                                'w-full aspect-video border border-dashed rounded-md',
                                'flex flex-col items-center justify-center gap-2 cursor-pointer',
                                'hover:bg-muted/50 hover:border-primary/30 transition-colors'
                            )}
                        >
                            <Image className="w-5 h-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground select-none">Set Hero Image</span>
                        </button>
                    )}
                    <Input
                        placeholder="Alt text"
                        value={formData.heroAlt || ''}
                        onChange={(e) => onInputChange('heroAlt', e.target.value)}
                        className="text-xs h-8"
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Excerpts Section
 */
function ExcerptsSectionContent({ formData, onInputChange }: { formData: EditorFormData; onInputChange: InputChangeHandler }) {
    return (
        <div className="space-y-3">
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="headline" className="text-xs font-semibold text-muted-foreground select-none">Headline</Label>
                <Input
                    id="headline"
                    value={formData.headline || ''}
                    onChange={(e) => onInputChange('headline', e.target.value)}
                    placeholder="Short subtitle for the post"
                    className="text-xs h-8"
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <Label htmlFor="short_description" className="text-xs font-semibold text-muted-foreground select-none">Short Description</Label>
                <Textarea
                    id="short_description"
                    value={formData.short_description || ''}
                    onChange={(e) => onInputChange('short_description', e.target.value)}
                    placeholder="Brief description for listings"
                    rows={2}
                    className="text-xs resize-none"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="tldr" className="text-xs font-semibold text-muted-foreground select-none">TL;DR</Label>
                <Textarea
                    id="tldr"
                    value={formData.tldr || ''}
                    onChange={(e) => onInputChange('tldr', e.target.value)}
                    placeholder="Too long; didn't read"
                    rows={2}
                    className="text-xs resize-none"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="introduction" className="text-xs font-semibold text-muted-foreground select-none">Introduction</Label>
                <Textarea
                    id="introduction"
                    value={formData.introduction || ''}
                    onChange={(e) => onInputChange('introduction', e.target.value)}
                    placeholder="Article introduction"
                    rows={2}
                    className="text-xs resize-none"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <Label htmlFor="summary" className="text-xs font-semibold text-muted-foreground select-none">Summary</Label>
                <Textarea
                    id="summary"
                    value={formData.summary || ''}
                    onChange={(e) => onInputChange('summary', e.target.value)}
                    placeholder="Article summary"
                    rows={2}
                    className="text-xs resize-none"
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
}: {
    formData: EditorFormData;
    onInputChange: InputChangeHandler;
    imagesData?: string | Record<string, any> | null;
    onImageRemove?: (slot: string) => void;
    onMediaDialogOpen: (slot: string) => void;
    tags?: SelectOption[];
    categories?: SelectOption[];
    authors?: SelectOption[];
    isEditMode?: boolean;
}) {
    const sections = ['post', 'tags', 'media', 'seo', 'excerpts'] as const;
    type SectionId = typeof sections[number];
    const [openSection, setOpenSection] = useState<SectionId>('post');

    const toggle = (id: SectionId) =>
        setOpenSection(prev => (prev === id ? ('' as SectionId) : id));

    return (
        <div className="relative">
            <SettingsSection
                title="Post"
                icon={Globe}
                isOpen={openSection === 'post'}
                onToggle={() => toggle('post')}
            >
                <StatusSection
                     formData={formData}
                     onInputChange={onInputChange}
                     categories={categories}
                     authors={authors}
                />
            </SettingsSection>

            <SettingsSection
                title="Tags"
                icon={Tag}
                isOpen={openSection === 'tags'}
                onToggle={() => toggle('tags')}
            >
                <TagsSectionContent
                    formData={formData}
                    onInputChange={onInputChange}
                    tags={tags}
                />
            </SettingsSection>

            <SettingsSection
                title="Featured Media"
                icon={Image}
                isOpen={openSection === 'media'}
                onToggle={() => toggle('media')}
            >
                <MediaSectionContent
                    formData={formData}
                    imagesData={imagesData}
                    onInputChange={onInputChange}
                    onImageRemove={onImageRemove}
                    onMediaDialogOpen={onMediaDialogOpen}
                />
            </SettingsSection>

            <SettingsSection
                title="SEO"
                icon={Search}
                isOpen={openSection === 'seo'}
                onToggle={() => toggle('seo')}
            >
                <SEOSectionContent
                    formData={formData}
                    onInputChange={onInputChange}
                    isEditMode={isEditMode}
                />
            </SettingsSection>

            <SettingsSection
                title="Excerpts"
                icon={FileText}
                isOpen={openSection === 'excerpts'}
                onToggle={() => toggle('excerpts')}
            >
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
