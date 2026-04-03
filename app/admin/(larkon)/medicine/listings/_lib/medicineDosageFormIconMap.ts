/**
 * Maps dosage form display names (admin locale) to Remix Icon classes.
 * Order matters: first matching rule wins. Keep rules lowercase-normalized.
 */
const RULES: { patterns: RegExp[]; icon: string }[] = [
  { patterns: [/\binj\b/, /\binjection\b/, /\biv\b/, /\bampoule\b/, /\bvial\b/], icon: "ri-syringe-line" },
  { patterns: [/\bcapsule\b/, /\bcap\b/], icon: "ri-capsule-line" },
  { patterns: [/\btab\b/, /\btablet\b/, /\bcaplet\b/], icon: "ri-medicine-bottle-line" },
  { patterns: [/\bsyrup\b/, /\bsuspension\b/, /\belixir\b/, /\bsolution\b.*\boral\b/], icon: "ri-flask-line" },
  { patterns: [/\bdrop\b/, /\beye\b/, /\bear\b/, /\bnasal\b.*\bdrop\b/], icon: "ri-drop-line" },
  { patterns: [/\bcream\b/, /\bointment\b/, /\bgel\b.*\btopical\b/, /\blotion\b/, /\bpaste\b/], icon: "ri-brush-line" },
  { patterns: [/\binhaler\b/, /\bspray\b/, /\bpuff\b/, /\bmdi\b/, /\bdpi\b/], icon: "ri-windy-line" },
  { patterns: [/\bsachet\b/, /\bpowder\b/, /\bgranule\b/], icon: "ri-stack-line" },
  { patterns: [/\bsuppository\b/, /\brectal\b/], icon: "ri-capsule-line" },
  { patterns: [/\bpatch\b/, /\btransdermal\b/], icon: "ri-layout-grid-line" },
];

const DEFAULT_ICON = "ri-capsule-line";

export function resolveMedicineDosageFormIcon(dosageFormDisplay?: string | null): string {
  const raw = (dosageFormDisplay || "").trim();
  if (!raw) return DEFAULT_ICON;
  const n = raw.toLowerCase();
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(n))) return rule.icon;
  }
  return DEFAULT_ICON;
}
