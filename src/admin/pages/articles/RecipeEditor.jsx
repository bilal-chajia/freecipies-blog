import { useParams } from 'react-router-dom';
import { useContentEditor } from './shared';
import EditorLayout from './shared/EditorLayout';
import EditorSidebar from '../../components/EditorSidebar';
import RecipeEditorMain from './RecipeEditorMain';

/**
 * Dedicated editor for Recipe content type
 * Uses shared hook and layout, with recipe-specific main area
 */
const RecipeEditor = () => {
    const { slug } = useParams();

    const editor = useContentEditor({
        slug,
        contentType: 'recipe',
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
        recipeJson,
        setRecipeJson,
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

    const title = isEditMode ? 'Edit Recipe' : 'New Recipe';
    const subtitle = isEditMode
        ? formData.label || 'Untitled'
        : 'Create a new recipe with ingredients and instructions';

    const mainContent = (
        <RecipeEditorMain
            formData={formData}
            onInputChange={handleInputChange}
            contentJson={contentJson}
            setContentJson={setContentJson}
            recipeJson={recipeJson}
            setRecipeJson={setRecipeJson}
            faqsJson={faqsJson}
            setFaqsJson={setFaqsJson}
            jsonErrors={jsonErrors}
            validateJSON={validateJSON}
            useVisualEditor={useVisualEditor}
            setUseVisualEditor={setUseVisualEditor}
            isValidJSON={isValidJSON}
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
            backPath="/recipes"
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
            recipeJson={recipeJson}
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

export default RecipeEditor;
