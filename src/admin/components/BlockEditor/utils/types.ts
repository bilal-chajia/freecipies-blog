import type { LucideIcon } from 'lucide-react';
import type { InlineContent } from '@blocknote/core';

export type InlineNode = InlineContent<any, any>;

export interface BlockIconMap {
    [key: string]: LucideIcon | ((level?: number) => LucideIcon);
    default: LucideIcon;
}

export interface MarkdownLinkMatch {
    start: number;
    end: number;
    label: string;
}

export interface ParsedStyles {
    nodes: InlineNode[];
    hasStyle: boolean;
}
