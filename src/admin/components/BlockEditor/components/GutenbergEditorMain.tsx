/**
 * Gutenberg Editor Main Content
 * 
 * WordPress Block Editor-style main content area.
 * Contains the block editor within a clean canvas.
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { motion } from 'motion/react';
import React from 'react';
import { cn } from '@/lib/utils';
import Editor from '@monaco-editor/react';
import BlockEditor from '..';

type EditorContentType = 'article' | 'recipe' | 'roundup';

type TitleInputProps = {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    containerClassName?: string;
};

type HeadlineInputProps = {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
};

type GutenbergEditorMainProps = {
    formData: {
        type?: EditorContentType;
        [key: string]: unknown;
    };
    onInputChange?: (field: string, value: unknown) => void;
    contentJson: string | unknown[] | { blocks: unknown[] };
    setContentJson: (value: string) => void;
    validateJSON?: (field: string, value: string) => void;
    relatedContext?: React.ComponentProps<typeof BlockEditor>['context'];
    onEditorReady?: (editor: unknown) => void;
    onStructureUpdate?: (payload: unknown) => void;
    onSelectedBlockChange?: (block: unknown) => void;
    forceSelectBlockId?: string | null;
    onForceSelectHandled?: () => void;
    className?: string;
    viewMode?: 'visual' | 'json';
    sidebarOpen?: boolean;
    contentType?: EditorContentType;
    blockEditorProps?: Record<string, unknown>;
    placeholder?: string;
    jsonHeight?: string;
};

/**
 * WordPress-style inline title input
 */
function TitleInput({ value, onChange, placeholder = "Add title", className, containerClassName }: TitleInputProps) {
    return (
        <div className={cn("wp-block-post-title-wrapper", containerClassName)}>
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    'w-full bg-transparent border-none outline-none',
                    'text-4xl md:text-5xl font-bold leading-tight',
                    'placeholder:text-muted-foreground/40',
                    'focus:outline-none focus:ring-0',
                    className
                )}
                style={{
                    fontFamily: 'var(--wp-editor-font-family)',
                }}
            />
        </div>
    );
}

/**
 * WordPress-style inline headline/subtitle input
 */
function HeadlineInput({ value, onChange, placeholder = "Add headline..." }: HeadlineInputProps) {
    return (
        <div className="wp-block-headline-wrapper mt-4">
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className={cn(
                    'w-full bg-transparent border-none outline-none',
                    'text-xl md:text-2xl text-muted-foreground leading-relaxed',
                    'placeholder:text-muted-foreground/30',
                    'focus:outline-none focus:ring-0'
                )}
            />
        </div>
    );
}

/**
 * Content type badge
 */
function ContentTypeBadge({ type }: { type: EditorContentType }) {
    const typeLabels = {
        article: { label: 'Article', emoji: '📝', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
        recipe: { label: 'Recipe', emoji: '🍳', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
        roundup: { label: 'Roundup', emoji: '📚', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
    };

    const info = typeLabels[type] || typeLabels.article;

    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full',
            'text-xs font-medium',
            info.color
        )}>
            <span>{info.emoji}</span>
            {info.label}
        </span>
    );
}

/**
 * Main Gutenberg-style editor content
 */
export default function GutenbergEditorMain({
    formData,
    onInputChange,
    contentJson,
    setContentJson,
    validateJSON,
    relatedContext,
    onEditorReady,
    onStructureUpdate,
    onSelectedBlockChange,
    forceSelectBlockId,
    onForceSelectHandled,
    className,
    viewMode = 'visual',
    sidebarOpen = true,
    contentType,
    blockEditorProps = {},
    placeholder = 'Start writing...',
    jsonHeight = '70vh',
}: GutenbergEditorMainProps) {
    return (
        <>
            <motion.div
                className={cn(
                    'gutenberg-editor-main',
                    'min-h-full',
                    className
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
            >
                {/* Block Editor or JSON Editor */}
                <div className="gutenberg-block-editor">
                    {viewMode === 'json' ? (
                        <div className="border rounded-md overflow-hidden bg-[#1e1e1e] mt-4" style={{ height: jsonHeight }}>
                            <Editor
                                height="100%"
                                defaultLanguage="json"
                                value={typeof contentJson === 'string' ? contentJson : JSON.stringify(contentJson, null, 2)}
                                onChange={(value) => {
                                    const nextValue = value ?? '';
                                    setContentJson(nextValue);
                                    validateJSON?.('content', nextValue);
                                }}
                                theme="vs-dark"
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    wordWrap: 'on',
                                }}
                            />
                        </div>
                    ) : (
                        <BlockEditor
                            value={contentJson}
                            onChange={(value) => {
                                const nextValue = value ?? '';
                                setContentJson(nextValue);
                                validateJSON?.('content', nextValue);
                            }}
                            contentType={contentType || formData.type}
                            isSidebarOpen={sidebarOpen}
                            onStructureUpdate={onStructureUpdate}
                            onSelectedBlockChange={onSelectedBlockChange}
                            forceSelectBlockId={forceSelectBlockId}
                            onForceSelectHandled={onForceSelectHandled}
                            placeholder={placeholder}
                            context={relatedContext}
                            onEditorReady={onEditorReady}
                            {...blockEditorProps}
                        />
                    )}
                </div>
            </motion.div>
        </>
    );
}

// Export sub-components for flexibility
export { TitleInput, HeadlineInput, ContentTypeBadge };
