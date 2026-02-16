/**
 * Canonical flag emoji utility for country/language displays.
 * Project rule: All country and language selects MUST show flags.
 * Use with CountrySelect and LanguageSelect from @/src/shared/selects.
 */

/** Fallback when code is invalid */
const FALLBACK = "\uD83C\uDFF3\uFE0F";

/**
 * Convert ISO 3166-1 alpha-2 country code to regional indicator flag emoji.
 * @param code - 2-letter country code (e.g. "BD", "US")
 * @returns Flag emoji (e.g. 🇧🇩) or fallback if invalid
 */
export function getFlagEmoji(code: string | null | undefined): string {
  const c = String(code || "").trim().toUpperCase();
  if (!c || c.length !== 2) return FALLBACK;
  const a = c.charCodeAt(0);
  const b = c.charCodeAt(1);
  if (a < 65 || a > 90 || b < 65 || b > 90) return FALLBACK;
  return String.fromCodePoint(0x1f1e6 - 65 + a, 0x1f1e6 - 65 + b);
}
