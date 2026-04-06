/** Maps API errors (403 permission, etc.) to owner-safe messages */
export function formatAllocationApiError(e: unknown, context: "list" | "detail" | "action"): string {
  if (!(e instanceof Error)) return "Something went wrong. Try again.";
  const x = e as Error & { status?: number; code?: string; requiredPermissions?: string[] };
  if (x.status === 403) {
    const req = x.requiredPermissions?.length ? ` Required permission (one of): ${x.requiredPermissions.join(", ")}.` : "";
    if (x.code === "MISSING_PERMISSION" || /permission/i.test(x.message)) {
      if (context === "list") return `Access denied. You need warehouse allocation or warehouse management permissions to view this board.${req}`;
      if (context === "detail") return `Access denied. You cannot open this allocation plan.${req}`;
      return `Access denied.${req}`;
    }
    return x.message || "Access denied.";
  }
  return x.message || "Failed";
}
