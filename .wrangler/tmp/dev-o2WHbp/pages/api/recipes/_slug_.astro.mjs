if (typeof MessageChannel === 'undefined') {
  function MessagePort() {
    this.onmessage = null;
    this._target = null;
  }
  MessagePort.prototype.postMessage = function (data) {
    var handler = this._target && this._target.onmessage;
    if (typeof handler === 'function') {
      handler({ data: data });
    }
  };
  function MessageChannelPolyfill() {
    this.port1 = new MessagePort();
    this.port2 = new MessagePort();
    this.port1._target = this.port2;
    this.port2._target = this.port1;
  }
  globalThis.MessageChannel = MessageChannelPolyfill;
}

import '../../../chunks/pinterest.schema_eG5oHE2g.mjs';
import { b as getArticleBySlug } from '../../../chunks/articles.service_DgNeye45.mjs';
import { f as formatErrorResponse, A as AppError, E as ErrorCodes, a as formatSuccessResponse } from '../../../chunks/error-handler_D5quUcAZ.mjs';
export { renderers } from '../../../renderers.mjs';

function toSchemaOrgNutrition(nutrition) {
  return {
    "@type": "NutritionInformation",
    ...nutrition.calories !== void 0 && { calories: `${nutrition.calories} kcal` },
    ...nutrition.fatContent !== void 0 && { fatContent: `${nutrition.fatContent} g` },
    ...nutrition.saturatedFatContent !== void 0 && { saturatedFatContent: `${nutrition.saturatedFatContent} g` },
    ...nutrition.unsaturatedFatContent !== void 0 && { unsaturatedFatContent: `${nutrition.unsaturatedFatContent} g` },
    ...nutrition.transFatContent !== void 0 && { transFatContent: `${nutrition.transFatContent} g` },
    ...nutrition.carbohydrateContent !== void 0 && { carbohydrateContent: `${nutrition.carbohydrateContent} g` },
    ...nutrition.sugarContent !== void 0 && { sugarContent: `${nutrition.sugarContent} g` },
    ...nutrition.fiberContent !== void 0 && { fiberContent: `${nutrition.fiberContent} g` },
    ...nutrition.proteinContent !== void 0 && { proteinContent: `${nutrition.proteinContent} g` },
    ...nutrition.sodiumContent !== void 0 && { sodiumContent: `${nutrition.sodiumContent} mg` },
    ...nutrition.cholesterolContent !== void 0 && { cholesterolContent: `${nutrition.cholesterolContent} mg` },
    ...nutrition.servingSize && { servingSize: nutrition.servingSize }
  };
}
function minutesToIsoDuration(minutes) {
  if (minutes < 60) {
    return `PT${minutes}M`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `PT${hours}H`;
  }
  return `PT${hours}H${mins}M`;
}

