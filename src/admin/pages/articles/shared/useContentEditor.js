import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { articlesAPI, categoriesAPI, authorsAPI, tagsAPI } from '../../../services/api';
import { buildImageSlotFromMedia, generateSlug, isValidJSON } from '../../../utils/helpers';

/**
 * Shared hook for content editors (articles, recipes, roundups)
 * Extracts common state management and logic
 */
export function useContentEditor({ slug, contentType = 'article' }) {
    const navigate = useNavigate();
    const isEditMode = !!slug;
    const articleLoadedRef = useRef(false);

    // Core states
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [articleId, setArticleId] = useState(null);

    // Lookup data
    const [categories, setCategories] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [tags, setTags] = useState([]);

    // Form data
    const [formData, setFormData] = useState({
        slug: '',
        type: contentType,
        categoryId: null,
        categorySlug: '',
        authorId: null,
        authorSlug: '',
        label: '',
        headline: '',
        metaTitle: '',
        metaDescription: '',
        canonicalUrl: '',
        shortDescription: '',
        tldr: '',
        introduction: '',
        summary: '',
        imageUrl: '',
        imageAlt: '',
        coverUrl: '',
        coverAlt: '',
        isOnline: false,
        isFavorite: false,
        publishedAt: '',
        selectedTags: [],
    });

    // JSON fields
    const [contentJson, setContentJson] = useState('{}');
    const [recipeJson, setRecipeJson] = useState('{}');
    const [roundupJson, setRoundupJson] = useState('{"listType":"ItemList","items":[]}');
    const [faqsJson, setFaqsJson] = useState('[]');
    const [keywordsJson, setKeywordsJson] = useState('[]');
    const [referencesJson, setReferencesJson] = useState('[]');
    const [mediaJson, setMediaJson] = useState('{}');
    const [imagesData, setImagesData] = useState({});

    // Validation
    const [jsonErrors, setJsonErrors] = useState({});

    // Media dialog
    const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
    const [activeMediaField, setActiveMediaField] = useState(null);

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
            const response = await categoriesAPI.getAll();
            if (response.data.success) {
                setCategories(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const loadAuthors = async () => {
        try {
            const response = await authorsAPI.getAll();
            if (response.data.success) {
                setAuthors(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load authors:', error);
        }
    };

    const loadTags = async () => {
        try {
            const response = await tagsAPI.getAll();
            if (response.data.success) {
                setTags(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load tags:', error);
        }
    };

    const loadContent = async () => {
        try {
            setLoading(true);
            const response = await articlesAPI.getBySlug(slug);
            if (response.data.success) {
                const article = response.data.data;
                setArticleId(article.id);
                const parsedImages = (() => {
                    if (!article.imagesJson) return {};
                    try {
                        return typeof article.imagesJson === 'string'
                            ? JSON.parse(article.imagesJson)
                            : article.imagesJson;
                    } catch {
                        return {};
                    }
                })();

                const parsedSeo = (() => {
                    if (!article.seoJson) return {};
                    try {
                        return typeof article.seoJson === 'string'
                            ? JSON.parse(article.seoJson)
                            : article.seoJson;
                    } catch {
                        return {};
                    }
                })();

                setImagesData(parsedImages || {});

                setFormData({
                    slug: article.slug,
                    type: article.type,
                    categoryId: article.categoryId ?? null,
                    categorySlug: article.categorySlug,
                    authorId: article.authorId ?? null,
                    authorSlug: article.authorSlug,
                    label: article.label,
                    headline: article.headline,
                    metaTitle: article.metaTitle || parsedSeo.metaTitle || '',
                    metaDescription: article.metaDescription || parsedSeo.metaDescription || '',
                    canonicalUrl: article.canonicalUrl || parsedSeo.canonical || '',
                    shortDescription: article.shortDescription,
                    tldr: article.tldr,
                    introduction: article.introduction || '',
                    summary: article.summary || '',
                    imageUrl: article.imageUrl || '',
                    imageAlt: parsedImages?.thumbnail?.alt || article.imageAlt || '',
                    coverUrl: article.coverUrl || '',
                    coverAlt: parsedImages?.cover?.alt || article.coverAlt || '',
                    isOnline: article.isOnline,
                    isFavorite: article.isFavorite,
                    publishedAt: article.publishedAt || '',
                    selectedTags: article.tags?.map(t => t.id) || [],
                });

                setContentJson(JSON.stringify(article.content || {}, null, 2));
                setRecipeJson(JSON.stringify(article.recipe || article.recipeJson || {}, null, 2));
                setRoundupJson(JSON.stringify(article.roundup || article.roundupJson || { "listType": "ItemList", "items": [] }, null, 2));
                setFaqsJson(JSON.stringify(article.faqs || [], null, 2));
                setKeywordsJson(JSON.stringify(article.keywords || [], null, 2));
                setReferencesJson(JSON.stringify(article.references || [], null, 2));
                setMediaJson(JSON.stringify(article.media || {}, null, 2));
            } else {
                alert(`Content "${slug}" not found.`);
                navigate(`/${contentType}s`);
            }
        } catch (error) {
            console.error('Failed to load content:', error);
            if (error.response?.status === 404) {
                alert(`Content "${slug}" not found.`);
                navigate(`/${contentType}s`);
            } else {
                alert('Failed to load: ' + (error.response?.data?.message || error.message));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const next = { ...prev, [field]: value };

            if (field === 'categorySlug') {
                const match = categories.find((c) => c.slug === value);
                next.categoryId = match?.id ?? null;
            }

            if (field === 'authorSlug') {
                const match = authors.find((a) => a.slug === value);
                next.authorId = match?.id ?? null;
            }

            return next;
        });

        if (field === 'imageAlt') {
            setImagesData(prev => {
                if (!prev?.thumbnail) return prev;
                return { ...prev, thumbnail: { ...prev.thumbnail, alt: value } };
            });
        }

        if (field === 'coverAlt') {
            setImagesData(prev => {
                if (!prev?.cover) return prev;
                return { ...prev, cover: { ...prev.cover, alt: value } };
            });
        }

        if (field === 'label' && !isEditMode) {
            setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
        }
    };

    const handleMediaSelect = (item) => {
        if (activeMediaField === 'image') {
            const slot = buildImageSlotFromMedia(item, { alt: formData.imageAlt || formData.label });
            setImagesData(prev => ({ ...prev, thumbnail: slot }));
            setFormData(prev => ({
                ...prev,
                imageUrl: slot?.variants?.sm?.url || slot?.variants?.xs?.url || slot?.url || item.url,
                imageAlt: slot?.alt || item.altText || prev.imageAlt
            }));
        } else if (activeMediaField === 'cover') {
            const slot = buildImageSlotFromMedia(item, { alt: formData.coverAlt || formData.label });
            setImagesData(prev => ({ ...prev, cover: slot }));
            setFormData(prev => ({
                ...prev,
                coverUrl: slot?.variants?.md?.url || slot?.variants?.sm?.url || slot?.url || item.url,
                coverAlt: slot?.alt || item.altText || prev.coverAlt
            }));
        }
    };

    const handleImageRemove = (field) => {
        if (field === 'image') {
            setImagesData(prev => {
                const next = { ...prev };
                delete next.thumbnail;
                return next;
            });
            setFormData(prev => ({
                ...prev,
                imageUrl: '',
                imageAlt: '',
            }));
        }

        if (field === 'cover') {
            setImagesData(prev => {
                const next = { ...prev };
                delete next.cover;
                return next;
            });
            setFormData(prev => ({
                ...prev,
                coverUrl: '',
                coverAlt: '',
            }));
        }
    };

    const openMediaDialog = (field) => {
        setActiveMediaField(field);
        setMediaDialogOpen(true);
    };

    const validateJSON = (field, value) => {
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

    const handleSave = async () => {
        const jsonFields = {
            content: contentJson,
            recipe: recipeJson,
            roundup: roundupJson,
            faqs: faqsJson,
            keywords: keywordsJson,
            references: referencesJson,
            media: mediaJson,
        };

        let hasErrors = false;
        Object.entries(jsonFields).forEach(([field, value]) => {
            if (!validateJSON(field, value)) {
                hasErrors = true;
            }
        });

        if (hasErrors) {
            alert('Please fix JSON errors before saving');
            return;
        }

        const { imageUrl, coverUrl, imageAlt, coverAlt, ...restFormData } = formData;
        const categoryId = restFormData.categoryId ?? categories.find((c) => c.slug === restFormData.categorySlug)?.id ?? null;
        const authorId = restFormData.authorId ?? authors.find((a) => a.slug === restFormData.authorSlug)?.id ?? null;
        const data = {
            ...restFormData,
            categoryId,
            authorId,
            contentJson,
            recipeJson,
            roundupJson,
            faqsJson,
            keywordsJson,
            referencesJson,
            mediaJson,
            imagesJson: JSON.stringify(imagesData),
        };

        try {
            setSaving(true);
            if (isEditMode && articleId) {
                // Update: stay on the same page
                await articlesAPI.update(articleId, data);
            } else {
                // Create: navigate to the edit page of the new article
                const response = await articlesAPI.create(data);
                const newSlug = response?.data?.slug || data.slug;
                navigate(`/${contentType}s/${newSlug}`);
            }
        } catch (error) {
            console.error('Failed to save:', error);
            alert('Failed to save: ' + (error.response?.data?.message || error.message));
        } finally {
            setSaving(false);
        }
    };

    return {
        // State
        loading,
        saving,
        isEditMode,
        articleId,
        formData,
        categories,
        authors,
        tags,

        // JSON fields
        contentJson,
        setContentJson,
        recipeJson,
        setRecipeJson,
        roundupJson,
        setRoundupJson,
        faqsJson,
        setFaqsJson,
        keywordsJson,
        setKeywordsJson,
        referencesJson,
        setReferencesJson,
        mediaJson,
        setMediaJson,
        imagesData,
        setImagesData,

        // Validation
        jsonErrors,
        validateJSON,
        isValidJSON,

        // Media
        mediaDialogOpen,
        setMediaDialogOpen,
        activeMediaField,
        openMediaDialog,
        handleMediaSelect,
        handleImageRemove,

        // Editor
        useVisualEditor,
        setUseVisualEditor,

        // Actions
        handleInputChange,
        handleSave,
        navigate,
    };
}
