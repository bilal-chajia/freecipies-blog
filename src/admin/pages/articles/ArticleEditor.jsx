import { useParams, useSearchParams } from 'react-router-dom';
import { useContentEditor } from './shared';
import EditorLayout from './shared/EditorLayout';
import EditorSidebar from '../../components/EditorSidebar';
import EditorMain from '../../components/EditorMain';

/**
 * Simplified Article Editor - now handles only articles
 * For recipes use RecipeEditor, for roundups use RoundupEditor
 */
const ArticleEditor = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'article';

  const editor = useContentEditor({
    slug,
    contentType: initialType,
  });

  const {
    loading,
    saving,
    isEditMode,
    formData,
    categories,
    authors,
    tags,
    contentJson,
    setContentJson,
    recipeJson,
    setRecipeJson,
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
    handleInputChange,
    handleSave,
    openMediaDialog,
    navigate,
  } = editor;

  // Dynamic title based on content type
  const typeLabels = {
    article: { name: 'Article', emoji: '📝' },
    recipe: { name: 'Recipe', emoji: '🍳' },
    roundup: { name: 'Roundup', emoji: '📚' },
  };

  const typeInfo = typeLabels[formData.type] || typeLabels.article;
  const title = isEditMode ? `Edit ${typeInfo.name}` : `New ${typeInfo.name}`;
  const subtitle = isEditMode
    ? formData.label || 'Untitled'
    : `Create a new ${typeInfo.name.toLowerCase()}`;

  const mainContent = (
    <EditorMain
      formData={formData}
      onInputChange={handleInputChange}
      contentJson={contentJson}
      setContentJson={setContentJson}
      recipeJson={recipeJson}
      setRecipeJson={setRecipeJson}
      roundupJson={roundupJson}
      setRoundupJson={setRoundupJson}
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
      onInputChange={handleInputChange}
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
      backPath="/articles"
      loading={loading}
      mainContent={mainContent}
      sidebarContent={sidebarContent}
      mediaDialogOpen={mediaDialogOpen}
      setMediaDialogOpen={setMediaDialogOpen}
      handleMediaSelect={handleMediaSelect}
      navigate={navigate}
    />
  );
};

export default ArticleEditor;
