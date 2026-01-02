/**
 * Block Editor Components
 * 
 * Core infrastructure components for WordPress Block Editor-style UI.
 * Re-exports all components for easy importing.
 */

// Core block components
export { default as BlockWrapper, useBlockWrapperProps } from './BlockWrapper';

export {
    default as BlockToolbar,
    ToolbarButton,
    ToolbarSeparator,
    ToolbarGroup,
    BlockTypeIndicator,
    BlockMover,
    BlockMoreMenu,
} from './BlockToolbar';

export {
    default as BlockPlaceholder,
    PlaceholderButton,
    PlaceholderInput,
    MediaPlaceholder,
    EmbedPlaceholder,
} from './BlockPlaceholder';

// Layout components
export { default as BlockInserter } from './BlockInserter';
export { default as SettingsSidebar, SidebarSection } from './SettingsSidebar';
export {
    default as GutenbergEditorLayout,
    ContentCanvas,
    useGutenbergLayout
} from './GutenbergEditorLayout';
export {
    default as DocumentSettings,
    SettingsSection,
    StatusSection,
    TagsSectionContent,
    SEOSectionContent,
    MediaSectionContent,
    ExcerptsSectionContent,
} from './DocumentSettings';
export { default as BlockSettings } from './BlockSettings';

export {
    default as GutenbergEditorMain,
    TitleInput,
    HeadlineInput,
    ContentTypeBadge,
} from './GutenbergEditorMain';
