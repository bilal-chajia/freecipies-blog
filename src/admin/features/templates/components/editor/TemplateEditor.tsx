import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import TemplateCanvas from '../canvas/TemplateCanvas';
import { FONTS } from '../canvas/ElementPanel';
import EditorLayout from '../canvas/modern/EditorLayout';
import { templatesAPI } from '@admin/services/api';
import { useFontLoader } from '@modules/templates/utils/fontLoader';
import { useEditorStore } from '@admin/features/templates/store';
import type { TemplateState } from '@admin/features/templates/store';
import { generateSlug } from '@modules/templates/utils/slugUtils';
import { stringifyStoredTemplateElements } from '../../../../../modules/templates/utils';
import type { EditorElement, ElementType } from '@admin/features/templates/store/useEditorStore';

// Helper to resize images for thumbnails
const resizeImage = (blob: Blob, maxWidth: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);

        img.onload = () => {
            // Clean up object URL to prevent memory leak
            URL.revokeObjectURL(objectUrl);

            // Calculate new dimensions maintaining aspect ratio
            const ratio = Math.min(maxWidth / img.width, 1);
            const width = Math.round(img.width * ratio);
            const height = Math.round(img.height * ratio);

            // Draw to canvas at new size
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
            }

            // Convert to blob with compression (WebP for best size)
            canvas.toBlob((b) => resolve(b), 'image/webp', 0.7);
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            resolve(null);
        };

        img.src = objectUrl;
    });
};

// Force browsers/CDN to fetch the fresh thumbnail (stable key is reused)
const addCacheBust = (url: string | null): string | null => {
    if (!url) return url;
    const stamp = `v=${Date.now()}`;
    return url.includes('?') ? `${url}&${stamp}` : `${url}?${stamp}`;
};

const MOCK_ARTICLE_DATA = {
    title: "Delicious Chocolate Cake with Berries",
    categoryLabel: "Desserts",
    authorName: "Chef Anna",
    prepTime: "20 min",
    cookTime: "45 min",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80"
};

type ExportFunction = (format: 'png' | 'webp' | 'jpeg' | 'jpg', quality?: number) => Promise<Blob | null>;
type ThumbnailUploadResult = {
    url: string;
};
type ApiErrorLike = {
    response?: { status?: number };
    status?: number;
    message?: string;
};
type TemplateApiEnvelope = {
    data?: {
        data?: Partial<TemplateState>;
    } & Partial<TemplateState>;
};

function asApiError(error: unknown): ApiErrorLike {
    return typeof error === 'object' && error !== null ? error as ApiErrorLike : {};
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
}

function unwrapTemplateResponse(response: TemplateApiEnvelope | undefined): Partial<TemplateState> {
    return response?.data?.data || response?.data || {};
}

/**
 * TemplateEditor - Professional Canva-like template designer
 */
