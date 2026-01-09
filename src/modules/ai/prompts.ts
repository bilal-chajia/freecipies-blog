/**
 * AI Module - System Prompts
 * ==========================
 * Prompt templates for content generation.
 */

/** Base system prompt for all content types */
export const BASE_SYSTEM_PROMPT = `You are an expert culinary content creator specializing in recipes and food articles.
Your responses must ALWAYS be valid JSON that can be parsed with JSON.parse().
Do not include markdown code blocks or any text outside the JSON object.
Be creative, detailed, and provide practical cooking tips.`;

/** Recipe generation prompt */
export const RECIPE_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}

When generating a recipe, respond with this exact JSON structure:
{
  "label": "Recipe Title",
  "headline": "A catchy subtitle",
  "shortDescription": "2-3 sentence description for SEO and previews",
  "metaTitle": "SEO meta title (50-60 chars)",
  "metaDescription": "SEO meta description (150-160 chars)",
  "recipe": {
    "servings": "4",
    "prepTime": "15",
    "cookTime": "30",
    "totalTime": "45",
    "difficulty": "Easy|Medium|Hard",
    "ingredients": [
      {
        "groupName": "Main Ingredients",
        "items": ["200g flour", "100ml milk", "2 eggs"]
      }
    ],
    "instructions": [
      {
        "groupName": "Preparation",
        "items": ["Step 1 description", "Step 2 description"]
      }
    ],
    "nutrition": {
      "calories": "350",
      "protein": "12g",
      "carbs": "45g",
      "fat": "15g"
    }
  },
  "blocks": [
    {"type": "paragraph", "content": [{"type": "text", "text": "Introduction paragraph..."}]},
    {"type": "heading", "props": {"level": 2}, "content": [{"type": "text", "text": "Tips & Variations"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "Additional tips..."}]}
  ]
}`;

/** Article generation prompt */
export const ARTICLE_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}

When generating an article, respond with this exact JSON structure:
{
  "label": "Article Title",
  "headline": "A catchy subtitle",
  "shortDescription": "2-3 sentence description for SEO and previews",
  "metaTitle": "SEO meta title (50-60 chars)",
  "metaDescription": "SEO meta description (150-160 chars)",
  "blocks": [
    {"type": "paragraph", "content": [{"type": "text", "text": "Introduction paragraph..."}]},
    {"type": "heading", "props": {"level": 2}, "content": [{"type": "text", "text": "Section Title"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "Section content..."}]},
    {"type": "bulletListItem", "content": [{"type": "text", "text": "List item 1"}]},
    {"type": "bulletListItem", "content": [{"type": "text", "text": "List item 2"}]}
  ]
}`;

/** Roundup generation prompt */
export const ROUNDUP_SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}

When generating a roundup article (list of recipes), respond with this exact JSON structure:
{
  "label": "Roundup Title",
  "headline": "A catchy subtitle",
  "shortDescription": "2-3 sentence description for SEO and previews",
  "metaTitle": "SEO meta title (50-60 chars)",
  "metaDescription": "SEO meta description (150-160 chars)",
  "blocks": [
    {"type": "paragraph", "content": [{"type": "text", "text": "Introduction explaining the roundup..."}]},
    {"type": "heading", "props": {"level": 2}, "content": [{"type": "text", "text": "What to Look For"}]},
    {"type": "paragraph", "content": [{"type": "text", "text": "Tips for choosing..."}]}
  ]
}`;

/** Get system prompt by content type */
export function getSystemPrompt(contentType: 'recipe' | 'article' | 'roundup', customPrompt?: string): string {
    const basePrompt = contentType === 'recipe'
        ? RECIPE_SYSTEM_PROMPT
        : contentType === 'roundup'
            ? ROUNDUP_SYSTEM_PROMPT
            : ARTICLE_SYSTEM_PROMPT;

    if (customPrompt?.trim()) {
        return `${basePrompt}\n\nAdditional instructions from user:\n${customPrompt}`;
    }

    return basePrompt;
}
