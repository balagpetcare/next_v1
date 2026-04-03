/**
 * Central Auth Redirect Helper
 * 
 * Builds authentication URLs for redirecting to the central auth UI.
 * Includes security validation to ensure returnTo URLs are same-origin
 * or from allowed localhost ports.
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_AUTH_BASE_URL: Base URL of the central auth server (default: http://localhost:3000)
 * 
 * @example
 * ```ts
 * import { buildAuthUrl, getDefaultReturnTo } from '@/lib/authRedirect';
 * 
 * // In a client component
 * const returnTo = getDefaultReturnTo('owner', '/owner');
 * const loginUrl = buildAuthUrl('login', 'owner', returnTo);
 * router.replace(loginUrl);
 * ```
 */

/** Allowed localhost ports for BPA panels */
export const ALLOWED_PORTS = [3100, 3101, 3102, 3103, 3104, 3105, 3106, 3107] as const;

/**
 * Panel configuration mapping.
 * Note: each port is a distinct browser **origin**; cookies do not cross ports. Relative links from
 * `/clinic` to `/staff` only work when that port’s Next app serves **both** path prefixes (or use one gateway host).
 * See docs/CROSS_SHELL_NAVIGATION.md.
 */
export const PANEL_CONFIG: Record<string, { port: number; basePath: string; label: string }> = {
  mother: { port: 3100, basePath: '/mother', label: 'Mother' },
  shop: { port: 3101, basePath: '/shop', label: 'Shop' },
  clinic: { port: 3102, basePath: '/clinic', label: 'Clinic' },
  admin: { port: 3103, basePath: '/admin', label: 'Admin' },
  owner: { port: 3104, basePath: '/owner', label: 'Owner' },
  producer: { port: 3105, basePath: '/producer', label: 'Producer' },
  country: { port: 3106, basePath: '/country', label: 'Country' },
  doctor: { port: 3107, basePath: '/doctor', label: 'Doctor' },
  staff: { port: 3100, basePath: '/staff', label: 'Staff' }, // Staff uses mother port
};

/**
 * Get the central auth base URL from environment or default
 */
export function getAuthBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return (window as any).__NEXT_PUBLIC_AUTH_BASE_URL ||
           process.env.NEXT_PUBLIC_AUTH_BASE_URL ||
           'http://localhost:3000';
  }
  return process.env.NEXT_PUBLIC_AUTH_BASE_URL || 'http://localhost:3000';
}

/**
 * Base URL for API calls that must send cookies (login, /auth/me).
 * In the browser: use same-origin ("") so the cookie set by login on this origin is sent.
 * On the server: use the configured backend URL.
 * Use this for auth-sensitive requests; do not use hardcoded localhost:3000 in browser code.
 */
export function getBrowserSafeApiBase(): string {
  if (typeof window !== 'undefined') return '';
  return (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/** Alias for cookie-based auth/me and login calls. Same as getBrowserSafeApiBase(). */
export function getAuthMeBase(): string {
  return getBrowserSafeApiBase();
}

/**
 * Check if a URL is from an allowed origin (same-origin or allowed localhost port)
 * 
 * Security: This prevents open redirect vulnerabilities by only allowing:
 * 1. Same-origin URLs
 * 2. localhost URLs on allowed ports (3100-3106)
 * 
 * @param url - The URL to validate
 * @param currentOrigin - The current window origin (optional, auto-detected on client)
 * @returns true if the URL is allowed, false otherwise
 */
export function isAllowedReturnTo(url: string, currentOrigin?: string): boolean {
  try {
    // Handle relative URLs - always allowed
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true;
    }

    const parsed = new URL(url);
    const origin = currentOrigin || (typeof window !== 'undefined' ? window.location.origin : '');
    
    // Same-origin check
    if (origin && parsed.origin === origin) {
      return true;
    }

    // Localhost ports check (for development multi-panel setup)
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      const port = parseInt(parsed.port, 10) || (parsed.protocol === 'https:' ? 443 : 80);
      return ALLOWED_PORTS.includes(port as typeof ALLOWED_PORTS[number]);
    }

    // Reject all external domains
    return false;
  } catch {
    // Invalid URL - reject
    return false;
  }
}

/**
 * Sanitize and validate a returnTo URL
 * 
 * @param returnTo - The returnTo URL to sanitize
 * @param fallback - Fallback URL if validation fails
 * @param currentOrigin - The current window origin (optional)
 * @returns A safe returnTo URL
 */
export function sanitizeReturnTo(returnTo: string | null | undefined, fallback: string, currentOrigin?: string): string {
  if (!returnTo) {
    return fallback;
  }

  if (isAllowedReturnTo(returnTo, currentOrigin)) {
    return returnTo;
  }

  console.warn(`[authRedirect] Blocked potentially unsafe returnTo URL: ${returnTo}`);
  return fallback;
}