const TemplateEditor: React.FC = () => {
    const { slug } = useParams<{ slug?: string }>();
    const navigate = useNavigate();
    const isNewTemplate = !slug || slug === 'new';

    // Load fonts used in editor
    // Extract unique font families from elements + default fonts
    const defaultFonts = FONTS.map(f => f.name);
    useFontLoader(defaultFonts);

    // === ZUSTAND STORE - grouped selectors ===
    const template = useEditorStore(state => state.template);
    const elements = useEditorStore(state => state.elements);
    const selectedIds = useEditorStore(state => state.selectedIds);
    const zoom = useEditorStore(state => state.zoom);
    const showGrid = useEditorStore(state => state.showGrid);
    const isLoading = useEditorStore(state => state.isLoading);

    // Actions (stable references from Zustand store)
    const setTemplate = useEditorStore(state => state.setTemplate);
    const loadTemplateToStore = useEditorStore(state => state.loadTemplateToStore);
    const addElement = useEditorStore(state => state.addElement);
    const updateElement = useEditorStore(state => state.updateElement);
    const deleteSelected = useEditorStore(state => state.deleteSelected);
    const duplicateSelected = useEditorStore(state => state.duplicateSelected);
    const selectElement = useEditorStore(state => state.selectElement);
    const getFirstSelectedElement = useEditorStore(state => state.getFirstSelectedElement);
    const moveElementUp = useEditorStore(state => state.moveElementUp);
    const moveElementDown = useEditorStore(state => state.moveElementDown);
    const setLoading = useEditorStore(state => state.setLoading);
    const setSaving = useEditorStore(state => state.setSaving);
    const markSaved = useEditorStore(state => state.markSaved);
    const resetTemplate = useEditorStore(state => state.resetTemplate);

    const selectedElement = getFirstSelectedElement();

    // Preview state
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);

    // Export refs
    const exportFnRef = useRef<ExportFunction | null>(null);
    const previewExportRef = useRef<ExportFunction | null>(null);

    useEffect(() => {
        exportFnRef.current = null;
        previewExportRef.current = null;
    }, [slug, template?.slug, template?.id]);

    // Load existing template or reset for new
    useEffect(() => {
        if (isNewTemplate) {
            resetTemplate();
            return;
        }
        if (template?.slug === slug) return;
        loadTemplate();
    }, [slug, template?.slug]);

    const loadTemplate = useCallback(async () => {
        if (!slug) return;
        try {
            setLoading(true);
            const response = await templatesAPI.getBySlug(slug);
            const data = response.data?.data || response.data;
            if (data) {
                loadTemplateToStore(data, data.elements_json);
                localStorage.setItem('last_edited_template_slug', slug);
            }
        } catch (error: unknown) {
            console.error('Failed to load template:', error);
            const apiError = asApiError(error);
            const is404 = apiError.response?.status === 404 ||
                apiError.status === 404 ||
                apiError.message?.includes('not found');
            if (is404) {
                localStorage.removeItem('last_edited_template_slug');
                toast.error('Template not found - it may have been deleted');
                navigate('/templates/new', { replace: true });
            } else {
                toast.error('Failed to load template');
            }
        }
    }, [slug, loadTemplateToStore, setLoading, navigate]);

    // Stable handlers
    const handleElementSelect = useCallback((element: EditorElement | null) => {
        selectElement(element?.id || null);
    }, [selectElement]);

    const handleElementUpdate = useCallback((updatedElement: EditorElement) => {
        updateElement(updatedElement.id, updatedElement);
    }, [updateElement]);

    const handleAddElement = useCallback((type: ElementType, defaults: Partial<EditorElement>) => {
        addElement(type, defaults);
        toast.success(`Added ${type}`);
    }, [addElement]);

    const handleDeleteElement = useCallback(() => {
        if (selectedIds.size === 0) return;
        deleteSelected();
        toast.success('Element deleted');
    }, [selectedIds, deleteSelected]);

    const handleDuplicateElement = useCallback(() => {
        if (selectedIds.size === 0) return;
        duplicateSelected();
        toast.success('Element duplicated');
    }, [selectedIds, duplicateSelected]);

    const handleMoveUp = useCallback(() => {
        if (!selectedElement) return;
        moveElementUp(selectedElement.id);
    }, [selectedElement, moveElementUp]);

    const handleMoveDown = useCallback(() => {
        if (!selectedElement) return;
        moveElementDown(selectedElement.id);
    }, [selectedElement, moveElementDown]);

    // Generate and upload thumbnail with stable URL (overwrites existing)
    const uploadThumbnail = async (slugName: string): Promise<ThumbnailUploadResult> => {
        if (!exportFnRef.current) {
            throw new Error('Canvas export is not ready yet');
        }

        // Export canvas as WebP for best compression
        const blob = await exportFnRef.current('webp', 0.7);
        if (!blob) {
            throw new Error('Canvas export returned an empty thumbnail');
        }

        // Resize thumbnail for smaller file size (max 400px width)
        const resizedBlob = await resizeImage(blob, 400);
        if (!resizedBlob) {
            throw new Error('Thumbnail resize failed');
        }

        // Use stable filename - same URL will be overwritten on each save
        const filename = `thumb-${slugName}.webp`;
        const file = new File([resizedBlob], filename, { type: 'image/webp' });

        // Build form data
        const formData = new FormData();
        formData.append('file', file);
        formData.append('template_slug', slugName);

        // Upload via dedicated thumbnail API (overwrites existing file)
        const response = await fetch('/api/upload-thumbnail', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            },
            body: formData
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.error?.message || result.error || 'Thumbnail upload failed');
        }

        if (!result.data?.url) {
            throw new Error('Thumbnail upload response did not include url');
        }

        return { url: result.data.url };
    };

    // Handle template save
    const handleSave = async () => {
        try {
            setSaving(true);

            // Validation
            if (!template.name?.trim()) {
                toast.error('Please give your template a name');
                setSaving(false);
                return;
            }

            // Determine if this is a new template based on store data, not URL
            const isCreating = !template.id;

            // Generate slug if empty (for new templates)
            let templateSlug = template.slug;
            if (!templateSlug) {
                templateSlug = generateSlug(template.name);
            } else {
                // Sanitize existing slug in case it has invalid characters from previous versions
                templateSlug = templateSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            }

            // Step 1: Build clean payload — only send fields the API actually needs
            const templateData: Record<string, unknown> = {
                slug: templateSlug,
                name: template.name,
                description: template.description ?? undefined,
                category: template.category ?? undefined,
                width: template.width ?? template.canvas_width ?? 1000,
                height: template.height ?? template.canvas_height ?? 1500,
                elements_json: stringifyStoredTemplateElements(elements),
                thumbnail_url: template.thumbnail_url || undefined,
                background_color: template.background_color || '#ffffff',
                is_active: template.is_active ?? true,
            };

            let response;
            let saveSuccess = false;

            if (isCreating) {
                response = await templatesAPI.create(templateData);
                saveSuccess = response.data?.success !== false;
                if (saveSuccess) {
                    const createdTemplate = unwrapTemplateResponse(response);
                    const createdSlug = createdTemplate.slug || templateSlug;
                    const createdId = createdTemplate.id ?? null;

                    // Upload thumbnail BEFORE navigation (exportFnRef will be null after navigate)
                    const uploadedThumbnail = await uploadThumbnail(createdSlug);
                    const finalThumbnailUrl = addCacheBust(uploadedThumbnail.url);
                    let persistedTemplate: Partial<TemplateState> = createdTemplate;
                    if (finalThumbnailUrl) {
                        const thumbnailResponse = await templatesAPI.update(createdSlug, { thumbnail_url: finalThumbnailUrl });
                        persistedTemplate = unwrapTemplateResponse(thumbnailResponse);
                    }

                    // Refresh store with saved data so subsequent saves go through update path
                    loadTemplateToStore(
                        {
                            ...templateData,
                            ...persistedTemplate,
                            id: createdId,
                            slug: createdSlug,
                            thumbnail_url: persistedTemplate.thumbnail_url ?? finalThumbnailUrl
                        } as Partial<TemplateState>,
                        elements
                    );
                    markSaved();

                    window.dispatchEvent(new CustomEvent('template:saved', {
                        detail: {
                            template: {
                                ...templateData,
                                ...persistedTemplate,
                                id: createdId,
                                slug: createdSlug,
                                thumbnail_url: persistedTemplate.thumbnail_url ?? finalThumbnailUrl,
                            },
                            isNew: true
                        }
                    }));
                    navigate(`/templates/${createdSlug}`);
                    toast.success('Template created!');
                }
            } else {
                response = await templatesAPI.update(template.slug || '', templateData);
                saveSuccess = response.data?.success !== false;
                if (saveSuccess) {
                    // Upload thumbnail for existing templates
                    let persistedTemplate = unwrapTemplateResponse(response);
                    const uploadedThumbnail = await uploadThumbnail(templateSlug);
                    let latestThumbnailUrl = persistedTemplate.thumbnail_url ?? template.thumbnail_url ?? null;
                    if (uploadedThumbnail.url) {
                        const cacheBustedUrl = addCacheBust(uploadedThumbnail.url);
                        if (cacheBustedUrl) {
                            const thumbnailResponse = await templatesAPI.update(templateSlug, { thumbnail_url: cacheBustedUrl });
                            persistedTemplate = unwrapTemplateResponse(thumbnailResponse);
                            latestThumbnailUrl = persistedTemplate.thumbnail_url ?? cacheBustedUrl;
                            setTemplate({
                                ...persistedTemplate,
                                thumbnail_url: latestThumbnailUrl,
                            });
                            templateData.thumbnail_url = latestThumbnailUrl;
                        }
                    }

                    markSaved();

                    window.dispatchEvent(new CustomEvent('template:saved', {
                        detail: {
                            template: {
                                ...templateData,
                                ...persistedTemplate,
                                thumbnail_url: latestThumbnailUrl,
                            },
                            isNew: false,
                        },
                    }));
                    toast.success('Template saved!');
                }
            }
        } catch (error: unknown) {
            console.error('Failed to save template:', error);
            toast.error(`Failed to save: ${getErrorMessage(error)}`);
        } finally {
            setSaving(false);
        }
    };

    // Handle export image from main canvas
    const handleExportImage = async () => {
        if (!exportFnRef.current) {
            toast.error('Export not ready');
            return;
        }
        try {
            const blob = await exportFnRef.current('png', 1.0);
            if (!blob) {
                toast.error('Export failed');
                return;
            }
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filename = template.name || template.slug || 'template';
            link.download = `${filename}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Image exported!');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Export failed');
        }
    };

    // Handle preview toggle
    const handlePreview = () => {
        setIsPreviewOpen(!isPreviewOpen);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <React.Fragment>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
            >
                <EditorLayout onExport={handleSave} onPreview={handlePreview} onExportImage={handleExportImage} isPreviewOpen={isPreviewOpen}>
                    <TemplateCanvas
                        template={template}
                        editable={true}
                        scale={0.5}
                        zoom={zoom}
                        showGrid={showGrid}
                        onElementSelect={handleElementSelect}
                        onExport={(fn) => { exportFnRef.current = fn; }}
                    />
                </EditorLayout>
            </motion.div>

            {/* Preview Panel - Slide in from right */}
            <AnimatePresence>
                {isPreviewOpen && (
                    <>
                        {/* Backdrop overlay - click to close */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/30 z-60"
                            onClick={() => setIsPreviewOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-14 bottom-0 w-125 bg-background/95 backdrop-blur-lg border-l border-border shadow-2xl z-70 flex flex-col"
                        >
                            <div className="p-4 border-b">
                                <h2 className="font-semibold">Preview Template</h2>
                                <p className="text-sm text-muted-foreground">Preview with sample data</p>
                            </div>
                            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-900/50">
                                <TemplateCanvas
                                    template={template}
                                    articleData={MOCK_ARTICLE_DATA}
                                    editable={false}
                                    scale={0.35}
                                    zoom={100}
                                    showGrid={false}
                                    onExport={(fn) => { previewExportRef.current = fn; }}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </React.Fragment>
    );
};

export default TemplateEditor;
