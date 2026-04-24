import type { BlockAdapter } from '../BlockAdapter';
import type { RelatedContentBlock, RelatedArticleCard } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { parseJsonArray } from '../../utils/json';

export const RelatedContentAdapter: BlockAdapter<RelatedContentBlock> = {
    type: 'related_content',

    toEditor(block) {
        return {
            type: 'relatedContent',
            props: {
                title: block.title || '',
                layout: block.layout || 'grid',
                mode: block.mode || 'manual',
                limit: block.limit || 4,
                recipes: Array.isArray(block.recipes) ? block.recipes : [],
                articles: Array.isArray(block.articles) ? block.articles : [],
                roundups: Array.isArray(block.roundups) ? block.roundups : [],
            },
        };
    },

    fromEditor(block: AppBlock): RelatedContentBlock | null {
        const props = block.props as Record<string, unknown>;

        const recipes: RelatedArticleCard[] = Array.isArray(props.recipes)
            ? (props.recipes as RelatedArticleCard[])
            : parseJsonArray<RelatedArticleCard>(props.recipes);
        const articles: RelatedArticleCard[] = Array.isArray(props.articles)
            ? (props.articles as RelatedArticleCard[])
            : parseJsonArray<RelatedArticleCard>(props.articles);
        const roundups: RelatedArticleCard[] = Array.isArray(props.roundups)
            ? (props.roundups as RelatedArticleCard[])
            : parseJsonArray<RelatedArticleCard>(props.roundups);

        const hasAny = recipes.length > 0 || articles.length > 0 || roundups.length > 0;
        if (!hasAny) return null;

        return {
            type: 'related_content',
            title: props.title ? String(props.title) : undefined,
            layout: (props.layout as 'grid' | 'carousel' | 'list') || 'grid',
            mode: (props.mode as 'manual' | 'auto') || 'manual',
            limit: typeof props.limit === 'number' ? props.limit : undefined,
            recipes: recipes.length > 0 ? recipes : undefined,
            articles: articles.length > 0 ? articles : undefined,
            roundups: roundups.length > 0 ? roundups : undefined,
        };
    },
};
