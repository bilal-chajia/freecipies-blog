import { useParams } from 'react-router-dom';
import { useContentEditor } from './shared';
import EditorLayout from './shared/EditorLayout';
import EditorSidebar from '../../components/EditorSidebar';
import RoundupEditorMain from './RoundupEditorMain';

/**
 * Dedicated editor for Roundup content type
 * Uses shared hook and layout, with roundup-specific main area
 */
const RoundupEditor = () => {
    const { slug } = useParams();

    const editor = useContentEditor({
        slug,
        contentType: 'roundup',
    });

    const {
        loading,
        saving,
        isEditMode,
        formData,
        imagesData,
        categories,
        authors,
        tags,
        contentJson,
        setContentJson,
        roundupJson,
        setRoundupJson,
        faqsJson,
        setFaqsJson,
        jsonErrors,
        validateJSON,
        useVisualEditor,
        setUseVisualEditor,
        isValidJSON,
        mediaDialogOpen,
        setMediaDialogOpen,
        handleMediaSelect,
        handleImageRemove,
        handleInputChange,
        handleSave,
        openMediaDialog,
        navigate,
    } = editor;

    const title = isEditMode ? 'Edit Roundup' : 'New Roundup';
    const subtitle = isEditMode
        ? formData.label || 'Untitled'
        : 'Create a curated list of recipes or articles';

    const categorySlug = categories.find((category) => category.id === formData.categoryId)?.slug || null;
    const tagSlugs = tags
        .filter((tag) => formData.selectedTags?.includes(tag.id))
        .map((tag) => tag.slug);
    const relatedContext = {
        categorySlug,
        tagSlugs,
        currentSlug: formData.slug,
    };

    const mainContent = (
        <RoundupEditorMain
            formData={formData}
            onInputChange={handleInputChange}
            contentJson={contentJson}
            setContentJson={setContentJson}
            roundupJson={roundupJson}
            setRoundupJson={setRoundupJson}
            faqsJson={faqsJson}
            setFaqsJson={setFaqsJson}
            jsonErrors={jsonErrors}
            validateJSON={validateJSON}
            useVisualEditor={useVisualEditor}
            setUseVisualEditor={setUseVisualEditor}
            isValidJSON={isValidJSON}
            relatedContext={relatedContext}
        />
    );

    const sidebarContent = (
        <EditorSidebar
            formData={formData}
            imagesData={imagesData}
            onInputChange={handleInputChange}
            onImageRemove={handleImageRemove}
            onSave={handleSave}
            saving={saving}
            isEditMode={isEditMode}
            categories={categories}
            authors={authors}
            tags={tags}
            onMediaDialogOpen={openMediaDialog}
        />
    );

    return (
        <EditorLayout
            title={title}
            subtitle={subtitle}
            backPath="/roundups"
            loading={loading}
            mainContent={mainContent}
            sidebarContent={sidebarContent}
            mediaDialogOpen={mediaDialogOpen}
            setMediaDialogOpen={setMediaDialogOpen}
            handleMediaSelect={handleMediaSelect}
            navigate={navigate}
            // Preview props
            formData={formData}
            contentJson={contentJson}
            roundupJson={roundupJson}
            imagesData={imagesData}
            categories={categories}
            authors={authors}
            // Topbar props
            onInputChange={handleInputChange}
            onSave={handleSave}
            saving={saving}
            isEditMode={isEditMode}
        />
    );
};

export default RoundupEditor;
