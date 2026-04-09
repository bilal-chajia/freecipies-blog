/**
 * SEO Helpers for Article Content
 */

/**
 * Generates an ItemList Schema.org object from roundup blocks.
 * 
 * @param {Array} blocks - Array of content blocks from content_json
 * @param {Object} articleMetadata - Metadata for the main article (url, headline)
 * @returns {Object|null} Valid ItemList JSON-LD or null
 */
export function generateRoundupItemList(blocks, articleMetadata = {}) {
    if (!Array.isArray(blocks)) return null;

    // Filter and flatten items from all roundup_list blocks
    const items = [];
    
    blocks.forEach((block) => {
        if (block.type === 'roundup_list' && Array.isArray(block.items)) {
            block.items.forEach((item) => {
                items.push(item);
            });
        }
    });

    if (items.length === 0) return null;

    const itemListElement = items.map((item, index) => {
        const itemLd = {
            "@type": "ListItem",
            "position": index + 1,
            "name": item.title || "Untitled Recipe",
        };

        if (item.slug) {
            // Internal link logic - ideally we'd have the full base URL here
            // For now, we use a relative path or placeholder
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