/**
 * Get the default returnTo URL for a panel
 * 
 * @param panelName - Name of the panel (owner, admin, etc.)
 * @param defaultPath - Default path to redirect to (e.g., '/owner')
 * @returns Full returnTo URL including origin
 */
export function getDefaultReturnTo(panelName: string, defaultPath?: string): string {
  if (typeof window === 'undefined') {
    // Server-side fallback
    const config = PANEL_CONFIG[panelName];
    const path = defaultPath || config?.basePath || `/${panelName}`;
    return `http://localhost:${config?.port || 3104}${path}`;
  }

  const config = PANEL_CONFIG[panelName];
  const path = defaultPath || config?.basePath || `/${panelName}`;
  return `${window.location.origin}${path}`;
}

/**
 * Build the central auth URL for login or register
 * 
 * @param action - 'login' or 'register'
 * @param appName - The panel/app name (owner, admin, etc.)
 * @param returnTo - URL to redirect to after auth (will be validated)
 * @returns The full auth URL to redirect to
 */
export function buildAuthUrl(
  action: 'login' | 'register',
  appName: string,
  returnTo: string,
  useSameOriginForAdmin?: boolean
): string {
  const params = new URLSearchParams();
  params.set('app', appName);
  params.set('returnTo', returnTo);

  // Admin, Doctor, Staff: use same-origin /login so cookie is set on panel port (path-only for reliable router.replace).
  const sameOriginPanels = ['admin', 'doctor', 'staff'];
  if (useSameOriginForAdmin && sameOriginPanels.includes(appName) && typeof window !== 'undefined') {
    return `/login?${params.toString()}`;
  }

  const authBase = getAuthBaseUrl();
  return `${authBase}/auth/${action}?${params.toString()}`;
}

/**
 * Parse returnTo from URL query parameters with security validation
 * 
 * Handles both:
 * - ?returnTo=<full URL>
 * - ?next=<path> (converts to origin + path)
 * 
 * @param searchParams - URLSearchParams or query string
 * @param panelName - The panel name for fallback
 * @param defaultPath - Default path for this panel
 * @returns Validated returnTo URL
 */
