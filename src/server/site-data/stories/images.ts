// src/server/site-data/stories/images.ts
import { safeParseJson } from "@shared/utils";
import { resolveVariantUrl } from "@shared/types/images";
import type { StoryImage } from "./types";

/** Best-to-worst variant preference for a full-screen story background. */
const VARIANT_ORDER = ["lg", "md", "sm", "xs"] as const;

// Mirrors resolveVariantUrl's parameter type — both casings are handled there.
interface RawVariant { r2_key?: string; r2Key?: string; url?: string; width?: number; height?: number; }
interface RawSlot { alt?: string; variants?: Record<string, RawVariant | undefined>; }

/** Resolve a single image slot to a public StoryImage, or null when unusable. */
export function slotToStoryImage(slot: unknown, fallbackAlt: string): StoryImage | null {
  if (!slot || typeof slot !== "object") return null;
  const s = slot as RawSlot;
  const variants = s.variants;
  if (!variants || typeof variants !== "object") return null;

  for (const key of VARIANT_ORDER) {
    const v = variants[key];
    if (!v) continue;
    const url = resolveVariantUrl(v);
    if (url && typeof v.width === "number" && typeof v.height === "number") {
      return {
        url,
        alt: (typeof s.alt === "string" && s.alt.trim() !== "") ? s.alt : fallbackAlt,
        width: v.width,
        height: v.height,
      };
    }
  }
  return null;
}

export interface StoryImagePool {
  hero: StoryImage | null;
  /** Recipe step images keyed by the step's image_ref. */
  steps: Record<string, StoryImage>;
  /** Content-body images in document order. */
  content: StoryImage[];
}

/** Parse images_json once and resolve hero, recipe step, and content images. */
export function buildImagePool(images_json: string | null | undefined, fallbackAlt: string): StoryImagePool {
  const parsed = safeParseJson<Record<string, unknown>>(images_json);
  if (!parsed) return { hero: null, steps: {}, content: [] };

  const hero = slotToStoryImage(parsed.hero, fallbackAlt)
    ?? slotToStoryImage(parsed.thumbnail, fallbackAlt);

  const steps: Record<string, StoryImage> = {};
  const rawSteps = parsed.recipe_steps;
  if (rawSteps && typeof rawSteps === "object") {
    for (const [ref, slot] of Object.entries(rawSteps as Record<string, unknown>)) {
      const img = slotToStoryImage(slot, fallbackAlt);
      if (img) steps[ref] = img;
    }
  }

  const content: StoryImage[] = [];
  const rawContent = parsed.content_images;
  if (rawContent && typeof rawContent === "object") {
    for (const slot of Object.values(rawContent as Record<string, unknown>)) {
      const img = slotToStoryImage(slot, fallbackAlt);
      if (img) content.push(img);
    }
  }

  return { hero, steps, content };
}
