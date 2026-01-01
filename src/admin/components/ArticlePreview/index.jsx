/**
 * ArticlePreview Component
 * 
 * Renders a real-time preview of the article as it would appear on the public site.
 * Opens in a floating panel (Sheet) from the right side of the screen.
 */

import { useState, useMemo } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/ui/sheet.jsx';
import { Button } from '@/ui/button.jsx';
import { Badge } from '@/ui/badge.jsx';
import { ScrollArea } from '@/ui/scroll-area.jsx';
import { Separator } from '@/ui/separator.jsx';
import {
    Monitor,
    Tablet,
    Smartphone,
    Calendar,
    User,
    Tag,
    Clock
} from 'lucide-react';
import { getBestVariantUrl, getSrcSet } from '@shared/types/images';

const DEVICE_WIDTHS = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
};

const resolveSlotImage = (slot) => {
    if (!slot) return { url: '', srcSet: '' };
    const url = slot.variants ? getBestVariantUrl(slot) : slot.url;
    const srcSet = slot.variants ? getSrcSet(slot) : '';
    return { url: url || '', srcSet: srcSet || '' };
};

const sanitizeHref = (href) => {
    if (!href) return '';
    if (href.startsWith('/') || href.startsWith('#')) return href;
    try {
        const url = new URL(href);
        if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
            return href;
        }
    } catch {
        return '';
    }
    return '';
};

const renderInlineMarkdown = (text = '') => {
    const source = String(text || '');
    if (!source) return '';
    const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(source)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', value: source.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'link', label: match[1], href: match[2] });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < source.length) {
        parts.push({ type: 'text', value: source.slice(lastIndex) });
    }

    if (parts.length === 0) return source;

    return parts.map((part, idx) => {
        if (part.type === 'text') return part.value;
        const href = sanitizeHref(part.href);
        if (!href) return part.label;
        const isExternal = href.startsWith('http');
        return (
            <a
                key={idx}
                href={href}
                className="text-primary underline underline-offset-2"
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noreferrer noopener' : undefined}
            >
                {part.label}
            </a>
        );
    });
};

