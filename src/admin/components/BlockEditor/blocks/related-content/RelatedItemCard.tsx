import type { RelatedContentType, RelatedGroup, RelatedLayout, TypedRelatedItem } from './RelatedContentBlock.types';
import { resolveThumbnail, buildMeta, getLayoutClasses, normalizeCategoryColor, TYPE_LABEL_SINGULAR } from './utils';

interface RelatedItemCardProps {
    item: TypedRelatedItem;
    groupLabel: string;
    isList: boolean;
    isCarousel: boolean;
}

export default function RelatedItemCard({ item, groupLabel, isList, isCarousel }: RelatedItemCardProps) {
    const { url, srcSet, style } = resolveThumbnail(item.thumbnail);
    const metaParts = buildMeta(item, item.__type);

    if (isList) {
        return (
            <div
                className="flex items-center gap-4 py-3 px-3 border-b border-border last:border-b-0 transition-colors hover:bg-accent/30"
                style={{ borderRadius: '8px' }}
            >
                <div className="w-[90px] h-[90px] flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                    {url ? (
                        <img
                            src={url}
                            alt={item.headline || ''}
                            srcSet={srcSet || undefined}
                            sizes="90px"
                            loading="lazy"
                            className="w-full h-full object-cover"
                            style={style}
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50" />
                    )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                    <div
                        className="text-[11px] font-bold uppercase tracking-wider"
                        style={{ color: normalizeCategoryColor(item.categoryColor) }}
                    >
                        {item.categoryName || TYPE_LABEL_SINGULAR[item.__type] || groupLabel}
                    </div>
                    <div className="text-sm font-bold text-foreground line-clamp-2">
                        {item.headline}
                    </div>
                    {metaParts.length > 0 && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            {metaParts.map((part, i) => (
                                <span key={i} className="flex items-center gap-1.5">
                                    {i > 0 && <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />}
                                    {part}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Grid / Carousel card
    return (
        <div
            className={`flex flex-col h-full border border-border overflow-hidden bg-card shadow-sm transition hover:shadow-md ${isCarousel ? 'snap-start' : ''}`}
            style={{ borderRadius: '12px' }}
        >
            <div className="relative w-full overflow-hidden bg-muted" style={{ paddingTop: isCarousel ? '62.5%' : '100%' }}>
                {url ? (
                    <img
                        src={url}
                        alt={item.headline || ''}
                        srcSet={srcSet || undefined}
                        sizes={isCarousel ? '260px' : '(max-width: 768px) 50vw, 280px'}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={style}
                    />
                ) : (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-muted to-muted/50" />
                )}
            </div>
            <div className="flex flex-col flex-grow p-4">
                <div
                    className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: normalizeCategoryColor(item.categoryColor) }}
                >
                    {item.categoryName || TYPE_LABEL_SINGULAR[item.__type] || groupLabel}
                </div>
                <div className="text-sm font-bold text-foreground line-clamp-2 mb-2">
                    {item.headline}
                </div>
                {metaParts.length > 0 && (
                    <div className="mt-auto pt-2 border-t border-border flex items-center gap-1.5 text-xs text-muted-foreground">
                        {metaParts.map((part, i) => (
                            <span key={i} className="flex items-center gap-1.5">
                                {i > 0 && <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />}
                                {part}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

/** Render grouped preview cards for a layout. */
export function renderPreviewCards(groupsList: RelatedGroup[], layoutValue: RelatedLayout) {
    const { listClass, isList, isCarousel } = getLayoutClasses(layoutValue);
    return groupsList.map((group) => (
        <div key={group.type} className="space-y-2">
            {groupsList.length > 1 && (
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    {group.label}
                </div>
            )}
            <div className={listClass}>
                {group.items.map((item) => (
                    <RelatedItemCard
                        key={item.id}
                        item={item}
                        groupLabel={group.label}
                        isList={isList}
                        isCarousel={isCarousel}
                    />
                ))}
            </div>
        </div>
    ));
}