const prerender = false;
function generateRecipeJsonLd(article, baseUrl) {
  const recipeData = typeof article.recipeJson === "string" ? JSON.parse(article.recipeJson || "{}") : article.recipeJson || {};
  const imagesData = typeof article.imagesJson === "string" ? JSON.parse(article.imagesJson || "{}") : article.imagesJson || {};
  const images = [];
  if (imagesData.cover?.variants) {
    const v = imagesData.cover.variants;
    if (v.lg?.url) images.push(v.lg.url);
    if (v.md?.url) images.push(v.md.url);
    if (v.sm?.url) images.push(v.sm.url);
  }
  const recipeIngredient = [];
  for (const group of recipeData.ingredients || []) {
    for (const item of group.items || []) {
      const parts = [];
      if (item.amount) parts.push(item.amount.toString());
      if (item.unit) parts.push(item.unit);
      parts.push(item.name);
      if (item.notes) parts.push(`(${item.notes})`);
      recipeIngredient.push(parts.join(" "));
    }
  }
  const recipeInstructions = [];
  for (const section of recipeData.instructions || []) {
    if (section.section_title) {
      recipeInstructions.push({
        "@type": "HowToSection",
        name: section.section_title,
        itemListElement: (section.steps || []).map((step, idx) => ({
          "@type": "HowToStep",
          position: idx + 1,
          name: step.name || void 0,
          text: step.text,
          image: step.image || void 0
        }))
      });
    } else {
      for (const step of section.steps || []) {
        recipeInstructions.push({
          "@type": "HowToStep",
          name: step.name || void 0,
          text: step.text,
          image: step.image || void 0
        });
      }
    }
  }
  let nutrition;
  if (recipeData.nutrition && Object.keys(recipeData.nutrition).length > 0) {
    nutrition = toSchemaOrgNutrition(recipeData.nutrition);
  }
  let aggregateRating;
  if (recipeData.aggregateRating?.ratingValue) {
    aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: recipeData.aggregateRating.ratingValue,
      ratingCount: recipeData.aggregateRating.ratingCount || 0
    };
  }
  let video;
  if (recipeData.video?.url) {
    video = {
      "@type": "VideoObject",
      name: recipeData.video.name,
      description: recipeData.video.description,
      thumbnailUrl: recipeData.video.thumbnailUrl,
      contentUrl: recipeData.video.url,
      duration: recipeData.video.duration
    };
  }
  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: article.headline,
    description: article.shortDescription,
    image: images,
    author: {
      "@type": "Person",
      name: article.authorName || article.cachedAuthorJson?.name
    },
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    prepTime: recipeData.prepTime || (recipeData.prep ? minutesToIsoDuration(recipeData.prep) : void 0),
    cookTime: recipeData.cookTime || (recipeData.cook ? minutesToIsoDuration(recipeData.cook) : void 0),
    totalTime: recipeData.totalTime || (recipeData.total ? minutesToIsoDuration(recipeData.total) : void 0),
    recipeYield: recipeData.recipeYield || (recipeData.servings ? `${recipeData.servings} servings` : void 0),
    recipeCategory: recipeData.recipeCategory,
    recipeCuisine: recipeData.recipeCuisine,
    keywords: recipeData.keywords?.join(", "),
    recipeIngredient,
    recipeInstructions,
    nutrition,
    aggregateRating,
    video,
    suitableForDiet: recipeData.suitableForDiet?.map((d) => `https://schema.org/${d}`)
  };
}
const GET = async ({ params, locals, url }) => {
  const { slug } = params;
  if (!slug) {
    const { body, status, headers } = formatErrorResponse(
      new AppError(ErrorCodes.VALIDATION_ERROR, "Slug is required", 400)
    );
    return new Response(body, { status, headers });
  }
  try {
    const env = locals.runtime?.env;
    if (!env?.DB) {
      throw new AppError(ErrorCodes.INTERNAL_ERROR, "Database not configured", 500);
    }
    const db = env.DB;
    const article = await getArticleBySlug(db, slug, "recipe");
    if (!article) {
      const { body: body2, status: status2, headers: headers2 } = formatErrorResponse(
        new AppError(ErrorCodes.NOT_FOUND, "Recipe not found", 404)
      );
      return new Response(body2, { status: status2, headers: headers2 });
    }
    const baseUrl = `${url.protocol}//${url.host}`;
    const jsonLd = generateRecipeJsonLd(article, baseUrl);
    const responseData = {
      ...article,
      jsonLd
    };
    const { body, status, headers } = formatSuccessResponse(responseData, {
      cacheControl: "public, max-age=3600"
    });
    return new Response(body, { status, headers });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    const { body, status, headers } = formatErrorResponse(
      error instanceof AppError ? error : new AppError(
        ErrorCodes.DATABASE_ERROR,
        "Failed to fetch recipe",
        500,
        { originalError: error instanceof Error ? error.message : "Unknown error" }
      )
    );
    return new Response(body, { status, headers });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    GET,
    prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
