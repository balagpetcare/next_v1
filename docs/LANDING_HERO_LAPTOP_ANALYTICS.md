# Hero Laptop Analytics — Changelog & Tweaks

## Summary

Ultra-premium landing hero: laptop frame with a glassmorphism analytics dashboard overlay. Four charts (Line, Bar, Donut, Area) animate with simulated live data every ~2.2s. Client-only (recharts + framer-motion), isolated to the public landing.

---

## Files created

| Path | Purpose |
|------|--------|
| `app/(public)/_components/hero-analytics/config.ts` | Laptop image path, screen overlay %, update interval |
| `app/(public)/_components/hero-analytics/hooks/useLiveSeries.ts` | Reusable hook: shifting series + new random value |
| `app/(public)/_components/hero-analytics/hooks/useLiveDonut.ts` | Donut segments that sum to 100%, smooth shifts |
| `app/(public)/_components/hero-analytics/charts/RevenueLine.tsx` | Line chart (recharts) |
| `app/(public)/_components/hero-analytics/charts/SalesBars.tsx` | Bar chart |
| `app/(public)/_components/hero-analytics/charts/CategoryDonut.tsx` | Donut chart |
| `app/(public)/_components/hero-analytics/charts/GrowthArea.tsx` | Area chart |
| `app/(public)/_components/hero-analytics/AnimatedDashboard.tsx` | Glass header + 2×2 grid of chart cards |
| `app/(public)/_components/hero-analytics/LaptopFrame.tsx` | Laptop image + overlay slot (fallback if image missing) |
| `app/(public)/_components/hero-analytics/HeroLaptopAnalytics.tsx` | Dynamic import wrapper (ssr: false) |

## Files modified

| Path | Change |
|------|--------|
| `package.json` | Added `recharts`, `framer-motion` |
| `app/(public)/_components/HeroSection.tsx` | Replaced static dashboard image with `<HeroLaptopAnalytics />`, responsive scale |

---

## How to tweak

### Overlay position (laptop “screen” inset)

Edit **`app/(public)/_components/hero-analytics/config.ts`**:

```ts
export const SCREEN_OVERLAY = {
  left: "12.2%",
  top: "12.8%",
  width: "75.6%",
  height: "62.8%",
} as const;
```

Adjust percentages so the overlay aligns with your laptop frame image.

### Update interval (chart refresh)

Same file:

```ts
export const LIVE_UPDATE_INTERVAL_MS = 2200;
```

Change to e.g. `2000` or `2500` (ms).

### Replace the laptop image

1. Add your image at **`public/landing/laptop-frame.png`** (or another path).
2. In **`config.ts`**, set:
   ```ts
   export const LAPTOP_FRAME_IMAGE = "/landing/laptop-frame.png";
   ```
   If the file is missing, the UI shows a placeholder and the overlay still works.

---

## Notes

- **Location:** Implemented under **`app/(public)/_components/hero-analytics/`** (not `src/components/landing/`) to keep the “no `src/components/landing`” guardrail passing.
- **Landing CSS:** No new imports of `landing.css`; hero analytics use Tailwind only.
- **Laptop asset:** `public/landing/laptop-frame.png` does not exist yet; a TODO is in config and the frame shows a fallback until the image is added.
