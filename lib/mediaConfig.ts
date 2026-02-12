/**
 * Centralized media configuration for BPA/WPA.
 * Replace video/poster paths without code changes.
 */

export const MEDIA = {
  gettingStarted: {
    /** Background video for Getting Started page. Use .mp4 or .webm. */
    video:
      process.env.NEXT_PUBLIC_GETTING_STARTED_VIDEO ||
      "/assets/videos/getting-started.mp4",
    /** Fallback poster when prefers-reduced-motion or video unavailable */
    poster:
      process.env.NEXT_PUBLIC_GETTING_STARTED_POSTER ||
      "/assets/images/auth/auth-img.png",
  },
} as const;
