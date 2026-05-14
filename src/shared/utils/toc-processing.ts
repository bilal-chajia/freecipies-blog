/**
 * TOC Processing Utilities
 *
 * Handles parsing, hierarchical numbering, and grouping of Table of Contents items.
 */

export interface TocItem {
    id: string;
    text: string;
    level: number;
    num?: string;
    children?: TocItem[];
}

export interface TocProcessingOptions {
    numbering?: boolean;
    maxDepth?: number;
}

/**
 * Parses the raw TOC input (string or array) into a structured TocItem array.
 */
export function parseToc(input: string | TocItem[] | null | undefined, maxDepth = 4): TocItem[] {
    let items: TocItem[] = [];
    if (!input) return [];
    
    if (Array.isArray(input)) {
        items = input;
    } else if (typeof input === "string") {
        try {
            const parsed = JSON.parse(input);
            items = Array.isArray(parsed) ? parsed : [];
        } catch {
            items = [];
        }
    }

    return items.filter((i) => (Number(i.level) || 2) <= maxDepth);
}

/**
 * Applies hierarchical numbering (e.g., 1, 1.1, 1.1.1) to TOC items.
 */
export function applyNumbering(items: TocItem[], enabled = true): TocItem[] {
    if (!enabled) return items;

    let h2 = 0, h3 = 0, h4 = 0;
    
    return items.map((item) => {
        const lvl = item.level || 2;
        let num = "";
        
        if (lvl === 2) {
            h2++; h3 = 0; h4 = 0;
            num = `${h2}`;
        } else if (lvl === 3) {
            h3++; h4 = 0;
            num = `${h2}.${h3}`;
        } else if (lvl === 4) {
            h4++;
            num = `${h2}.${h3}.${h4}`;
        }
        
        return { ...item, num };
    });
}

/**
 * Groups TOC items by their parent H2 to prevent column breaks and provide structure.
 */
export function groupTocByH2(items: TocItem[]): TocItem[] {
    const grouped: TocItem[] = [];
    let currentGroup: TocItem | null = null;

    items.forEach((item) => {
        if (item.level === 2) {
            currentGroup = { ...item, children: [] };
            grouped.push(currentGroup);
        } else if (currentGroup && item.level > 2) {
            currentGroup.children!.push(item);
        } else {
            // Standalone item if no H2 group exists yet
            grouped.push({ ...item, children: [] });
        }
    });

    return grouped;
}
