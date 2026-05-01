type RoundupBlock = {
    type?: string;
    title?: string;
    slug?: string;
    note?: string;
    image?: {
        url?: string;
        variants?: {
            sm?: {
                url?: string;
            };
        };
    };
    items?: RoundupBlock[];
};

type ArticleMetadata = {
    headline?: string;
    shortDescription?: string;
};

type RoundupListItem = {
    "@type": "ListItem";
    position: number;
    name: string;
    url?: string;
    image?: string;
    description?: string;
};

type RoundupItemListSchema = {
    "@context": "https://schema.org";
    "@type": "ItemList";
    name: string;
    description: string;
    numberOfItems: number;
    itemListElement: RoundupListItem[];
};

export function generateRoundupItemList(
    blocks: unknown,
    articleMetadata: ArticleMetadata = {}
): RoundupItemListSchema | null {
    if (!Array.isArray(blocks)) return null;

    // Stored content_json uses one canonical roundup_item block per item.
    const items: RoundupBlock[] = [];

    const contentBlocks = blocks as RoundupBlock[];

    contentBlocks.forEach((block) => {
        if (!block || typeof block !== 'object') return;
        if (block.type === 'roundup_item') {
            items.push(block);
        } else if (block.type === 'roundupList' && Array.isArray(block.items)) {
            block.items.forEach((item: RoundupBlock) => {
                items.push(item);
            });
        }
    });

    if (items.length === 0) return null;

    const itemListElement = items.map((item, index) => {
        const itemLd: RoundupListItem = {
            "@type": "ListItem",
            "position": index + 1,
            "name": item.title || "Untitled Recipe",
        };

        if (item.slug) {
            itemLd.url = `/recipes/${item.slug}`;
        }

        if (item.image?.url || item.image?.variants?.sm?.url) {
            itemLd.image = item.image.variants?.sm?.url || item.image.url;
        }

        if (item.note) {
            itemLd.description = item.note;
        }

        return itemLd;
    });

    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": articleMetadata.headline || "Recipe Roundup",
        "description": articleMetadata.shortDescription || "",
        "numberOfItems": items.length,
        "itemListElement": itemListElement
    };
}
