"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { detectAuthType } from "@/src/utils/authHelpers";
import AuthFooter from "@/src/bpa/components/AuthFooter";
import { isAllowedReturnTo } from "@/lib/authRedirect";

// Use relative /api so request goes to same origin (e.g. 3104); Next.js rewrites to API and cookies work
function apiBase() {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
}

async function apiPost(path, body) {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Request failed");
  return json;
}

function LoginPageContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const invited = sp.get("invited") === "1";
  const registered = sp.get("registered") === "1";

  const [identifier, setIdentifier] = useState(""); // email or phone
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const authType = useMemo(() => {
    if (!identifier.trim()) return null;
    return detectAuthType(identifier);
  }, [identifier]);

  const canSubmit = useMemo(() => {
    return identifier.trim().length > 0 && password.length > 0 && !loading && authType?.type;
  }, [identifier, password, loading, authType]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setErr("");
    setLoading(true);
    try {
      const detected = detectAuthType(identifier);
      if (!detected.type) {
        setErr("Please enter a valid email or phone number");
        setLoading(false);
        return;
      }

      const payload = detected.type === "email"
        ? { email: detected.normalized, password }
        : { phone: detected.normalized, password };

      // Use admin login API when destination is admin panel (validates whitelist, avoids 403 loop)
      const app = sp.get("app");
      const returnTo = sp.get("returnTo");
      const isAdminFlow = app === "admin" || (returnTo && returnTo.includes("/admin"));
      const loginPath = isAdminFlow ? "/api/v1/admin/auth/login" : "/api/v1/auth/login";

      const response = await apiPost(loginPath, payload);

      const origin = typeof window !== "undefined" ? window.location.origin : "";

      // Post-auth-landing is the ONLY post-login landing for ALL users.
      // Honor returnTo/next only when explicitly provided and allowed; otherwise always use post-auth-landing.
      let targetPath = null;
      const returnTo = sp.get("returnTo");
      const nextPath = sp.get("next");
      const targetUrl = returnTo
        ? returnTo
        : nextPath
        ? (nextPath.startsWith("/") ? origin + nextPath : origin + "/" + nextPath)
        : null;
      const allowedTarget = targetUrl && isAllowedReturnTo(targetUrl, origin) ? targetUrl : null;

      if (allowedTarget) {
        const path = allowedTarget.startsWith("/") ? allowedTarget : new URL(allowedTarget).pathname;
        // Never land on /mother; route through post-auth-landing
        targetPath = path === "/mother" || path === "/mother/" ? "/post-auth-landing" : path;
      }
      if (!targetPath) targetPath = "/post-auth-landing";

      if (targetPath.startsWith("http")) {
        window.location.href = targetPath;
      } else {
        router.push(targetPath);
      }
    } catch (e2) {
      setErr(e2?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="auth bg-base d-flex flex-wrap min-vh-100">
      <div className="auth-left d-lg-block d-none">
        <div className="d-flex align-items-center flex-column h-100 justify-content-center">
          <img src="/assets/images/auth/auth-img.png" alt="Auth" />
        </div>
      </div>

      <div className="auth-right py-32 px-24 d-flex flex-column justify-content-center">
        <div className="max-w-464-px mx-auto w-100">
          <div>
            <Link href="/" className="mb-40 max-w-290-px d-inline-block">
              <img src="/assets/images/logo.png" alt="BPA" />
            </Link>
            <h4 className="mb-12">Sign In to your Account</h4>
            <p className="mb-32 text-secondary-light text-lg">
              Welcome back! please enter your detail
            </p>
          </div>

          {invited ? (
            <div className="alert alert-success py-12 px-16 radius-8 mb-20">
              Your account was created successfully. Please login to continue.
            </div>
          ) : null}

          {registered ? (
            <div className="alert alert-success py-12 px-16 radius-8 mb-20">
              Registration successful! Please login to continue.
            </div>
          ) : null}

          {err ? (
            <div className="alert alert-danger py-12 px-16 radius-8 mb-20">
              {err}
            </div>
          ) : null}

          <form onSubmit={onSubmit}>
            <div className="icon-field mb-16">
              <input
                type="text"
                className={`form-control h-56-px bg-neutral-50 radius-12 ${identifier && !authType?.type ? "is-invalid" : ""}`}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or Phone Number"
                autoComplete="username"
              />
              <span className="icon">
                <i className={authType?.type === "email" ? "ri-mail-line" : "ri-phone-line"} />
              </span>
              {identifier && !authType?.type && (
                <div className="text-danger small mt-4">
                  Please enter a valid email or phone number
                </div>
              )}
            </div>

            <div className="position-relative mb-20">
              <div className="icon-field">
                <input
                  type="password"
                  className="form-control h-56-px bg-neutral-50 radius-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                />
                <span className="icon">
                  <i className="ri-lock-password-line" />
                </span>
              </div>
            </div>

            <div className="">
              <div className="d-flex justify-content-between gap-2">
                <div className="form-check style-check d-flex align-items-center">
                  <input
                    className="form-check-input border border-neutral-300"
                    type="checkbox"
                    id="remeber"
                  />
                  <label className="form-check-label" htmlFor="remeber">
                    Remember me
                  </label>
                </div>
                <Link href="/forgot-password" className="text-primary-600 fw-medium">
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary-600 text-sm btn-sm px-12 py-16 w-100 radius-12 mt-32"
              disabled={!canSubmit}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="mt-32 text-center text-sm">
              <p className="mb-0">
                Don't have an account?{" "}
                <Link href="/register" className="text-primary-600 fw-semibold">
                  Sign Up
                </Link>
              </p>
            </div>
          </form>

          <AuthFooter />
        </div>
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-vh-100 d-flex align-items-center justify-content-center text-secondary">Loading…</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
