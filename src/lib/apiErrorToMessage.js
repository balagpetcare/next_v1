/**
 * Map API/backend errors to a safe user-facing message for toasts.
 * Does not leak stack traces or raw error objects.
 * @param {Error & { status?: number, response?: { message?: string, errors?: Record<string, string[]>, issues?: { path?: string, message?: string }[] } }} err
 * @returns {string}
 */
export function getMessageFromApiError(err) {
  if (!err) return "Something went wrong";
  const status = err.status;
  const res = err.response;
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  if (status >= 500) return "Server error. Please try again.";
  if (res?.message && typeof res.message === "string") return res.message;
  if (res?.error && typeof res.error === "string") return res.error;
  if (res?.errors && typeof res.errors === "object") {
    const first = Object.values(res.errors).flat().find(Boolean);
    if (first) return first;
  }
  if (Array.isArray(res?.issues) && res.issues[0]?.message) return res.issues[0].message;
  if (err.message && typeof err.message === "string") return err.message;
  return "Something went wrong";
}
