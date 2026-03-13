"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Col, Row, Button, FormCheck } from "react-bootstrap";
import { detectAuthType } from "@/src/utils/authHelpers";
import AuthFooter from "@/src/bpa/components/AuthFooter";
import { isAllowedReturnTo, getBrowserSafeApiBase } from "@/lib/authRedirect";

const POST_LOGIN_REDIRECT_DELAY_MS = 120;

async function apiPost(path, body) {
  const base = getBrowserSafeApiBase();
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || "Request failed");
  return json;
}

/** Delay full-page redirect so the browser has time to commit Set-Cookie from the login response. */
function scheduleRedirect(url) {
  if (process.env.NODE_ENV === "development") {
    console.info("[login] success redirect in 120ms", { target: url });
  }
  setTimeout(() => {
    window.location.href = url;
  }, POST_LOGIN_REDIRECT_DELAY_MS);
}

/** Paths that require auth; use full-page redirect with delay so cookie is sent on first request. */
function isProtectedPath(path) {
  if (!path || typeof path !== "string") return false;
  const p = path.startsWith("/") ? path : `/${path}`;
  return (
    p === "/owner" || p.startsWith("/owner/") ||
    p === "/staff" || p.startsWith("/staff/") ||
    p === "/admin" || p.startsWith("/admin/") ||
    p === "/post-auth-landing" || p.startsWith("/post-auth-landing/") ||
    p === "/country" || p.startsWith("/country/") ||
    p === "/mother" || p.startsWith("/mother/") ||
    p === "/shop" || p.startsWith("/shop/") ||
    p === "/clinic" || p.startsWith("/clinic/")
  );
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
      if (process.env.NODE_ENV === "development") {
        console.info("[login] submit context: client (browser)", { hasWindow: typeof window !== "undefined" });
      }
      const detected = detectAuthType(identifier);
      if (!detected.type) {
        setErr("Please enter a valid email or phone number");
        setLoading(false);
        return;
      }

      const payload = detected.type === "email"
        ? { email: detected.normalized, password }
        : { phone: detected.normalized, password };

      // Use panel-specific login API when destination is that panel (validates access, sets cookie on same origin).
      const app = sp.get("app");
      const returnTo = sp.get("returnTo");
      const onAdminPort = typeof window !== "undefined" && String(window.location.port) === "3103";
      const onDoctorPort = typeof window !== "undefined" && String(window.location.port) === "3107";
      const isAdminFlow = app === "admin" || (returnTo && returnTo.includes("/admin")) || onAdminPort;
      const isDoctorFlow = app === "doctor" || (returnTo && returnTo.includes("/doctor")) || onDoctorPort;
      const isStaffFlow = app === "staff" || (returnTo && returnTo.includes("/staff"));
      const loginPath = isAdminFlow
        ? "/api/v1/admin/auth/login"
        : isDoctorFlow
          ? "/api/v1/doctor/auth/login"
          : isStaffFlow
            ? "/api/v1/auth/staff/login"
            : "/api/v1/auth/login";

      if (process.env.NODE_ENV === "development") {
        console.info("[login] fetch: browser-initiated", { loginPath, app, isStaffFlow, isAdminFlow, isDoctorFlow });
      }
      const response = await apiPost(loginPath, payload);

      const origin = typeof window !== "undefined" ? window.location.origin : "";

      // Doctor panel: dedicated API returns redirectPath; go there directly (no post-auth-landing).
      if (isDoctorFlow && response?.redirectPath) {
        const path = response.redirectPath.startsWith("/") ? response.redirectPath : `/${response.redirectPath}`;
        const url = path.startsWith("http") ? path : `${origin}${path}`;
        window.location.href = url;
        return;
      }

      // Post-auth-landing for non-doctor; honor returnTo/next when allowed.
      // Never use a cross-panel target: owner login must not redirect to /staff; staff login must not redirect to /owner.
      let targetPath = null;
      const nextPath = sp.get("next");
      const targetUrl = returnTo
        ? returnTo
        : nextPath
        ? (nextPath.startsWith("/") ? origin + nextPath : origin + "/" + nextPath)
        : null;
      let allowedTarget = targetUrl && isAllowedReturnTo(targetUrl, origin) ? targetUrl : null;
      const pathOnly = !allowedTarget ? null : allowedTarget.startsWith("http") ? new URL(allowedTarget).pathname : (allowedTarget.startsWith("/") ? allowedTarget : `/${allowedTarget}`);
      const isStaffPath = pathOnly === "/staff" || (pathOnly && pathOnly.startsWith("/staff/"));
      const isOwnerPath = pathOnly === "/owner" || (pathOnly && pathOnly.startsWith("/owner/"));
      // Never send staff back to the staff login page after successful login (avoids redirect loop).
      const isStaffLoginPath = pathOnly === "/staff/login" || (pathOnly && pathOnly.startsWith("/staff/login/"));
      if (allowedTarget && isStaffFlow && isOwnerPath) allowedTarget = null;
      if (allowedTarget && isStaffFlow && isStaffLoginPath) allowedTarget = null;
      if (allowedTarget && !isStaffFlow && !isAdminFlow && !isDoctorFlow && isStaffPath) allowedTarget = null;

      if (allowedTarget) {
        const isFullUrl = allowedTarget.startsWith("http://") || allowedTarget.startsWith("https://");
        if (process.env.NODE_ENV === "development" && isStaffFlow) {
          console.info("[staff-login] redirect after success", { allowedTarget, isFullUrl });
        }
        if (isFullUrl) {
          scheduleRedirect(allowedTarget);
          return;
        }
        const path = allowedTarget;
        targetPath = path === "/mother" || path === "/mother/" ? "/post-auth-landing" : path;
      }
      if (!targetPath) targetPath = isAdminFlow && onAdminPort ? "/admin" : isStaffFlow ? "/staff" : "/post-auth-landing";

      // Staff-only: never send staff to post-auth-landing; always full-page redirect to /staff
      // so cookie is applied and auth/me will succeed on /staff (avoids post-auth-landing 401).
      const usedStaffLogin = loginPath === "/api/v1/auth/staff/login";
      if (usedStaffLogin && targetPath === "/post-auth-landing") {
        targetPath = "/staff";
      }
      if (usedStaffLogin) {
        const staffUrl = targetPath.startsWith("http") ? targetPath : `${origin}${targetPath}`;
        if (process.env.NODE_ENV === "development") {
          console.info("[staff-login] redirect to staff", { staffUrl });
        }
        scheduleRedirect(staffUrl);
        return;
      }

      // Owner + generic login: use full-page redirect to post-auth-landing so cookie is committed before auth/me.
      const usedOwnerOrGenericLogin = loginPath === "/api/v1/auth/login";
      if (usedOwnerOrGenericLogin && targetPath === "/post-auth-landing") {
        if (process.env.NODE_ENV === "development") {
          console.info("[login] owner/generic -> post-auth-landing (full page)", { targetPath });
        }
        scheduleRedirect(`${origin}/post-auth-landing`);
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.info("[login] success redirect", { targetPath, allowedTarget: allowedTarget || null });
      }
      if (targetPath.startsWith("http")) {
        scheduleRedirect(targetPath);
      } else if (isProtectedPath(targetPath)) {
        scheduleRedirect(`${origin}${targetPath.startsWith("/") ? targetPath : "/" + targetPath}`);
      } else {
        router.push(targetPath);
      }
    } catch (e2) {
      if (process.env.NODE_ENV === "development") {
        console.info("[login] failed", e2?.message || "Login failed");
      }
      setErr(e2?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex flex-column vh-100 p-3">
      <div className="d-flex flex-column flex-grow-1">
        <Row className="h-100">
          <Col xxl={7}>
            <Row className="justify-content-center h-100">
              <Col lg={6} className="py-lg-5">
                <div className="d-flex flex-column h-100 justify-content-center">
                  <div className="auth-logo mb-4">
                    <Link href="/" className="d-inline-block">
                      <img src="/assets/images/logo.png" alt="BPA" height={32} />
                    </Link>
                  </div>
                  <h2 className="fw-bold fs-24">Sign In</h2>
                  <p className="text-muted mt-1 mb-4">
                    Enter your email or phone and password to access your account.
                  </p>

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

                  <div className="mb-5">
                    <form className="authentication-form" onSubmit={onSubmit}>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="login-identifier">
                          Email or Phone
                        </label>
                        <div className={`input-group ${identifier && !authType?.type ? "is-invalid" : ""}`}>
                          <span className="input-group-text bg-light border-end-0">
                            <i className={authType?.type === "email" ? "ri-mail-line" : "ri-phone-line"} />
                          </span>
                          <input
                            id="login-identifier"
                            type="text"
                            className={`form-control ${identifier && !authType?.type ? "is-invalid" : ""}`}
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Enter your email or phone number"
                            autoComplete="username"
                          />
                        </div>
                        {identifier && !authType?.type && (
                          <div className="text-danger small mt-1">
                            Please enter a valid email or phone number
                          </div>
                        )}
                      </div>

                      <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label className="form-label mb-0" htmlFor="login-password">
                            Password
                          </label>
                          <Link href="/forgot-password" className="text-muted text-decoration-none small">
                            Forgot password?
                          </Link>
                        </div>
                        <div className="input-group">
                          <span className="input-group-text bg-light border-end-0">
                            <i className="ri-lock-password-line" />
                          </span>
                          <input
                            id="login-password"
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            autoComplete="current-password"
                          />
                        </div>
                      </div>

                      <div className="mb-3">
                        <FormCheck type="checkbox" id="login-remember" label="Remember me" />
                      </div>

                      <div className="mb-4 text-center d-grid">
                        <Button variant="primary" type="submit" disabled={!canSubmit}>
                          {loading ? "Signing in..." : "Sign In"}
                        </Button>
                      </div>
                    </form>

                    <p className="text-muted text-center mb-0">
                      Don&apos;t have an account?{" "}
                      <Link href="/register" className="text-dark fw-bold">
                        Sign Up
                      </Link>
                    </p>
                  </div>

                  <AuthFooter />
                </div>
              </Col>
            </Row>
          </Col>
          <Col xxl={5} className="d-none d-xxl-flex">
            <Card className="h-100 mb-0 overflow-hidden">
              <div className="d-flex flex-column h-100">
                <img
                  src="/assets/images/auth/auth-img.png"
                  alt="Auth"
                  className="w-100 h-100 object-fit-cover"
                  style={{ objectFit: "cover" }}
                />
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-vh-100 d-flex align-items-center justify-content-center text-secondary">Loading…</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
