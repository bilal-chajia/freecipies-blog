import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { articlesAPI, categoriesAPI, authorsAPI, tagsAPI } from '../../../services/api';
import { generateSlug, isValidJSON } from '../../../utils/helpers';

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
        categorySlug: '',
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
                setFormData({
                    slug: article.slug,
                    type: article.type,
                    categorySlug: article.categorySlug,
                    authorSlug: article.authorSlug,
                    label: article.label,
                    headline: article.headline,
                    metaTitle: article.metaTitle,
                    metaDescription: article.metaDescription,
                    canonicalUrl: article.canonicalUrl || '',
                    shortDescription: article.shortDescription,
                    tldr: article.tldr,
                    introduction: article.introduction || '',
                    summary: article.summary || '',
                    imageUrl: article.imageUrl || '',
                    imageAlt: article.imageAlt || '',
                    coverUrl: article.coverUrl || '',
                    coverAlt: article.coverAlt || '',
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
        setFormData(prev => ({ ...prev, [field]: value }));

        if (field === 'label' && !isEditMode) {
            setFormData(prev => ({ ...prev, slug: generateSlug(value) }));
        }
    };

    const handleMediaSelect = (item) => {
        if (activeMediaField === 'image') {
            setFormData(prev => ({
                ...prev,
                imageUrl: item.url,
                imageAlt: item.altText || prev.imageAlt
            }));
        } else if (activeMediaField === 'cover') {
            setFormData(prev => ({
                ...prev,
                coverUrl: item.url,
                coverAlt: item.altText || prev.coverAlt
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

        const data = {
            ...formData,
            contentJson,
            recipeJson,
            roundupJson,
            faqsJson,
            keywordsJson,
            referencesJson,
            mediaJson,
        };

        try {
            setSaving(true);
            if (isEditMode && articleId) {
                await articlesAPI.update(articleId, data);
            } else {
                await articlesAPI.create(data);
            }
            navigate(`/${contentType}s`);
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

        // Editor
        useVisualEditor,
        setUseVisualEditor,

        // Actions
        handleInputChange,
        handleSave,
        navigate,
    };
}
