import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { articlesAPI, categoriesAPI, authorsAPI, tagsAPI } from '../../../../services/api';
import { buildImageSlotFromMedia, generateSlug, isValidJSON } from '../../../../utils/helpers';
import type { AppEditor } from '@admin/components/BlockEditor/schema';
import { blocksToContentJson } from '@admin/components/BlockEditor/utils/conversion';
import { flattenBlocks } from '@admin/components/BlockEditor/utils/blockHelpers';
import { EDITOR_TYPE_TO_CONTENT_TYPE } from '@admin/components/BlockEditor/blocks/registry';
import { DEFAULT_HEADERS, normalizeRows } from '@admin/components/BlockEditor/blocks/table/TableBlock.defaults';
import type { TableRow } from '@admin/components/BlockEditor/blocks/table/TableBlock.types';

const EMPTY_CONTENT_DOCUMENT = '{"version":1,"kind":"content_document","blocks":[]}';
const EMPTY_FAQS_DOCUMENT = '{"heading":"Frequently Asked Questions","intro":null,"items":[]}';

function parseTableJson<T>(value: unknown, fallback: T): T {
    if (typeof value !== 'string') return (value ?? fallback) as T;
    try {
        const parsed = JSON.parse(value);
        return (parsed ?? fallback) as T;
    } catch {
        return fallback;
    }
}



interface ApiResponse<T = unknown> {
  data: {
    success: boolean;
    data: T;
    message?: string;
  };
}

interface ApiError {
  response?: {
    status: number;
    data?: { message?: string };
  };
  message: string;
}

interface TagItem {
  id: number;
  [key: string]: unknown;
}

interface ArticleData {
  id: number;
  slug: string;
  type: string;
  category_id: number | string | null;
  author_id: number | string | null;
  headline: string;
  subtitle?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  short_description: string;
  tldr: string;
  introduction?: string | null;
  summary?: string | null;
  image_url?: string | null;
  imageAlt?: string | null;
  heroUrl?: string | null;
  heroAlt?: string | null;
  workflow_status: string;
  is_favorite: boolean;
  published_at?: string | null;
  tags?: TagItem[];
  content_json?: unknown;
  recipe_json?: unknown;
  roundup_json?: unknown;
  faqs_json?: unknown;
  keywords?: unknown;
  references?: unknown;
  jsonld_json?: unknown;
  media?: unknown;
  images_json?: unknown;
  seo_json?: unknown;
}

interface ImageSlot {
  variants?: Record<string, { url: string }>;
  url?: string;
  alt?: string;
}

interface FormData {
  slug: string;
  type: string;
  category_id: number | null;
  author_id: number | null;
  label: string;
  headline: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl: string;
  short_description: string;
  tldr: string;
  introduction: string;
  summary: string;
  image_url: string;
  imageAlt: string;
  heroUrl: string;
  heroAlt: string;
  workflow_status: string;
  is_favorite: boolean;
  published_at: string;
  selectedTags: number[];
}

interface ContentEditorOptions {
  slug?: string;
  contentType?: string;
}

interface JsonErrors {
  [field: string]: string;
}

interface CategoryItem {
  id: number;
  [key: string]: unknown;
}

interface AuthorItem {
  id: number;
  [key: string]: unknown;
}

/**
 * Shared hook for content editors (articles, recipes, roundups)
 * Extracts common state management and logic
 */
