export type LabelPreset = {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  sheet?: "A4";
};

export const BARCODE_LABEL_PRESETS: LabelPreset[] = [
  { id: "25x15", label: "25 x 15 mm", widthMm: 25, heightMm: 15 },
  { id: "30x20", label: "30 x 20 mm", widthMm: 30, heightMm: 20 },
  { id: "40x25", label: "40 x 25 mm", widthMm: 40, heightMm: 25 },
  { id: "50x30", label: "50 x 30 mm", widthMm: 50, heightMm: 30 },
  { id: "60x40", label: "60 x 40 mm", widthMm: 60, heightMm: 40 },
  { id: "80x50", label: "80 x 50 mm", widthMm: 80, heightMm: 50 },
  { id: "a4", label: "A4 sheet layout", widthMm: 50, heightMm: 30, sheet: "A4" },
];

export function getLabelPreset(id: string): LabelPreset {
  return BARCODE_LABEL_PRESETS.find((p) => p.id === id) || BARCODE_LABEL_PRESETS.find((p) => p.id === "50x30") || BARCODE_LABEL_PRESETS[0];
}