export function parseReturnToFromQuery(
  searchParams: URLSearchParams | string | null,
  panelName: string,
  defaultPath?: string
): string {
  const params = typeof searchParams === 'string' 
    ? new URLSearchParams(searchParams) 
    : searchParams;

  if (!params) {
    return getDefaultReturnTo(panelName, defaultPath);
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const fallback = getDefaultReturnTo(panelName, defaultPath);

  // Check for returnTo parameter
  const returnTo = params.get('returnTo');
  if (returnTo) {
    return sanitizeReturnTo(returnTo, fallback, origin);
  }

  // Check for next parameter (relative path)
  const next = params.get('next');
  if (next) {
    // Convert relative path to full URL
    const fullUrl = next.startsWith('/') ? `${origin}${next}` : `${origin}/${next}`;
    return sanitizeReturnTo(fullUrl, fallback, origin);
  }

  return fallback;
}

/**
 * Hook-compatible function to get auth redirect URL on the client
 * 
 * @param action - 'login' or 'register'
 * @param panelName - The panel name
 * @param searchParams - URL search params
 * @param defaultLandingPath - Default landing path after auth
 * @returns The auth URL to redirect to
 */
export function getAuthRedirectUrl(
  action: 'login' | 'register',
  panelName: string,
  searchParams?: URLSearchParams | null,
  defaultLandingPath?: string
): string {
  const returnTo = parseReturnToFromQuery(searchParams ?? null, panelName, defaultLandingPath);
  // Admin, doctor, staff: same-origin /login so cookie is set on panel port (avoids unauthorized after returnTo)
  const useSameOrigin = ['admin', 'doctor', 'staff'].includes(panelName);
  return buildAuthUrl(action, panelName, returnTo, useSameOrigin);
}

/**
 * Get panel login path for redirect after logout.
 * Use when you need to redirect to the correct login page for a panel.
 */
export function getLoginPathForPanel(panelName: string): string {
  const config = PANEL_CONFIG[panelName];
  if (config) return `${config.basePath}/login`;
  return "/login";
}

/**
 * Get panel logout path. Panels with dedicated logout use /{panel}/logout.
 */
export function getLogoutPathForPanel(panelName: string): string {
  const panelsWithLogout = ["owner", "admin", "partner"];
  if (panelsWithLogout.includes(panelName)) {
    return `/${panelName}/logout`;
  }
  return "/api/logout";
}

/** Post-auth landing route: centralized routing after login (replaces hardcoded /mother) */
export const POST_AUTH_LANDING_PATH = "/post-auth-landing";

/** Choose-activity route: shown when user has not selected a panel (e.g. new customer) */
export const CHOOSE_ACTIVITY_PATH = "/choose-activity";

/** Panels object from GET /api/v1/auth/me (panels: { admin?, owner?, staff?, country?, partner?, doctor? }) */
export type PanelsFromMe = {
  admin?: boolean;
  owner?: boolean;
  staff?: boolean;
  country?: boolean;
  partner?: boolean;
  doctor?: boolean;
};

/** Path prefix -> panel key for validation (order matters for longest match) */
const PATH_TO_PANEL: Array<{ prefix: string; panel: keyof PanelsFromMe }> = [
  { prefix: "/owner", panel: "owner" },
  { prefix: "/admin", panel: "admin" },
  { prefix: "/staff", panel: "staff" },
  { prefix: "/doctor", panel: "doctor" },
  { prefix: "/country", panel: "country" },
  { prefix: "/producer", panel: "partner" },
  { prefix: "/mother", panel: "partner" },
  { prefix: "/shop", panel: "partner" },
  { prefix: "/clinic", panel: "partner" },
];

/**
 * Resolve panel key from a path (e.g. /staff/branch/1 -> staff, /owner/dashboard -> owner).
 * Used to validate redirect targets against allowedPanels.
 */
export function pathToPanelKey(path: string): keyof PanelsFromMe | null {
  if (!path || !path.startsWith("/")) return null;
  for (const { prefix, panel } of PATH_TO_PANEL) {
    if (path === prefix || path.startsWith(prefix + "/")) return panel;
  }
  return null;
}

/**
 * Check if a redirect path is allowed for the user based on auth/me allowedPanels.
 * Prevents cross-panel redirects (e.g. owner-only user sent to /staff) that cause loops.
 */
export function isPathAllowedForPanels(
  path: string,
  allowedPanels: string[] | null | undefined
): boolean {
  if (!path || path === "/" || path === POST_AUTH_LANDING_PATH || path === CHOOSE_ACTIVITY_PATH) {
    return true;
  }
  const panel = pathToPanelKey(path);
  if (!panel) return true; // non-panel path
  return Array.isArray(allowedPanels) && allowedPanels.includes(panel);
}

/**
 * Resolve a safe landing path from auth/me routing.
 * - Only uses selectedPanel if it is in allowedPanels.
 * - Only uses default_redirect if its panel is in allowedPanels; otherwise uses first allowed panel path.
 * - Never redirects to a panel the user cannot access.
 */
export function resolveLandingPathFromMe(params: {
  default_redirect: string;
  allowedPanels: string[];
  selectedPanel: string | null;
  intendedPanel: string | null;
  panelPaths: Record<string, string>;
}): string {
  const { default_redirect, allowedPanels, selectedPanel, intendedPanel, panelPaths } = params;
  const allowed = allowedPanels ?? [];
  const defaultPath = default_redirect?.startsWith("/") ? default_redirect : `/${default_redirect || "choose-activity"}`;

  // If default_redirect is a panel path, validate it
  if (isPathAllowedForPanels(defaultPath, allowed)) {
    return defaultPath;
  }

  // Use selectedPanel only if it's in allowedPanels
  if (selectedPanel && allowed.includes(selectedPanel) && panelPaths[selectedPanel]) {
    return panelPaths[selectedPanel];
  }
  if (intendedPanel && allowed.includes(intendedPanel) && panelPaths[intendedPanel]) {
    return panelPaths[intendedPanel];
  }

  // First allowed panel as fallback
  for (const p of allowed) {
    if (panelPaths[p]) return panelPaths[p];
  }

  // Safe fallback: choose-activity so user can pick
  return CHOOSE_ACTIVITY_PATH;
}

const COMMON_PORT = 3100;
const FALLBACK_ORDER: Array<{ key: keyof PanelsFromMe; port: number; path: string }> = [
  { key: 'staff', port: 3100, path: '/staff' },      // Prioritize staff context when in staff routes
  { key: 'admin', port: 3103, path: '/admin' },
  { key: 'doctor', port: 3107, path: '/doctor/dashboard' },
  { key: 'country', port: 3106, path: '/country/dashboard' },
  { key: 'owner', port: 3104, path: '/owner' },      // Owner checked after staff/doctor/clinic
  { key: 'partner', port: 3100, path: '/' },
];

/**
 * Get fallback URL when user has no access to current panel.
 * Returns common port (http://localhost:3100) or first panel they have access to.
 * Use after /auth/me when current panel access check fails.
 */
export function getFallbackUrlForPanels(panels: PanelsFromMe | null | undefined): string {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : `http://localhost:${COMMON_PORT}`;
  const base = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}`
    : 'http://localhost';

  if (!panels || typeof panels !== 'object') {
    return `${base}:${COMMON_PORT}`;
  }

  for (const { key, port, path } of FALLBACK_ORDER) {
    if (panels[key] === true) {
      return `${base}:${port}${path}`;
    }
  }

  return `${base}:${COMMON_PORT}`;
}
