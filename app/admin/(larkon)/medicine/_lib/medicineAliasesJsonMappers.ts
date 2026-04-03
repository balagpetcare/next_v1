/**
 * Maps Prisma `aliasesJson` (Json) to operator-friendly form state and back.
 * Preserves non-standard payloads via an advanced JSON path only.
 */

export type AliasFormShape = "list" | "map" | "advanced";

export type AliasFormState =
  | { shape: "list"; strings: string[] }
  | { shape: "map"; pairs: { key: string; value: string }[] }
  | { shape: "advanced"; rawText: string };

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Classify stored JSON into the simplest editor we can use without data loss. */
export function classifyAliasesJson(value: unknown): AliasFormState {
  if (value == null) {
    return { shape: "list", strings: [] };
  }
  if (Array.isArray(value)) {
    const allStrings = value.every((x) => typeof x === "string");
    if (allStrings) {
      return { shape: "list", strings: value.length ? [...value] : [] };
    }
    return { shape: "advanced", rawText: JSON.stringify(value, null, 2) };
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    const scalarValuesOnly = entries.every(([, v]) => {
      const t = typeof v;
      return t === "string" || t === "number" || t === "boolean";
    });
    if (scalarValuesOnly) {
      return {
        shape: "map",
        pairs: entries.length
          ? entries.map(([k, v]) => ({ key: k, value: String(v) }))
          : [{ key: "", value: "" }],
      };
    }
    return { shape: "advanced", rawText: JSON.stringify(value, null, 2) };
  }
  return { shape: "advanced", rawText: JSON.stringify(value, null, 2) };
}

export function serializeAliasFormState(
  state: AliasFormState
): { ok: true; value: unknown } | { ok: false; message: string } {
  if (state.shape === "list") {
    const arr = state.strings.map((s) => s.trim()).filter((s) => s.length > 0);
    return { ok: true, value: arr };
  }
  if (state.shape === "map") {
    const o: Record<string, string> = {};
    for (const { key, value } of state.pairs) {
      const k = key.trim();
      if (!k) continue;
      o[k] = value.trim();
    }
    return { ok: true, value: o };
  }
  const t = state.rawText.trim();
  if (!t) {
    return { ok: true, value: [] };
  }
  try {
    return { ok: true, value: JSON.parse(t) as unknown };
  } catch {
    return {
      ok: false,
      message: "The developer JSON payload is not valid. Fix it or reload the page.",
    };
  }
}
