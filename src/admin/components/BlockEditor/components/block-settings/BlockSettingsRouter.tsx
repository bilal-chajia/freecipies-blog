import RecipeSettingsSidebar from './RecipeSettingsSidebar';
import RoundupListSettings from './RoundupListSettings';
import HeadingSettings from './HeadingSettings';
import ParagraphSettings from './ParagraphSettings';
import TitleHeadlineSettings from './TitleHeadlineSettings';
import AlertSettings from './AlertSettings';
import DividerSettings from './DividerSettings';
import FAQSettings from './FAQSettings';
import VideoSettings from './VideoSettings';
import TableSettings from './TableSettings';
import ImageSettings from './ImageSettings';
import BeforeAfterSettings from './BeforeAfterSettings';
import FeaturedImageSettings from './FeaturedImageSettings';
import RelatedContentSettings from './RelatedContentSettings';

interface BlockSettingsRouterProps {
  selectedBlock: any;
  updateProps: (props: Record<string, unknown>) => void;
  recipeData?: any;
  onRecipeChange?: (recipe: any) => void;
  relatedContext?: any;
  children?: React.ReactNode;
}

export function BlockSettingsRouter({
  selectedBlock,
  updateProps,
  recipeData,
  onRecipeChange,
  relatedContext,
  children,
}: BlockSettingsRouterProps) {
  if (selectedBlock.type === 'mainRecipe') {
    return <RecipeSettingsSidebar recipe={recipeData} setRecipe={onRecipeChange} />;
  }

  if (selectedBlock.type === 'roundupList') {
    return <RoundupListSettings selectedBlock={selectedBlock} updateProps={updateProps} />;
  }

  if (selectedBlock.type === 'heading') {
    return <HeadingSettings selectedBlock={selectedBlock} updateProps={updateProps} />;
  }

  if (selectedBlock.type === 'paragraph') {
    return <ParagraphSettings selectedBlock={selectedBlock} updateProps={updateProps} />;
  }

  if (selectedBlock.type === 'title') {
    return <TitleHeadlineSettings selectedBlock={selectedBlock} updateProps={updateProps} label="Title" />;
  }

  if (selectedBlock.type === 'headline') {
    return <TitleHeadlineSettings selectedBlock={selectedBlock} updateProps={updateProps} label="Headline" />;
  }

  if (selectedBlock.type === 'alert') {
    return <AlertSettings selectedBlock={selectedBlock} updateProps={updateProps} />;
  }

  if (selectedBlock.type === 'divider') {
    return <DividerSettings selectedBlock={selectedBlock} updateProps={updateProps} />;
  }

  if (selectedBlock.type === 'faqSection') {
    return <FAQSettings selectedBlock={selectedBlock} updateProps={updateProps} />;
  }

  if (selectedBlock.type === 'video') {
    return <VideoSettings selectedBlock={selectedBlock} updateProps={updateProps} />;
  }

  if (selectedBlock.type === 'simpleTable') {
    return <TableSettings selectedBlock={selectedBlock} />;
  }

  if (selectedBlock.type === 'customImage') {
    return <ImageSettings selectedBlock={selectedBlock} updateProps={updateProps} />;
  }

  if (selectedBlock.type === 'beforeAfter') {
    return <BeforeAfterSettings selectedBlock={selectedBlock} updateProps={updateProps} />;
  }

  if (selectedBlock.type === 'featuredImage') {
    return <FeaturedImageSettings selectedBlock={selectedBlock} updateProps={updateProps} />;
  }

  if (selectedBlock.type === 'relatedContent') {
    return (
      <RelatedContentSettings
        selectedBlock={selectedBlock}
        relatedContext={relatedContext}
        updateProps={updateProps}
      />
    );
  }

  return <>{children}</>;
}

export default BlockSettingsRouter;
