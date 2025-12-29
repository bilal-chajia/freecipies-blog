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

const DEVICE_WIDTHS = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
};

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
                        return <p key={index}>{block.text}</p>;

                    case 'heading':
                        const HeadingTag = `h${block.level || 2}`;
                        return <HeadingTag key={index}>{block.text}</HeadingTag>;

                    case 'list':
                        const ListTag = block.style === 'ordered' ? 'ol' : 'ul';
                        return (
                            <ListTag key={index}>
                                {block.items?.map((item, i) => (
                                    <li key={i}>{item}</li>
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
                                {block.text}
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
                                        <p className="font-medium">{faq.question}</p>
                                        <p className="text-muted-foreground">{faq.answer}</p>
                                    </div>
                                ))}
                            </div>
                        );

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