export function useContentEditor({ slug, contentType = 'article' }: ContentEditorOptions) {
    const navigate = useNavigate();
    const isEditMode = !!slug;
    const articleLoadedRef = useRef(false);

    const normalizeId = (value: unknown): number | null => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() !== '') {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
    };

    // Core states
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [article_id, setArticleId] = useState<number | null>(null);

    // Lookup data
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [authors, setAuthors] = useState<AuthorItem[]>([]);
    const [tags, setTags] = useState<TagItem[]>([]);

    // Form data
    const [formData, setFormData] = useState<FormData>({
        slug: '',
        type: contentType,
        category_id: null,
        author_id: null,
        label: '',
        headline: '',
        metaTitle: '',
        metaDescription: '',
        canonicalUrl: '',
        short_description: '',
        tldr: '',
        introduction: '',
        summary: '',
        image_url: '',
        imageAlt: '',
        heroUrl: '',
        heroAlt: '',
        workflow_status: 'draft',
        is_favorite: false,
        published_at: '',
        selectedTags: [],
    });

    // JSON fields (stored as strings for Monaco + validation compatibility)
    const [content_json, setContentJson] = useState(EMPTY_CONTENT_DOCUMENT);
    const [recipe_json, setRecipeJson] = useState('{}');
    const [roundup_json, setRoundupJson] = useState('{"list_type":"ItemList","items":[]}');
    const [faqs_json, setFaqsJson] = useState(EMPTY_FAQS_DOCUMENT);
    const [keywordsJson, setKeywordsJson] = useState('[]');
    const [referencesJson, setReferencesJson] = useState('[]');
    const [mediaJson, setMediaJson] = useState('{}');
    const [jsonld_json, setJsonldJson] = useState('{}');
    const [imagesData, setImagesData] = useState<Record<string, ImageSlot | unknown>>({});

    // Validation
    const [jsonErrors, setJsonErrors] = useState<JsonErrors>({});

    // Media dialog
    const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
    const [activeMediaField, setActiveMediaField] = useState<string | null>(null);

    // Editor mode
    const [useVisualEditor, setUseVisualEditor] = useState(true);

    // Load lookup data on mount
    useEffect(() => {
        loadCategories();
        loadAuthors();
        loadTags();
        if (isEditMode && !articleLoadedRef.current) {
            articleLoadedRef.current = true;
            loadContent();
        }
    }, [slug]);

    const loadCategories = async () => {
        try {
            const response = await categoriesAPI.getAll() as ApiResponse<CategoryItem[]>;
            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const loadAuthors = async () => {
        try {
            const response = await authorsAPI.getAll() as ApiResponse<AuthorItem[]>;
            if (response.data.success) {
                setAuthors(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load authors:', error);
        }
    };

    const loadTags = async () => {
        try {
            const response = await tagsAPI.getAll() as ApiResponse<TagItem[]>;
            if (response.data.success) {
                setTags(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load tags:', error);
        }
    };

    const loadContent = async () => {
        if (!slug) return;
        try {
            setLoading(true);
            const response = await articlesAPI.getBySlug(slug) as ApiResponse<ArticleData>;
            if (response.data.success) {
                const article = response.data.data;
                setArticleId(article.id);

                const safeParse = (data: unknown, fallback: unknown): unknown => {
                    if (data === null || data === undefined) return fallback;
                    if (typeof data === 'object') return data;

                    let parsed: unknown = data;
                    for (let i = 0; i < 3; i++) {
                        try {
                            const result = JSON.parse(parsed as string);
                            if (typeof result === 'object' && result !== null) {
                                return result;
                            }
                            parsed = result;
                        } catch {
                            break;
                        }
                    }
                    return typeof parsed === 'object' ? parsed : fallback;
                };

                const safeStringify = (data: unknown, fallback: unknown): string => {
                    const parsed = safeParse(data, fallback);
                    try {
                        return JSON.stringify(parsed ?? fallback, null, 2);
                    } catch {
                        return JSON.stringify(fallback, null, 2);
                    }
                };

                const parsedImages = safeParse(article.images_json, {}) as Record<string, ImageSlot>;
                const parsedSeo = safeParse(article.seo_json, {}) as Record<string, string | undefined>;

                setImagesData(parsedImages);

                const category_id = normalizeId(article.category_id);
                const author_id = normalizeId(article.author_id);

                setFormData({
                    slug: article.slug,
                    type: article.type,
                    category_id,
                    author_id,
                    label: article.headline,
                    headline: article.subtitle || '',
                    metaTitle: article.metaTitle || (parsedSeo.meta_title as string | undefined) || (parsedSeo.metaTitle as string | undefined) || '',
                    metaDescription: article.metaDescription || (parsedSeo.meta_description as string | undefined) || (parsedSeo.metaDescription as string | undefined) || '',
                    canonicalUrl: article.canonicalUrl || (parsedSeo.canonical as string | undefined) || '',
                    short_description: article.short_description,
                    tldr: article.tldr,
                    introduction: article.introduction || '',
                    summary: article.summary || '',
                    image_url: article.image_url || '',
                    imageAlt: parsedImages?.thumbnail?.alt || article.imageAlt || '',
                    heroUrl: article.heroUrl || '',
                    heroAlt: parsedImages?.hero?.alt || article.heroAlt || '',
                    workflow_status: article.workflow_status || 'draft',
                    is_favorite: article.is_favorite,
                    published_at: article.published_at || '',
                    selectedTags: article.tags?.map(t => t.id) || [],
                });

                setContentJson(safeStringify(article.content_json, []));
                setRecipeJson(safeStringify(article.recipe_json, {}));
                setRoundupJson(safeStringify(article.roundup_json, { list_type: "ItemList", items: [] }));
                setFaqsJson(safeStringify(article.faqs_json, { heading: "Frequently Asked Questions", intro: null, items: [] }));
                setKeywordsJson(safeStringify(article.keywords, []));
                setReferencesJson(safeStringify(article.references, []));
                setJsonldJson(safeStringify(article.jsonld_json, {}));
                setMediaJson(safeStringify(article.media, {}));
            } else {
                toast.error(`Content "${slug}" not found.`);
                navigate(`/${contentType}s`);
            }
        } catch (error: unknown) {
            console.error('Failed to load content:', error);
            const err = error as ApiError;
            if (err.response?.status === 404) {
                toast.error(`Content "${slug}" not found.`);
                navigate(`/${contentType}s`);
            } else {
                toast.error('Failed to load: ' + (err.response?.data?.message || err.message));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: keyof FormData, value: unknown) => {
        const normalizedValue = (field === 'category_id' || field === 'author_id')
            ? normalizeId(value)
            : value;

        setFormData(prev => {
            const next = { ...prev, [field]: normalizedValue } as FormData;

            if (field === 'label' && !isEditMode) {
                next.slug = generateSlug(String(value ?? ''));
            }

            return next;
        });

        if (field === 'imageAlt') {
            setImagesData(prev => {
                const p = prev as Record<string, ImageSlot>;
                if (!p?.thumbnail) return prev;
                return { ...prev, thumbnail: { ...p.thumbnail, alt: value as string } };
            });
        }

        if (field === 'heroAlt') {
            setImagesData(prev => {
                const p = prev as Record<string, ImageSlot>;
                if (!p?.hero) return prev;
                return { ...prev, hero: { ...p.hero, alt: value as string } };
            });
        }
    };

    interface MediaItem {
        id: number;
        url?: string;
        alt_text?: string;
        [key: string]: unknown;
    }

    const handleMediaSelect = (item: MediaItem) => {
        if (activeMediaField === 'image') {
            const slot = buildImageSlotFromMedia(item, {
                alt: formData.imageAlt || formData.label,
                variant_keys: ['xs', 'sm'],
            }) as ImageSlot;
            setImagesData(prev => ({ ...prev, thumbnail: slot }));
            setFormData(prev => ({
                ...prev,
                image_url: slot?.variants?.sm?.url || slot?.variants?.xs?.url || slot?.url || item.url || '',
                imageAlt: slot?.alt || item.alt_text || prev.imageAlt
            }));
        } else if (activeMediaField === 'hero') {
            const slot = buildImageSlotFromMedia(item, {
                alt: formData.heroAlt || formData.label,
                variant_keys: ['sm', 'md', 'lg'],
            }) as ImageSlot;
            setImagesData(prev => ({ ...prev, hero: slot }));
            setFormData(prev => ({
                ...prev,
                heroUrl: slot?.variants?.md?.url || slot?.variants?.sm?.url || slot?.url || item.url || '',
                heroAlt: slot?.alt || item.alt_text || prev.heroAlt
            }));
        }
    };

    const handleImageRemove = (field: string) => {
        if (field === 'image') {
            setImagesData(prev => {
                const next = { ...prev };
                delete (next as Record<string, unknown>).thumbnail;
                return next;
            });
            setFormData(prev => ({
                ...prev,
                image_url: '',
                imageAlt: '',
            }));
        }

        if (field === 'hero') {
            setImagesData(prev => {
                const next = { ...prev };
                delete (next as Record<string, unknown>).hero;
                return next;
            });
            setFormData(prev => ({
                ...prev,
                heroUrl: '',
                heroAlt: '',
            }));
        }
    };

    const openMediaDialog = (field: string) => {
        setActiveMediaField(field);
        setMediaDialogOpen(true);
    };

    const validateJSON = (field: string, value: string): boolean => {
        if (!isValidJSON(value)) {
            setJsonErrors(prev => ({ ...prev, [field]: 'Invalid JSON' }));
            return false;
        } else {
            setJsonErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
            return true;
        }
    };

    const handleSave = async (editorInstance?: AppEditor | null) => {
        let finalContentJson = content_json;
        let finalRecipeJson = recipe_json;
        let finalRoundupJson = roundup_json;
        let finalFaqsJson = faqs_json;

        // Synchronously blur any active input/textarea to trigger their local draft commits (like SimpleTable)
        if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) {
            (document.activeElement as HTMLElement).blur();
        }

        if (editorInstance) {
            const docBlocks = editorInstance.document;
            const contentObj = blocksToContentJson(docBlocks as any[]);
            finalContentJson = JSON.stringify(contentObj, null, 2);

            const flatBlocks = flattenBlocks(docBlocks as any[]);
            // flatBlocks come from editorInstance.document (BlockNote editorType
            // ids). Map each to its stored content_json type via the registry
            // instead of hardcoding editor-type literals here.
            const contentTypeOf = (type: string) => EDITOR_TYPE_TO_CONTENT_TYPE[type] ?? type;
            const hasRoundupList = flatBlocks.some(({ block }) => contentTypeOf(block.type) === 'main_roundup');
            const hasFaqSection = flatBlocks.some(({ block }) => contentTypeOf(block.type) === 'main_faq');

            // roundup_json is the single source of truth, written directly by the
            // sidebar (RoundupListSettings) — finalRoundupJson already holds the
            // authoritative value, so there is no reverse derivation at save.
            // But if the roundup block was removed from the canvas, the marker is
            // gone and the curated list must be cleared so it stops rendering.
            if (contentType === 'roundup' && !hasRoundupList) {
                finalRoundupJson = '{"list_type":"ItemList","items":[]}';
            }
            if (!hasFaqSection) {
                finalFaqsJson = EMPTY_FAQS_DOCUMENT;
            }
        }

        const jsonFields: Record<string, string> = {
            content: finalContentJson,
            recipe: finalRecipeJson,
            roundup: finalRoundupJson,
            faqs: finalFaqsJson,
            keywords: keywordsJson,
            references: referencesJson,
            jsonld: jsonld_json,
            media: mediaJson,
        };

        let hasErrors = false;
        Object.entries(jsonFields).forEach(([field, value]) => {
            if (!validateJSON(field, value)) {
                hasErrors = true;
            }
        });

        if (hasErrors) {
            toast.error('Please fix JSON errors before saving');
            return;
        }

        const { image_url, heroUrl, imageAlt, heroAlt, label, headline, ...restFormData } = formData;
        const requiredFields: string[] = [];
        const trimmedLabel = (label || '').trim();
        const trimmedSlug = (restFormData.slug || '').trim();
        const computedSlug = trimmedSlug || generateSlug(trimmedLabel);

        if (!trimmedLabel) requiredFields.push('Title');
        if (!computedSlug) requiredFields.push('Slug');
        if (!restFormData.short_description?.trim()) requiredFields.push('Short Description');
        if (restFormData.category_id == null) requiredFields.push('Category');
        if (restFormData.author_id == null) requiredFields.push('Author');

        if (requiredFields.length > 0) {
            toast.error(`Please fill required fields: ${requiredFields.join(', ')}`);
            return;
        }

        const data: any = {
            ...restFormData,
            slug: computedSlug,
            headline: trimmedLabel,
            subtitle: headline?.trim() || null,
            content_json: finalContentJson,
            faqs_json: finalFaqsJson,
            keywordsJson,
            referencesJson,
            jsonld_json,
            mediaJson,
            images_json: JSON.stringify(imagesData),
        };

        if (contentType === 'recipe') {
            data.recipe_json = finalRecipeJson;
        } else if (contentType === 'roundup') {
            data.roundup_json = finalRoundupJson;
        }

        try {
            setSaving(true);
            if (isEditMode && article_id) {
                await articlesAPI.update(article_id, data);
                toast.success('Content saved successfully');
            } else {
                const response = await articlesAPI.create(data) as ApiResponse<{ slug: string }>;
                const newSlug = response?.data?.data?.slug || data.slug;
                navigate(`/${contentType}s/${newSlug}`);
                toast.success('Content created successfully');
            }
        } catch (error: unknown) {
            console.error('Failed to save:', error);
            const err = error as ApiError;
            toast.error('Failed to save: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    return {
        loading,
        saving,
        isEditMode,
        article_id,
        formData,
        categories,
        authors,
        tags,
        content_json,
        setContentJson,
        recipe_json,
        setRecipeJson,
        roundup_json,
        setRoundupJson,
        faqs_json,
        setFaqsJson,
        keywordsJson,
        setKeywordsJson,
        referencesJson,
        setReferencesJson,
        mediaJson,
        setMediaJson,
        jsonld_json,
        setJsonldJson,
        imagesData,
        setImagesData,
        jsonErrors,
        validateJSON,
        isValidJSON,
        mediaDialogOpen,
        setMediaDialogOpen,
        activeMediaField,
        openMediaDialog,
        handleMediaSelect,
        handleImageRemove,
        useVisualEditor,
        setUseVisualEditor,
        handleInputChange,
        handleSave,
        navigate,
    };
}
