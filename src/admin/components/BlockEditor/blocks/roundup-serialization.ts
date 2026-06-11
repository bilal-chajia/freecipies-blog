/**
 * Roundup serialization — builds an article's roundup_json payload from the
 * editor's roundupList blocks.
 *
 * Extracted verbatim from useEditorStateManager so the transformation is a
 * single, unit-tested pure function instead of being inlined in the change
 * handler. The output shape and field fallbacks are unchanged.
 */

type RoundupSourceBlock = { type?: string; props?: Record<string, unknown> };

export type RoundupSerializedItem = {
  position: number;
  source_type: unknown;
  article_id: unknown;
  slug: unknown;
  external_url: unknown;
  title: unknown;
  subtitle: unknown;
  description: unknown;
  note: unknown;
  image: unknown;
  recipe: unknown;
  rating: unknown;
  author: unknown;
  category: unknown;
  tags: unknown;
};

export type RoundupPayload = {
  list_type: 'ItemList';
  items: RoundupSerializedItem[];
  group_title?: string;
  group_description?: string;
  show_stats?: boolean;
  visible_badges?: string[];
};

/** Parse a JSON-encoded string[] prop, tolerating absent/malformed values. */
function parseStringArray(value: unknown): string[] | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((k): k is string => typeof k === 'string');
  } catch {
    // ignore
  }
  return undefined;
}

/** Pull the raw item array out of a roundupList block's props. */
function extractRawItems(props: Record<string, unknown> | undefined): unknown[] {
  if (!props) return [];
  if (typeof props.itemsJson === 'string') {
    try {
      const parsed = JSON.parse(props.itemsJson);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // ignore and fall back
    }
  }
  if (Array.isArray(props.items)) return props.items;
  return [];
}

/** Normalize editor roundupList blocks into the roundup_json item list. */
export function buildRoundupItems(blocks: RoundupSourceBlock[]): RoundupSerializedItem[] {
  return blocks
    .filter((block) => block.type === 'roundupList')
    .flatMap((block) => extractRawItems(block.props))
    .map((item: unknown, idx: number) => {
      const it = item as Record<string, unknown>;
      return {
        position: idx + 1,
        source_type:
          it.source_type ??
          (it.external_url ? 'external_recipe' : 'internal_recipe'),
        article_id: it.article_id ?? null,
        slug: it.slug ?? '',
        external_url: it.external_url ?? '',
        title: it.title ?? '',
        subtitle: it.subtitle ?? '',
        description: it.description ?? '',
        note: it.note ?? '',
        image: it.image ?? null,
        recipe: it.recipe ?? null,
        rating: it.rating ?? null,
        author: it.author ?? null,
        category: it.category ?? null,
        tags: it.tags ?? [],
      };
    });
}

/** Read the singleton roundupList block's presentation settings. */
function extractPresentation(
  blocks: RoundupSourceBlock[]
): Pick<RoundupPayload, 'group_title' | 'group_description' | 'show_stats' | 'visible_badges'> {
  const props = blocks.find((b) => b.type === 'roundupList')?.props ?? {};
  const groupTitle = typeof props.title === 'string' ? props.title.trim() : '';
  const groupDescription = typeof props.description === 'string' ? props.description.trim() : '';
  const visibleBadges = parseStringArray(props.visibleBadges);
  return {
    ...(groupTitle ? { group_title: groupTitle } : {}),
    ...(groupDescription ? { group_description: groupDescription } : {}),
    show_stats: props.showStats !== false,
    ...(visibleBadges ? { visible_badges: visibleBadges } : {}),
  };
}

/** Serialize editor roundupList blocks into the roundup_json string. */
export function buildRoundupJson(blocks: RoundupSourceBlock[]): string {
  const hasBlock = blocks.some((b) => b.type === 'roundupList');
  const payload: RoundupPayload = {
    list_type: 'ItemList',
    items: buildRoundupItems(blocks),
    ...(hasBlock ? extractPresentation(blocks) : {}),
  };
  return JSON.stringify(payload, null, 2);
}
