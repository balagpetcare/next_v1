"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Col, Row, Button, FormCheck } from "react-bootstrap";
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

      // Use admin login API when destination is admin panel (validates whitelist, avoids 403 loop).
      // When on admin app port (3103), default to admin flow so /login alone works for super admin.
      const app = sp.get("app");
      const returnTo = sp.get("returnTo");
      const onAdminPort = typeof window !== "undefined" && String(window.location.port) === "3103";
      const isAdminFlow = app === "admin" || (returnTo && returnTo.includes("/admin")) || onAdminPort;
      const loginPath = isAdminFlow ? "/api/v1/admin/auth/login" : "/api/v1/auth/login";

      const response = await apiPost(loginPath, payload);

      const origin = typeof window !== "undefined" ? window.location.origin : "";

      // Post-auth-landing is the ONLY post-login landing for ALL users.
      // Honor returnTo/next only when explicitly provided and allowed; otherwise always use post-auth-landing.
      let targetPath = null;
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
      if (!targetPath) targetPath = isAdminFlow && onAdminPort ? "/admin" : "/post-auth-landing";

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
