/**
 * Vital temperature: API and database store Celsius as `tempC`.
 * All user-facing inputs and displays in the web app use Fahrenheit.
 */

export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

export function fahrenheitToCelsius(f: number): number {
  return ((f - 32) * 5) / 9;
}

/** Persist stable Celsius for DB (2 decimal places). */
export function roundCelsiusForStorage(c: number): number {
  return Math.round(c * 100) / 100;
}

/** One-line display, e.g. table cell with header "Temp (°F)". */
export function formatTempFValueFromCelsius(c: number | null | undefined, empty = "—"): string {
  if (c == null || Number.isNaN(Number(c))) return empty;
  return celsiusToFahrenheit(Number(c)).toFixed(1);
}

/** Prefill an input from stored Celsius. */
export function celsiusToFahrenheitInputString(c: number | null | undefined): string {
  if (c == null || Number.isNaN(Number(c))) return "";
  return celsiusToFahrenheit(Number(c)).toFixed(1);
}

/** Parse Fahrenheit from a form field into stored Celsius; empty → null. */
export function fahrenheitInputToStoredCelsius(raw: string): number | null {
  const t = String(raw ?? "").trim();
  if (t === "") return null;
  const f = parseFloat(t);
  if (Number.isNaN(f)) return null;
  return roundCelsiusForStorage(fahrenheitToCelsius(f));
}

/** Same as fahrenheitInputToStoredCelsius but omit field when empty (vitals API). */
export function fahrenheitInputToStoredCelsiusOptional(raw: string): number | undefined {
  const c = fahrenheitInputToStoredCelsius(raw);
  return c === null ? undefined : c;
}
