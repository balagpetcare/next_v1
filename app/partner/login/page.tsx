"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";
import { detectAuthType } from "@/src/utils/authHelpers";
import AuthFooter from "@/src/bpa/components/AuthFooter";

export default function PartnerLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const authType = useMemo(() => {
    if (!identifier.trim()) return null;
    return detectAuthType(identifier);
  }, [identifier]);

  const canSubmit = useMemo(() => {
    return identifier.trim().length > 0 && password.length > 0 && !loading && authType?.type;
  }, [identifier, password, loading, authType]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const detected = detectAuthType(identifier);
      if (!detected.type) {
        setError("Please enter a valid email or phone number");
        setLoading(false);
        return;
      }

      const payload = detected.type === "email"
        ? { email: detected.normalized, password }
        : { phone: detected.normalized, password };

      await apiPost("/api/v1/auth/login", payload);
      router.push("/partner/apply");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Login failed");
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
            <h4 className="mb-12">Partner Sign In</h4>
            <p className="mb-32 text-secondary-light text-lg">
              Sign in to submit or manage your partner application.
            </p>
          </div>

          {error ? (
            <div className="alert alert-danger py-12 px-16 radius-8 mb-20" role="alert">
              {error}
            </div>
          ) : null}

          <form onSubmit={submit}>
            <div className="icon-field mb-16">
              <input
                type="text"
                className="form-control h-56-px bg-neutral-50 radius-12"
                placeholder="Email or Phone Number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                disabled={loading}
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

            <div className="icon-field mb-20">
              <input
                type="password"
                className="form-control h-56-px bg-neutral-50 radius-12"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
              <span className="icon">
                <i className="ri-lock-password-line" />
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary-600 text-sm btn-sm px-12 py-16 w-100 radius-12"
              disabled={!canSubmit}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div className="mt-24 text-center">
              <span className="text-secondary-light text-sm">
                After login, you’ll be redirected to: <code>/partner/apply</code>
              </span>
            </div>
          </form>

          <AuthFooter />
        </div>
      </div>
    </section>
  );
}
