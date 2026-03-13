/**
 * Centralized state to clear on logout so re-login does not see stale branch/auth/workspace data.
 * Used by owner logout, staff logout, and any panel that must reset on sign-out.
 * Keys here are localStorage/sessionStorage keys that can block re-entry (e.g. lastActiveBranchId
 * causing redirect to a branch before auth/me or branch-access is rehydrated).
 */

/** Key used by staff branch selector and dashboard to remember last visited branch; must be cleared on logout */
export const LAST_ACTIVE_BRANCH_KEY = "lastActiveBranchId";

/** localStorage keys that must be cleared on logout to avoid stale re-login behavior */
export const LOGOUT_LOCAL_STORAGE_KEYS = [
  "access_token",
  "bpa_access_token",
  "token",
  "jwt",
  LAST_ACTIVE_BRANCH_KEY,
  "bpa_branch_id",
  "bpa_org_id",
  "bpa.owner.branchId",
  "selectedPanel",
  "intendedPanel",
] as const;

/** Cookie names that affect panel/next redirect and must be cleared on logout to prevent cross-panel loop */
export const LOGOUT_PANEL_COOKIE_NAMES = ["selectedPanel", "intendedPanel"] as const;

/**
 * Clear panel-selection cookies so re-login does not use stale panel (e.g. staff) and cause redirect loop.
 * Call from logout pages together with clearLogoutState().
 */
export function clearPanelCookiesOnLogout(): void {
  if (typeof document === "undefined") return;
  try {
    for (const name of LOGOUT_PANEL_COOKIE_NAMES) {
      document.cookie = `${name}=; path=/; max-age=0`;
    }
  } catch (_) {
    // ignore
  }
}

/**
 * Clear all auth, branch, and workspace-related client state.
 * Call from logout pages (owner, staff, etc.) before redirecting to login.
 * Clears localStorage, sessionStorage, and panel cookies (selectedPanel, intendedPanel).
 * Does not clear auth cookies (handled by backend /api/logout or backend auth/logout).
 */
export function clearLogoutState(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of LOGOUT_LOCAL_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
    window.sessionStorage.clear();
    clearPanelCookiesOnLogout();
  } catch (_) {
    // ignore
  }
}
