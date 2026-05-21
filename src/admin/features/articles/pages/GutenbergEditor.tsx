import React from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { GutenbergEditorShell } from './shared';

/**
 * Unified Gutenberg Editor Page
 * 
 * Route-driven dynamic page that unifies article, recipe, and roundup editor pages.
 * Fully DRY, zero code duplication.
 */
export default function GutenbergEditor() {
    const { slug } = useParams();
    const { pathname } = useLocation();

    // Dynamically resolve contentType, backPath and titleLabel based on current URL path
    let contentType: 'article' | 'recipe' | 'roundup' = 'article';
    let backPath = '/articles';
    let titleLabel = 'Article';

    if (pathname.includes('/recipes')) {
        contentType = 'recipe';
        backPath = '/recipes';
        titleLabel = 'Recipe';
    } else if (pathname.includes('/roundups')) {
        contentType = 'roundup';
        backPath = '/roundups';
        titleLabel = 'Roundup';
    }

    return (
        <GutenbergEditorShell
            slug={slug}
            contentType={contentType}
            backPath={backPath}
            titleLabel={titleLabel}
        />
    );
}
