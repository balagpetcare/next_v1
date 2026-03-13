/**
 * Serve the new supply request form at .../supply-requests/create (same as .../supply-request-create).
 * Re-export so both URLs work even if the canonical route 404s in some environments.
 */
export { default } from "../../supply-request-create/page";
