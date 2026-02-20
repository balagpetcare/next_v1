import { redirect } from "next/navigation";

/**
 * Staff landing: single source of truth → /staff/branch (branch selector).
 * Do NOT redirect to /staff/branches (that would create a loop with branches→/staff).
 */
export default function StaffPage() {
  redirect("/staff/branch");
}
