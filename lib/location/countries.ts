/**
 * Static ISO-based country list for LocationPicker.
 * No API calls. Value stored is country name (backend compatible).
 */

export interface CountryRecord {
  code: string;
  name: string;
  currencyCode: string;
}

/** ISO 3166-1 alpha-2 code to flag emoji */
export function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return "";
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 - 65 + c.charCodeAt(0)))
    .join("");
}

/** Static countries: code, name, currency (ISO 4217). Aligned with backend geo.data. */
export const COUNTRIES: CountryRecord[] = [
  { code: "AF", name: "Afghanistan", currencyCode: "AFN" },
  { code: "AU", name: "Australia", currencyCode: "AUD" },
  { code: "BD", name: "Bangladesh", currencyCode: "BDT" },
  { code: "BH", name: "Bahrain", currencyCode: "BHD" },
  { code: "BR", name: "Brazil", currencyCode: "BRL" },
  { code: "CA", name: "Canada", currencyCode: "CAD" },
  { code: "CN", name: "China", currencyCode: "CNY" },
  { code: "DE", name: "Germany", currencyCode: "EUR" },
  { code: "EG", name: "Egypt", currencyCode: "EGP" },
  { code: "ES", name: "Spain", currencyCode: "EUR" },
  { code: "FR", name: "France", currencyCode: "EUR" },
  { code: "GB", name: "United Kingdom", currencyCode: "GBP" },
  { code: "IN", name: "India", currencyCode: "INR" },
  { code: "IT", name: "Italy", currencyCode: "EUR" },
  { code: "JP", name: "Japan", currencyCode: "JPY" },
  { code: "KR", name: "South Korea", currencyCode: "KRW" },
  { code: "KW", name: "Kuwait", currencyCode: "KWD" },
  { code: "LK", name: "Sri Lanka", currencyCode: "LKR" },
  { code: "MY", name: "Malaysia", currencyCode: "MYR" },
  { code: "MX", name: "Mexico", currencyCode: "MXN" },
  { code: "NL", name: "Netherlands", currencyCode: "EUR" },
  { code: "NP", name: "Nepal", currencyCode: "NPR" },
  { code: "OM", name: "Oman", currencyCode: "OMR" },
  { code: "PK", name: "Pakistan", currencyCode: "PKR" },
  { code: "QA", name: "Qatar", currencyCode: "QAR" },
  { code: "SA", name: "Saudi Arabia", currencyCode: "SAR" },
  { code: "SG", name: "Singapore", currencyCode: "SGD" },
  { code: "AE", name: "United Arab Emirates", currencyCode: "AED" },
  { code: "US", name: "United States", currencyCode: "USD" },
  { code: "ZA", name: "South Africa", currencyCode: "ZAR" },
];

/** Get country by name (case-insensitive). */
export function getCountryByName(name: string): CountryRecord | undefined {
  if (!name?.trim()) return undefined;
  const n = name.trim().toLowerCase();
  return COUNTRIES.find((c) => c.name.toLowerCase() === n);
}

/** Get country by ISO code. */
export function getCountryByCode(code: string): CountryRecord | undefined {
  if (!code?.trim()) return undefined;
  const c = code.trim().toUpperCase();
  return COUNTRIES.find((x) => x.code === c);
}
