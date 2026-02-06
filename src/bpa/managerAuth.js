import { apiFetch } from "./apiClient";

export async function managerLogin({ identifier, password }) {
  const path = process.env.NEXT_PUBLIC_MANAGER_LOGIN_PATH || "/api/v1/admin/auth/login";
  return apiFetch(path, {
    method: "POST",
    body: JSON.stringify({ phone: identifier, email: identifier, password }),
  });
}

export async function managerLogout() {
  const path = process.env.NEXT_PUBLIC_MANAGER_LOGOUT_PATH || "/api/v1/admin/auth/logout";
  return apiFetch(path, { method: "POST" });
}
