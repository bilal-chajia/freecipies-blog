import { useEffect, useMemo, useState } from 'react';
import { Image, Plus, Search, Trash2, ChevronUp, ChevronDown, MoreHorizontal, Settings2, Info, LayoutList } from 'lucide-react';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { articlesAPI } from '../../../../services/api';
import { getImageSlot } from '@shared/utils';
import { getBestVariantUrl } from '@shared/types/images';
import { parseJsonArray } from './helpers';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/ui/collapsible';
import { Badge } from '@/ui/badge';
import { SettingsSection } from '../DocumentSettings';
import type { RoundupItemRecipeSnapshot } from '@modules/articles/types/roundups.types';
import {
    ROUNDUP_BADGES,
    ROUNDUP_BADGE_GROUP_LABELS,
    DEFAULT_ROUNDUP_BADGES,
    type RoundupBadgeGroup,
} from '@modules/articles/utils/roundup-badges';
import {
    parseRoundup,
    serializeRoundup,
    addItem as addRoundupItem,
    removeItem as removeRoundupItem,
    moveItem as moveRoundupItem,
    updateItemField as updateRoundupItemField,
    clearItems,
    setGroupTitle,
    setGroupDescription,
    setShowStats,
    toggleBadge as toggleRoundupBadge,
    type RoundupEditItem,
    type RoundupEditModel,
} from '../../blocks/roundup-edit';

type JsonRecord = Record<string, unknown>;

type RoundupListItem = {
    source_type: 'internal_recipe';
    article_id: string | number;
    slug?: string;
    title: string;
    subtitle?: string;
    description?: string;
    note?: string;
    image?: ReturnType<typeof getImageSlot>;
    recipe?: RoundupItemRecipeSnapshot;
    rating?: JsonRecord | null;
    author?: JsonRecord | null;
    category?: JsonRecord | null;
    tags?: unknown[];
};

type SearchResultItem = {
    id: string | number;
    slug?: string;
    headline?: string;
    label?: string;
    subtitle?: string;
    short_description?: string;
    images_json?: string | null;
    cached_recipe_json?: string | JsonRecord | null;
    cached_rating_json?: string | JsonRecord | null;
    cached_author_json?: string | JsonRecord | null;
    cached_category_json?: string | JsonRecord | null;
    cached_tags_json?: unknown[] | string | null;
};

type RoundupListSettingsProps = {
    /** Current roundup_json (string or already-parsed object). */
    roundup: unknown;
    /** Persist the next roundup_json (single source of truth). */
    onRoundupChange: (next: string) => void;
};

type RoundupItemField = 'title' | 'subtitle' | 'note';

const BADGE_GROUPS = (['value', 'nutrition', 'classification', 'diet'] as RoundupBadgeGroup[]).map(
    (group) => ({
        group,
        label: ROUNDUP_BADGE_GROUP_LABELS[group],
        badges: ROUNDUP_BADGES.filter((b) => b.group === group),
    })
);

const parseJsonObject = (value: unknown): JsonRecord => {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value as JsonRecord;
    if (typeof value !== 'string') return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as JsonRecord : {};
    } catch {
        return {};
    }
};

const numOrNull = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;
const strOrNull = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;

/** Capture the full compact recipe snapshot the badge catalog can render from. */
const buildRecipeSnapshot = (recipe: JsonRecord): RoundupItemRecipeSnapshot => {
    const raw = recipe.badges;
    const badges =
        raw && typeof raw === 'object' && !Array.isArray(raw)
            ? (Object.fromEntries(
                  Object.entries(raw as JsonRecord).filter(([, v]) => typeof v === 'boolean')
              ) as Record<string, boolean>)
            : null;
    return {
        total_time_minutes: numOrNull(recipe.total_time_minutes),
        prep_time_minutes: numOrNull(recipe.prep_time_minutes),
        cook_time_minutes: numOrNull(recipe.cook_time_minutes),
        difficulty: strOrNull(recipe.difficulty),
        servings: numOrNull(recipe.servings) ?? strOrNull(recipe.servings),
        calories_per_serving: numOrNull(recipe.calories_per_serving),
        protein_g: numOrNull(recipe.protein_g),
        carbohydrate_g: numOrNull(recipe.carbohydrate_g),
        fat_g: numOrNull(recipe.fat_g),
        recipe_category: strOrNull(recipe.recipe_category),
        recipe_cuisine: strOrNull(recipe.recipe_cuisine),
        cooking_method: strOrNull(recipe.cooking_method),
        estimated_cost: strOrNull(recipe.estimated_cost),
        badges,
    };
};

