// src/server/site-data/stories/build-story.ts
import type { HydratedArticle } from "@modules/articles";
import type { RecipeJson, InstructionStep } from "@modules/articles/types/recipes.types";
import { buildImagePool, type StoryImagePool } from "./images";
import type { Story, StoryContext, StoryImage, StorySlide } from "./types";

const MAX_STEPS = 7;
const MAX_INGREDIENTS = 8;
const COVER_BODY_MAX = 140;
const STEP_BODY_MAX = 180;

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max - 1).trimEnd() + "…";
}

/** Picks pool images for slides, avoiding repeating the previous slide's image. */
class ImageCursor {
  private lastUrl: string | null = null;
  private contentIndex = 0;
  constructor(private pool: StoryImagePool) {}

  private take(image: StoryImage | null): StoryImage | undefined {
    if (!image) return undefined;
    this.lastUrl = image.url;
    return image;
  }

  hero(): StoryImage | undefined {
    return this.take(this.pool.hero);
  }

  /** Next unused content image whose url differs from the last slide, if any. */
  private nextDistinctContent(): StoryImage | null {
    while (this.contentIndex < this.pool.content.length) {
      const img = this.pool.content[this.contentIndex++];
      if (img.url !== this.lastUrl) return img;
    }
    return null;
  }

  /** Explicit step image when present, otherwise the hero. Recipe slides stay
   *  on-topic by never borrowing arbitrary body images (which may belong to an
   *  unrelated subject); variety only comes from real per-step images. */
  forStep(ref: string | null | undefined): StoryImage | undefined {
    if (ref && this.pool.steps[ref]) return this.take(this.pool.steps[ref]);
    return this.take(this.pool.hero);
  }

  /** Next distinct content image for a non-recipe info slide, falling back to hero. */
  forInfo(): StoryImage | undefined {
    return this.take(this.nextDistinctContent() ?? this.pool.hero);
  }
}

function getRecipe(article: HydratedArticle): RecipeJson | null {
  if (article.type !== "recipe") return null;
  return article.recipe ?? article.recipe_json ?? null;
}

function recipeHasContent(recipe: RecipeJson | null): boolean {
  if (!recipe) return false;
  const steps = (recipe.instructions ?? []).reduce((n, s) => n + (s.steps?.length ?? 0), 0);
  const ings = (recipe.ingredients ?? []).reduce((n, g) => n + (g.items?.length ?? 0), 0);
  return steps > 0 || ings > 0;
}

function coverMeta(recipe: RecipeJson | null): StorySlide["meta"] {
  if (!recipe) return undefined;
  const meta: NonNullable<StorySlide["meta"]> = {};
  const total = recipe.total ?? ((recipe.prep ?? 0) + (recipe.cook ?? 0) || null);
  if (total) meta.total_time = `${total} min`;
  if (recipe.servings) meta.servings = `${recipe.servings} servings`;
  const rating = recipe.aggregate_rating?.rating_value;
  if (typeof rating === "number" && rating > 0) meta.rating = rating.toFixed(1);
  return Object.keys(meta).length > 0 ? meta : undefined;
}

function ingredientItems(recipe: RecipeJson): string[] {
  const flat: string[] = [];
  for (const group of recipe.ingredients ?? []) {
    for (const item of group.items ?? []) {
      const amount = item.amount && item.amount > 0 ? `${item.amount} ` : "";
      const unit = item.unit ? `${item.unit} ` : "";
      flat.push(`${amount}${unit}${item.name}`.trim());
    }
  }
  if (flat.length <= MAX_INGREDIENTS) return flat;
  const shown = flat.slice(0, MAX_INGREDIENTS);
  shown.push(`+${flat.length - MAX_INGREDIENTS} more`);
  return shown;
}

function flatSteps(recipe: RecipeJson): InstructionStep[] {
  const steps: InstructionStep[] = [];
  for (const section of recipe.instructions ?? []) {
    for (const step of section.steps ?? []) steps.push(step);
  }
  return steps.slice(0, MAX_STEPS);
}

function nutritionSlide(recipe: RecipeJson, image: StoryImage | undefined): StorySlide | null {
  const n = recipe.nutrition;
  // status is typed as the literal 'validated', but guard at runtime for cast data
  if (!n || (n.status as string) !== "validated") return null;
  const parts = [
    `${n.calories} kcal`,
    `${n.protein_g} g protein`,
    `${n.total_carbohydrate_g} g carbs`,
    `${n.total_fat_g} g fat`,
  ];
  return { id: "nutrition", kind: "info", image, heading: "Nutrition", body: parts.join(" · ") };
}

function buildCover(article: HydratedArticle, cursor: ImageCursor, recipe: RecipeJson | null): StorySlide {
  return {
    id: "cover",
    kind: "cover",
    image: cursor.hero(),
    heading: article.headline ?? "",
    body: article.short_description ? truncate(article.short_description, COVER_BODY_MAX) : undefined,
    meta: coverMeta(recipe),
  };
}

function buildCta(cursor: ImageCursor): StorySlide {
  return { id: "cta", kind: "cta", image: cursor.hero(), heading: "Ready to cook?" };
}

function buildRecipeSlides(article: HydratedArticle, recipe: RecipeJson, cursor: ImageCursor): StorySlide[] {
  const slides: StorySlide[] = [buildCover(article, cursor, recipe)];

  const items = ingredientItems(recipe);
  if (items.length > 0) {
    slides.push({ id: "ingredients", kind: "ingredients", image: cursor.hero(), heading: "Ingredients", items });
  }

  flatSteps(recipe).forEach((step, i) => {
    const parts = [step.text, step.tip].filter((x): x is string => typeof x === "string" && x.length > 0);
    slides.push({
      id: `step-${i + 1}`,
      kind: "step",
      image: cursor.forStep(step.image_ref),
      heading: step.name ? truncate(step.name, 60) : `Step ${i + 1}`,
      body: truncate(parts.join(" — "), STEP_BODY_MAX),
    });
  });

  const nutrition = nutritionSlide(recipe, cursor.hero());
  if (nutrition) slides.push(nutrition);

  slides.push(buildCta(cursor));
  return slides;
}

function buildArticleSlides(article: HydratedArticle, cursor: ImageCursor): StorySlide[] {
  const slides: StorySlide[] = [buildCover(article, cursor, null)];
  const subtitle = article.subtitle;
  if (typeof subtitle === "string" && subtitle.trim() !== "") {
    slides.push({ id: "info-1", kind: "info", image: cursor.forInfo(), body: truncate(subtitle, STEP_BODY_MAX) });
  }
  slides.push(buildCta(cursor));
  return slides;
}

export function buildStory(article: HydratedArticle, ctx: StoryContext): Story {
  const pool = buildImagePool(article.images_json, article.headline ?? "");
  const cursor = new ImageCursor(pool);
  const recipe = getRecipe(article);

  const slides = (recipe && recipeHasContent(recipe))
    ? buildRecipeSlides(article, recipe, cursor)
    : buildArticleSlides(article, cursor);

  const posterImage = pool.hero ?? pool.content[0] ?? null;
  const posterUrl = posterImage ? `${ctx.origin}${posterImage.url}` : ctx.publisher_logo_url;

  return {
    slug: article.slug,
    type: article.type,
    title: article.headline ?? "",
    publisher: ctx.publisher,
    publisher_logo_url: ctx.publisher_logo_url,
    poster_portrait_url: posterUrl,
    canonical_url: `${ctx.origin}/stories/${article.slug}`,
    target_url: article.route || `/recipes/${article.slug}`,
    slides,
  };
}
