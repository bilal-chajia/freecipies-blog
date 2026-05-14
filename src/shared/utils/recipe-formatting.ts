/**
 * Recipe Formatting Utilities
 * ===========================
 * Shared utility functions for formatting recipe amounts, units, and times.
 */

/**
 * Formats a numeric amount or string into a readable string,
 * converting decimals into common culinary fractions (e.g., 1.5 -> "1 ½").
 */
export function formatAmount(amount: number | string | null | undefined): string {
  let num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num === null || num === undefined || isNaN(num)) return "";
  if (num === 0) return "";

  const whole = Math.floor(num);
  const remainder = num - whole;

  let fractionStr = "";
  if (remainder > 0.01) {
    const fraction = Math.round(remainder * 16) / 16;
    if (Math.abs(fraction - 0.125) < 0.01) fractionStr = "⅛";
    else if (Math.abs(fraction - 0.25) < 0.01) fractionStr = "¼";
    else if (Math.abs(fraction - 0.33) < 0.02) fractionStr = "⅓";
    else if (Math.abs(fraction - 0.375) < 0.01) fractionStr = "⅜";
    else if (Math.abs(fraction - 0.5) < 0.01) fractionStr = "½";
    else if (Math.abs(fraction - 0.625) < 0.01) fractionStr = "⅝";
    else if (Math.abs(fraction - 0.66) < 0.02) fractionStr = "⅔";
    else if (Math.abs(fraction - 0.75) < 0.01) fractionStr = "¾";
    else if (Math.abs(fraction - 0.875) < 0.01) fractionStr = "⅞";
    else if (whole === 0) fractionStr = remainder.toFixed(2).replace(/\.?0+$/, "");
  }

  if (whole > 0) {
    return fractionStr ? `${whole} ${fractionStr}` : String(whole);
  }
  return fractionStr || "0";
}

/**
 * Pluralizes a unit if the amount is greater than 1,
 * handling irregular culinary unit plurals.
 */
export function formatUnit(unit: string, amount: number): string {
  if (!unit) return "";
  if (amount > 1 && !unit.endsWith("s")) {
    const irregulars: Record<string, string> = {
      tbsp: "tbsp",
      tsp: "tsp",
      oz: "oz",
      lb: "lbs",
      cup: "cups",
      can: "cans",
      clove: "cloves",
      slice: "slices",
      piece: "pieces",
      bunch: "bunches",
    };
    return irregulars[unit] || unit + "s";
  }
  return unit;
}

/**
 * Formats a number of minutes into a readable hours and minutes string.
 * (e.g., 90 -> "1 hr 30 min")
 */
export function formatTime(minutes: number | null | undefined): string {
  if (!minutes) return "";
  if (minutes < 60) return minutes + " min";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? hrs + " hr " + mins + " min" : hrs + " hr";
}