/**
 * RoundupListSettings
 *
 * Managed block-level settings for the RoundupListBlock.
 * Handles recipe search, bulk addition, and individual item editorial notes.
 */
function RoundupListSettings({
    roundup,
    onRoundupChange,
}: RoundupListSettingsProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [openItemId, setOpenItemId] = useState<string | number | null>(null);

    // roundup_json is the single source of truth. Parse it into an editable
    // model, apply one edit via the pure helpers, and persist the serialized
    // result through onRoundupChange.
    const model = useMemo<RoundupEditModel>(() => parseRoundup(roundup), [roundup]);
    const items = model.items as RoundupListItem[];
    const visibleBadges = model.visible_badges ?? DEFAULT_ROUNDUP_BADGES;
    const showStats = model.show_stats !== false;

    const commit = (next: RoundupEditModel) => onRoundupChange(serializeRoundup(next));

    const toggleBadge = (key: string) =>
        // Seed with the resolved badges so toggling from the default set (when
        // visible_badges is unset) removes/keeps rather than starting from [].
        commit(toggleRoundupBadge({ ...model, visible_badges: visibleBadges }, key));

    // Search articles (recipes only)
    useEffect(() => {
        const term = searchTerm.trim();
        if (term.length < 2) {
            setResults([]);
            return undefined;
        }
        let is_active = true;
        const timeout = setTimeout(async () => {
            setLoading(true);
            setError('');
            try {
                const response = await articlesAPI.getAll({
                    search: term,
                    type: 'recipe',
                    status: 'all',
                    limit: 8,
                });
                const data = response.data?.data || response.data || [];
                if (is_active) {
                    setResults(Array.isArray(data) ? data as SearchResultItem[] : []);
                }
            } catch {
                if (is_active) {
                    setResults([]);
                    setError('Search failed.');
                }
            } finally {
                if (is_active) setLoading(false);
            }
        }, 300);

        return () => {
            is_active = false;
            clearTimeout(timeout);
        };
    }, [searchTerm]);

    const buildItem = (item: SearchResultItem): RoundupListItem => {
        const headline = item.headline || item.slug || '';
        const image = getImageSlot(item.images_json, 'thumbnail') || getImageSlot(item.images_json, 'hero');
        const recipe = parseJsonObject(item.cached_recipe_json);
        const rating = parseJsonObject(item.cached_rating_json);
        const author = parseJsonObject(item.cached_author_json);
        const category = parseJsonObject(item.cached_category_json);
        const tags = Array.isArray(item.cached_tags_json)
            ? item.cached_tags_json
            : parseJsonArray(item.cached_tags_json);

        return {
            source_type: 'internal_recipe',
            article_id: item.id,
            slug: item.slug,
            title: headline,
            subtitle: item.subtitle || '',
            description: item.short_description || '',
            note: '',
            image,
            recipe: buildRecipeSnapshot(recipe),
            rating: Object.keys(rating).length ? rating : null,
            author: Object.keys(author).length ? author : null,
            category: Object.keys(category).length ? category : null,
            tags,
        };
    };

    const addItem = (item: SearchResultItem) => {
        if (!item?.id) return;
        // addRoundupItem is idempotent on article_id; the search rows also render
        // disabled via `isAdded`, so several recipes can be added from one search.
        commit(addRoundupItem(model, buildItem(item) as RoundupEditItem));
    };

    const removeItem = (articleIdValue: string | number) =>
        commit(removeRoundupItem(model, articleIdValue));

    const moveItem = (index: number, direction: -1 | 1) =>
        commit(moveRoundupItem(model, index, direction));

    const updateItemField = (index: number, field: RoundupItemField, value: string) =>
        commit(updateRoundupItemField(model, index, field, value));

    return (
        <div className="relative w-full">
            {/* Group Info */}
            <SettingsSection title="Group Info" icon={Info} defaultOpen>
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Group Title (Optional)</Label>
                        <Input
                            className="h-8 text-sm"
                            value={model.group_title || ''}
                            onChange={(e) => commit(setGroupTitle(model, e.target.value))}
                            placeholder="e.g. Summer Salads"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Group Description</Label>
                        <Textarea
                            className="text-xs min-h-[80px] resize-none"
                            value={model.group_description || ''}
                            onChange={(e) => commit(setGroupDescription(model, e.target.value))}
                            placeholder="Explain why these recipes belong together..."
                        />
                    </div>
                </div>
            </SettingsSection>

            {/* Manage Items */}
            <SettingsSection
                title="Curated Recipes"
                icon={LayoutList}
                defaultOpen
                className="bg-muted/5"
            >
                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px] font-mono">
                            {items.length} Items Selected
                        </Badge>
                        {items.length > 0 && (
                             <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => commit(clearItems(model))}
                             >
                                <Trash2 className="h-3 w-3 mr-1" /> Clear All
                             </Button>
                        )}
                    </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        className="pl-8 h-9 text-xs"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search recipes to add..."
                    />
                </div>

                {/* Search Results */}
                {results.length > 0 && (
                    <div className="border rounded-xl bg-muted/30 overflow-hidden divide-y max-h-48 overflow-y-auto">
                        {results.map((item) => {
                            const isAdded = items.some((ex) => ex.article_id === item.id);
                            return (
                                <div key={item.id} className="p-2 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-muted overflow-hidden shrink-0">
                                        <img
                                            src={getBestVariantUrl(getImageSlot(item.images_json, 'thumbnail') || undefined) || undefined}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-bold truncate capitalize leading-tight">{item.headline || item.slug}</p>
                                        <p className="text-[9px] text-muted-foreground">ID: {item.id}</p>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={isAdded}
                                        onClick={() => addItem(item)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Selected List */}
                <div className="space-y-2">
                    {items.length === 0 ? (
                        <div className="py-8 text-center border-2 border-dashed rounded-xl bg-muted/10">
                            <p className="text-[11px] text-muted-foreground">No recipes curated yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {items.map((item, index) => (
                                <Collapsible
                                    key={`${item.article_id}-${index}`}
                                    open={openItemId === item.article_id}
                                    onOpenChange={(open) => setOpenItemId(open ? item.article_id : null)}
                                    className="border rounded-xl bg-card overflow-hidden group shadow-sm"
                                >
                                    <div className="p-2 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                                            <img
                                                src={item.image ? getBestVariantUrl(item.image) || undefined : undefined}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold truncate leading-tight">{item.title}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] text-muted-foreground font-mono">#{index + 1}</span>
                                                {item.recipe?.total_time_minutes && (
                                                    <span className="text-[9px] text-muted-foreground">· {item.recipe.total_time_minutes}m</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveItem(index, -1); }} disabled={index === 0}>
                                                <ChevronUp className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); moveItem(index, 1); }} disabled={index === items.length - 1}>
                                                <ChevronDown className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        <div className="flex items-center shrink-0">
                                            <CollapsibleTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                                    <Settings2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </CollapsibleTrigger>

                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={(e) => { e.stopPropagation(); removeItem(item.article_id); }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <CollapsibleContent className="px-3 pb-3 pt-1 space-y-3 border-t bg-muted/5">
                                        <div className="space-y-2 mt-2">
                                            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Override Title</Label>
                                            <Input
                                                className="h-7 text-[11px]"
                                                value={item.title}
                                                onChange={(e) => updateItemField(index, 'title', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Subtitle / Teaser</Label>
                                            <Input
                                                className="h-7 text-[11px]"
                                                value={item.subtitle}
                                                onChange={(e) => updateItemField(index, 'subtitle', e.target.value)}
                                                placeholder="Short catchy hook..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Editorial Note</Label>
                                            <Textarea
                                                className="text-[11px] min-h-[80px]"
                                                value={item.note}
                                                onChange={(e) => updateItemField(index, 'note', e.target.value)}
                                                placeholder="Why is this recipe a top choice? Mention your personal experience..."
                                            />
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            </SettingsSection>

            {/* Display Options */}
            <SettingsSection title="Display Options" icon={Settings2}>
                <div className="space-y-4 pt-1">
                     <div className="flex items-center justify-between">
                        <Label className="text-xs">Show Recipe Badges</Label>
                        <input
                            type="checkbox"
                            checked={showStats}
                            onChange={(e) => commit(setShowStats(model, e.target.checked))}
                            className="rounded border-border h-4 w-4"
                        />
                     </div>
                     <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Choose which badges appear on each recipe card. Badges with no data for a given recipe are hidden automatically.
                     </p>

                     {showStats && (
                        <div className="space-y-3">
                            {BADGE_GROUPS.map(({ group, label, badges }) => (
                                <div key={group} className="space-y-1.5">
                                    <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                                        {label}
                                    </Label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        {badges.map((badge) => {
                                            const checked = visibleBadges.includes(badge.key);
                                            return (
                                                <label
                                                    key={badge.key}
                                                    className="flex items-center gap-2 text-[11px] cursor-pointer rounded-md px-1.5 py-1 hover:bg-muted/40"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleBadge(badge.key)}
                                                        className="rounded border-border h-3.5 w-3.5"
                                                    />
                                                    <span className="truncate">{badge.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                     )}
                </div>
            </SettingsSection>
        </div>
    );
}

export default RoundupListSettings;
