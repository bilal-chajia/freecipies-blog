import {
    Image as ImageIcon,
    Video,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Heading6,
    AlertTriangle,
    HelpCircle,
    Utensils,
    LayoutGrid,
    Table,
    FileText,
    Pilcrow,
    Quote,
    Minus,
    SplitSquareVertical
} from 'lucide-react';
import type { BlockIconMap } from './types';

export const MAX_STRUCTURE_LABEL = 48;

export const CUSTOM_BLOCK_TYPES = new Set<string>([
    'title',
    'headline',
    'customImage',
    'alert',
    'divider',
    'faqSection',
    'beforeAfter',
    'simpleTable',
    'video',
    'relatedContent',
    'featuredImage',
    'mainRecipe',
    'roundupList',
]);

export const BLOCK_TYPE_ICONS: BlockIconMap = {
    heading: (level?: number) => {
        switch (level) {
            case 2: return Heading2;
            case 3: return Heading3;
            case 4: return Heading4;
            case 5: return Heading5;
            case 6: return Heading6;
            default: return Heading1;
        }
    },
    bulletListItem: List,
    numberedListItem: ListOrdered,
    alert: AlertTriangle,
    faqSection: HelpCircle,
    customImage: ImageIcon,
    video: Video,
    divider: Minus,
    simpleTable: Table,
    relatedContent: LayoutGrid,
    beforeAfter: SplitSquareVertical,
    blockquote: Quote,
    paragraph: Pilcrow,
    default: FileText,
};