function BeforeAfterPreview({ block }) {
    const [position, setPosition] = useState(50);
    const [dragging, setDragging] = useState(false);

    const before = block.before;
    const after = block.after;
    const beforeImage = resolveSlotImage(before);
    const afterImage = resolveSlotImage(after);
    const beforeLabel = before?.label || 'Before';
    const afterLabel = after?.label || 'After';

    const handleMove = (event) => {
        if (event.pointerType === 'mouse' || dragging) {
            const rect = event.currentTarget.getBoundingClientRect();
            const raw = ((event.clientX - rect.left) / rect.width) * 100;
            setPosition(Math.min(100, Math.max(0, raw)));
        }
    };

    if (!before || !after) return null;

    if (block.layout === 'side_by_side') {
        return (
            <div className="my-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {[{ image: beforeImage, label: beforeLabel, alt: before.alt }, { image: afterImage, label: afterLabel, alt: after.alt }].map((item, idx) => (
                    <figure key={idx} className="space-y-2">
                        {item.image.url ? (
                            <img
                                src={item.image.url}
                                srcSet={item.image.srcSet || undefined}
                                sizes="(max-width: 768px) 100vw, 50vw"
                                alt={item.alt || ''}
                                className="w-full aspect-video object-cover rounded-lg"
                            />
                        ) : (
                            <div className="w-full aspect-video rounded-lg bg-muted" />
                        )}
                        <figcaption className="text-xs uppercase tracking-widest text-muted-foreground">
                            {item.label}
                        </figcaption>
                    </figure>
                ))}
            </div>
        );
    }

    return (
        <div className="my-6">
            <div
                className="relative overflow-hidden rounded-lg bg-muted aspect-video cursor-ew-resize"
                onPointerDown={(event) => {
                    setDragging(true);
                    handleMove(event);
                }}
                onPointerMove={handleMove}
                onPointerLeave={() => setDragging(false)}
                onPointerUp={() => setDragging(false)}
            >
                {afterImage.url ? (
                    <img
                        src={afterImage.url}
                        srcSet={afterImage.srcSet || undefined}
                        sizes="(max-width: 768px) 100vw, 720px"
                        alt={after.alt || ''}
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 bg-muted" />
                )}
                <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${position}%` }}
                >
                    {beforeImage.url ? (
                        <img
                            src={beforeImage.url}
                            srcSet={beforeImage.srcSet || undefined}
                            sizes="(max-width: 768px) 100vw, 720px"
                            alt={before.alt || ''}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-muted" />
                    )}
                </div>
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary"
                    style={{ left: `${position}%` }}
                />
                <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white border border-primary flex items-center justify-center text-primary shadow"
                    style={{ left: `${position}%` }}
                >
                    <span className="text-xs">&lt;&gt;</span>
                </div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground uppercase tracking-widest">
                <span>{beforeLabel}</span>
                <span>{afterLabel}</span>
            </div>
        </div>
    );
}

function TablePreview({ block }) {
    const headers = Array.isArray(block.headers) ? block.headers : [];
    const rows = Array.isArray(block.rows) ? block.rows : [];

    if (headers.length === 0 && rows.length === 0) return null;

    return (
        <div className="my-6 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
                {headers.length > 0 && (
                    <thead>
                        <tr>
                            {headers.map((header, idx) => (
                                <th key={idx} className="border border-border bg-muted/50 px-3 py-2 text-left font-semibold">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                )}
                <tbody>
                    {rows.map((row, ridx) => (
                        <tr key={ridx}>
                            {row.map((cell, cidx) => (
                                <td key={cidx} className="border border-border px-3 py-2">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RelatedContentPreview({ block }) {
    const groups = [
        { label: 'Recipes', items: block.recipes || [] },
        { label: 'Articles', items: block.articles || [] },
        { label: 'Roundups', items: block.roundups || [] },
    ].filter((group) => group.items.length > 0);

    if (groups.length === 0) return null;

    return (
        <div className="my-8 space-y-4">
            {block.title && <h3 className="text-lg font-semibold">{block.title}</h3>}
            {groups.map((group) => (
                <div key={group.label} className="space-y-2">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">{group.label}</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {group.items.map((item, idx) => (
                            <div key={idx} className="border rounded-lg p-3 bg-muted/20">
                                <p className="font-medium">{item.headline || item.slug}</p>
                                <p className="text-xs text-muted-foreground">/{item.slug}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Renders article content blocks in preview format
 */
function ContentRenderer({ contentJson }) {
    const blocks = useMemo(() => {
        if (!contentJson) return [];
        try {
            return typeof contentJson === 'string'
                ? JSON.parse(contentJson)
                : contentJson;
        } catch {
            return [];
        }
    }, [contentJson]);

    if (!Array.isArray(blocks) || blocks.length === 0) {
        return (
            <p className="text-muted-foreground italic">
                No content yet. Add some blocks in the editor.
            </p>
        );
    }

    return (
        <div className="prose prose-slate max-w-none">
            {blocks.map((block, index) => {
                switch (block.type) {
                    case 'paragraph':
                        return <p key={index}>{renderInlineMarkdown(block.text)}</p>;

                    case 'heading':
                        const HeadingTag = `h${block.level || 2}`;
                        return <HeadingTag key={index}>{renderInlineMarkdown(block.text)}</HeadingTag>;

                    case 'list':
                        const ListTag = block.style === 'ordered' ? 'ol' : 'ul';
                        return (
                            <ListTag key={index}>
                                {block.items?.map((item, i) => (
                                    <li key={i}>{renderInlineMarkdown(item)}</li>
                                ))}
                            </ListTag>
                        );

                    case 'image':
                        return (
                            <figure key={index} className="my-4">
                                <img
                                    src={block.variants?.lg?.url || block.url}
                                    alt={block.caption || ''}
                                    className="rounded-lg w-full"
                                />
                                {block.caption && (
                                    <figcaption className="text-center text-sm text-muted-foreground mt-2">
                                        {block.caption}
                                    </figcaption>
                                )}
                            </figure>
                        );

                    case 'tip_box':
                    case 'alert':
                        const variant = block.variant || 'warning';
                        const bgColors = {
                            tip: 'bg-emerald-50 border-emerald-200',
                            warning: 'bg-amber-50 border-amber-200',
                            info: 'bg-sky-50 border-sky-200',
                            note: 'bg-slate-50 border-slate-200',
                        };
                        return (
                            <div
                                key={index}
                                className={`p-4 rounded-lg border ${bgColors[variant] || bgColors.warning}`}
                            >
                                {renderInlineMarkdown(block.text)}
                            </div>
                        );

                    case 'divider':
                        return <hr key={index} className="my-8" />;

                    case 'faq_section':
                        return (
                            <div key={index} className="my-6 space-y-4">
                                <h3 className="font-bold text-lg">{block.title || 'FAQs'}</h3>
                                {block.items?.map((faq, i) => (
                                    <div key={i} className="border-b pb-3">
                                        <p className="font-medium">{renderInlineMarkdown(faq.q || faq.question)}</p>
                                        <p className="text-muted-foreground">{renderInlineMarkdown(faq.a || faq.answer)}</p>
                                    </div>
                                ))}
                            </div>
                        );

                    case 'before_after':
                        return <BeforeAfterPreview key={index} block={block} />;

                    case 'table':
                        return <TablePreview key={index} block={block} />;

                    case 'related_content':
                        return <RelatedContentPreview key={index} block={block} />;

                    case 'recipe_card':
                        const coverUrl = block.cover?.variants?.md?.url
                            || block.cover?.variants?.sm?.url
                            || block.cover?.variants?.lg?.url
                            || block.cover?.variants?.xs?.url
                            || block.cover?.url
                            || block.thumbnail;
                        return (
                            <div key={index} className="bg-muted rounded-lg p-4 my-4 flex gap-4">
                                {coverUrl && (
                                    <img
                                        src={coverUrl}
                                        alt={block.headline}
                                        className="w-24 h-24 rounded object-cover"
                                    />
                                )}
                                <div>
                                    <p className="font-semibold">{block.headline}</p>
                                    <div className="flex gap-2 text-sm text-muted-foreground">
                                        {block.difficulty && <span>{block.difficulty}</span>}
                                        {block.total_time && <span>• {block.total_time}</span>}
                                    </div>
                                </div>
                            </div>
                        );

                    default:
                        return null;
                }
            })}
        </div>
    );
}

/**
 * Renders recipe data (ingredients, instructions, nutrition)
 */
function RecipeRenderer({ recipeJson }) {
    const recipe = useMemo(() => {
        if (!recipeJson) return null;
        try {
            return typeof recipeJson === 'string'
                ? JSON.parse(recipeJson)
                : recipeJson;
        } catch {
            return null;
        }
    }, [recipeJson]);

    if (!recipe || Object.keys(recipe).length === 0) {
        return null;
    }

    return (
        <div className="mt-8 space-y-6">
            <Separator />

            {/* Recipe Meta */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/50 rounded-lg p-4">
                {recipe.prepTime && (
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Prep Time</p>
                        <p className="font-semibold">{recipe.prepTime}</p>
                    </div>
                )}
                {recipe.cookTime && (
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Cook Time</p>
                        <p className="font-semibold">{recipe.cookTime}</p>
                    </div>
                )}
                {recipe.totalTime && (
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Total Time</p>
                        <p className="font-semibold">{recipe.totalTime}</p>
                    </div>
                )}
                {recipe.yields && (
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Servings</p>
                        <p className="font-semibold">{recipe.yields}</p>
                    </div>
                )}
            </div>

            {/* Ingredients */}
            {recipe.ingredients?.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold mb-4">🧾 Ingredients</h3>
                    {recipe.ingredients.map((group, gi) => {
                        // Handle grouped ingredients (with group_title and items)
                        if (group.group_title || group.items) {
                            return (
                                <div key={gi} className="mb-4">
                                    {group.group_title && (
                                        <h4 className="font-semibold text-muted-foreground mb-2">
                                            {group.group_title}
                                        </h4>
                                    )}
                                    <ul className="space-y-2">
                                        {group.items?.map((ing, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className="text-primary">•</span>
                                                <span>
                                                    {ing.amount && <strong>{ing.amount} </strong>}
                                                    {ing.unit && <span>{ing.unit} </span>}
                                                    {ing.name || (typeof ing === 'string' ? ing : '')}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        }
                        // Handle simple ingredient object or string
                        return (
                            <ul key={gi} className="space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary">•</span>
                                    <span>
                                        {group.amount && <strong>{group.amount} </strong>}
                                        {group.unit && <span>{group.unit} </span>}
                                        {group.name || (typeof group === 'string' ? group : '')}
                                    </span>
                                </li>
                            </ul>
                        );
                    })}
                </div>
            )}

            {/* Instructions */}
            {recipe.instructions?.length > 0 && (
                <div>
                    <h3 className="text-xl font-bold mb-4">📝 Instructions</h3>
                    <ol className="space-y-4">
                        {recipe.instructions.map((step, i) => {
                            const stepText = step?.text || step?.step || (typeof step === 'string' ? step : '');
                            return (
                                <li key={i} className="flex gap-4">
                                    <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                                        {i + 1}
                                    </span>
                                    <p className="pt-1">{stepText}</p>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}

            {/* Nutrition */}
            {recipe.nutrition && (
                <div>
                    <h3 className="text-xl font-bold mb-4">📊 Nutrition</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/50 rounded-lg p-4">
                        {recipe.nutrition.calories && (
                            <div className="text-center">
                                <p className="text-2xl font-bold">{recipe.nutrition.calories}</p>
                                <p className="text-sm text-muted-foreground">Calories</p>
                            </div>
                        )}
                        {recipe.nutrition.protein && (
                            <div className="text-center">
                                <p className="text-2xl font-bold">{recipe.nutrition.protein}</p>
                                <p className="text-sm text-muted-foreground">Protein</p>
                            </div>
                        )}
                        {recipe.nutrition.carbs && (
                            <div className="text-center">
                                <p className="text-2xl font-bold">{recipe.nutrition.carbs}</p>
                                <p className="text-sm text-muted-foreground">Carbs</p>
                            </div>
                        )}
                        {recipe.nutrition.fat && (
                            <div className="text-center">
                                <p className="text-2xl font-bold">{recipe.nutrition.fat}</p>
                                <p className="text-sm text-muted-foreground">Fat</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Renders roundup items list
 */
function RoundupRenderer({ roundupJson }) {
    const roundup = useMemo(() => {
        if (!roundupJson) return null;
        try {
            return typeof roundupJson === 'string'
                ? JSON.parse(roundupJson)
                : roundupJson;
        } catch {
            return null;
        }
    }, [roundupJson]);

    if (!roundup || !roundup.items?.length) {
        return null;
    }

    return (
        <div className="mt-8 space-y-6">
            <Separator />
            <h3 className="text-xl font-bold">📚 Featured Items</h3>

            <div className="space-y-4">
                {roundup.items.map((item, i) => (
                    <div
                        key={i}
                        className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                        <span className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                            {i + 1}
                        </span>
                        {item.thumbnail && (
                            <img
                                src={item.thumbnail}
                                alt={item.title || item.headline}
                                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                            />
                        )}
                        <div className="flex-1">
                            <h4 className="font-semibold">{item.title || item.headline}</h4>
                            {item.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {item.description}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}


/**
 * Main ArticlePreview Component
 */
export default function ArticlePreview({
    open,
    onOpenChange,
    formData,
    contentJson,
    recipeJson,
    roundupJson,
    imagesData,
    categories = [],
    authors = [],
}) {
    const [device, setDevice] = useState('desktop');

    // Find category and author names
    const categoryName = useMemo(() => {
        if (!formData?.categoryId) return null;
        const cat = categories.find(c => c.id === formData.categoryId);
        return cat?.label || cat?.name || null;
    }, [formData?.categoryId, categories]);

    const authorName = useMemo(() => {
        if (!formData?.authorId) return null;
        const author = authors.find(a => a.id === formData.authorId);
        return author?.name || null;
    }, [formData?.authorId, authors]);

    // Get thumbnail from imagesData or formData
    const thumbnailUrl = imagesData?.thumbnail?.variants?.md?.url
        || imagesData?.thumbnail?.url
        || formData?.imageUrl;

    const coverUrl = imagesData?.cover?.variants?.lg?.url
        || imagesData?.cover?.url
        || formData?.coverUrl;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-2xl lg:max-w-4xl p-0 flex flex-col"
            >
                <SheetHeader className="px-6 py-4 border-b bg-background shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle>Article Preview</SheetTitle>
                            <SheetDescription>
                                Preview how your article will appear on the site
                            </SheetDescription>
                        </div>

                        {/* Device Toggle */}
                        <div className="flex items-center gap-1 border rounded-lg p-1">
                            <Button
                                variant={device === 'desktop' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDevice('desktop')}
                            >
                                <Monitor className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={device === 'tablet' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDevice('tablet')}
                            >
                                <Tablet className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={device === 'mobile' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setDevice('mobile')}
                            >
                                <Smartphone className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto">
                    <div
                        className="mx-auto transition-all duration-300 bg-white min-h-full"
                        style={{
                            maxWidth: DEVICE_WIDTHS[device],
                            boxShadow: device !== 'desktop' ? '0 0 20px rgba(0,0,0,0.1)' : 'none',
                        }}
                    >
                        {/* Cover Image */}
                        {coverUrl && (
                            <div className="aspect-[21/9] overflow-hidden">
                                <img
                                    src={coverUrl}
                                    alt={formData?.coverAlt || formData?.label}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        {/* Article Header */}
                        <div className="p-6 lg:p-8">
                            {/* Category Badge */}
                            {categoryName && (
                                <Badge variant="secondary" className="mb-4">
                                    {categoryName}
                                </Badge>
                            )}

                            {/* Title */}
                            <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
                                {formData?.label || 'Untitled Article'}
                            </h1>

                            {/* Headline */}
                            {formData?.headline && (
                                <p className="text-xl text-muted-foreground mb-6">
                                    {formData.headline}
                                </p>
                            )}

                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
                                {authorName && (
                                    <div className="flex items-center gap-1.5">
                                        <User className="h-4 w-4" />
                                        <span>{authorName}</span>
                                    </div>
                                )}
                                {formData?.publishedAt && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4" />
                                        <span>
                                            {new Date(formData.publishedAt).toLocaleDateString('fr-FR', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                )}
                                {formData?.type && (
                                    <Badge variant="outline" className="capitalize">
                                        {formData.type}
                                    </Badge>
                                )}
                            </div>

                            {/* Thumbnail (if no cover) */}
                            {!coverUrl && thumbnailUrl && (
                                <div className="aspect-video overflow-hidden rounded-xl mb-8">
                                    <img
                                        src={thumbnailUrl}
                                        alt={formData?.imageAlt || formData?.label}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}

                            <Separator className="my-8" />

                            {/* Introduction */}
                            {formData?.introduction && (
                                <div className="text-lg text-muted-foreground mb-8 leading-relaxed">
                                    {formData.introduction}
                                </div>
                            )}

                            {/* Short Description / TL;DR */}
                            {formData?.tldr && (
                                <div className="bg-muted rounded-lg p-4 mb-8">
                                    <p className="font-semibold mb-2 flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        TL;DR
                                    </p>
                                    <p>{formData.tldr}</p>
                                </div>
                            )}

                            {/* Content Blocks */}
                            <ContentRenderer contentJson={contentJson} />

                            {/* Recipe Data (for recipe type) */}
                            {formData?.type === 'recipe' && recipeJson && (
                                <RecipeRenderer recipeJson={recipeJson} />
                            )}

                            {/* Roundup Data (for roundup type) */}
                            {formData?.type === 'roundup' && roundupJson && (
                                <RoundupRenderer roundupJson={roundupJson} />
                            )}

                            {/* Summary */}
                            {formData?.summary && (
                                <>
                                    <Separator className="my-8" />
                                    <div className="bg-muted/50 rounded-lg p-6">
                                        <h3 className="font-semibold mb-2">Summary</h3>
                                        <p className="text-muted-foreground">{formData.summary}</p>
                                    </div>
                                </>
                            )}

                            {/* Tags */}
                            {formData?.selectedTags?.length > 0 && (
                                <div className="flex items-center gap-2 mt-8 flex-wrap">
                                    <Tag className="h-4 w-4 text-muted-foreground" />
                                    {formData.selectedTags.map((tagId, i) => (
                                        <Badge key={i} variant="outline">
                                            Tag {tagId}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
