"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiGet, apiPost } from "@/lib/api";

function roleLabel(role) {
  if (!role) return "";
  if (typeof role === "string") return role;
  return role.label || role.key || String(role.id || "");
}

export default function CountryInviteLandingPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params?.token || "");

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");

  const requiresRegistration = invite?.requiresRegistration === true;
  const canAccept = useMemo(() => {
    if (!invite) return false;
    if (accepting) return false;
    if (invite?.userExists && !isAuthenticated) return false;
    if (!requiresRegistration) return true;
    if (!password || password.length < 4) return false;
    if (password !== confirm) return false;
    return true;
  }, [invite, accepting, isAuthenticated, requiresRegistration, password, confirm]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [inviteRes, meRes] = await Promise.all([
          apiGet(`/api/v1/auth/invites/verify?token=${encodeURIComponent(token)}`),
          apiGet("/api/v1/auth/me").catch(() => null),
        ]);
        if (cancelled) return;
        const data = inviteRes?.data || inviteRes;
        setInvite(data || null);
        setIsAuthenticated(Boolean(meRes?.data?.id || meRes?.id));
        const dn = data?.displayName || "";
        if (dn) setFullName(String(dn));
      } catch (e) {
        if (!cancelled) setError(e?.message || "Invite is invalid or expired");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAccept() {
    if (!canAccept) return;
    setAccepting(true);
    setError("");
    try {
      const payload = requiresRegistration
        ? { token, password, displayName: fullName?.trim() || undefined }
        : { token };
      await apiPost("/api/v1/auth/invites/accept", payload);
      router.push("/country/dashboard");
      router.refresh();
    } catch (e) {
      setError(e?.message || "Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <section className="auth bg-base d-flex flex-wrap min-vh-100">
        <div className="auth-right py-32 px-24 d-flex flex-column justify-content-center w-100">
          <div className="max-w-464-px mx-auto w-100 text-center">
            <div className="text-secondary-light">Checking invitation…</div>
          </div>
        </div>
      </section>
    );
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
          <h4 className="mb-12">Country Staff Invitation</h4>
          <p className="mb-24 text-secondary-light text-lg">
            Review your invitation and accept to continue.
          </p>

          {error ? (
            <div className="alert alert-danger py-12 px-16 radius-8 mb-20" role="alert">
              {error}
            </div>
          ) : null}

          {invite ? (
            <div className="alert alert-success py-12 px-16 radius-8 mb-20" role="alert">
              <div className="fw-semibold mb-4">Invite verified ✅</div>
              <div className="text-sm">
                Email: <b>{invite.email}</b>
              </div>
              <div className="text-sm mt-2">
                Role: <b>{roleLabel(invite.role)}</b>
              </div>
              <div className="text-sm mt-2">
                Scope: <b>{invite.scopeType || "COUNTRY"}</b>
              </div>
              {invite?.country?.name && (
                <div className="text-sm mt-2">
                  Country: <b>{invite.country.name}</b>
                </div>
              )}
              {invite?.state?.name && (
                <div className="text-sm mt-2">
                  State: <b>{invite.state.name}</b>
                </div>
              )}
              {invite?.expiresAt && (
                <div className="text-sm mt-2">
                  Expires at: {new Date(invite.expiresAt).toLocaleString()}
                </div>
              )}
            </div>
          ) : null}

          {!invite ? null : invite.userExists && !isAuthenticated ? (
            <div className="alert alert-info py-12 px-16 radius-8 mb-20" role="alert">
              You already have an account. Please log in to accept this invitation.
            </div>
          ) : null}

          {!invite ? null : (
            <div className="d-flex flex-column gap-12">
              {invite.userExists && !isAuthenticated ? (
                <div className="d-flex gap-12">
                  <Link
                    href={`/country/login?next=${encodeURIComponent(`/country/invite/${token}`)}`}
                    className="btn btn-primary-600 text-sm btn-sm px-12 py-16 flex-grow-1 radius-12"
                  >
                    Login
                  </Link>
                  <Link
                    href={`/register?invite=${encodeURIComponent(token)}`}
                    className="btn btn-light text-sm btn-sm px-12 py-16 flex-grow-1 radius-12"
                  >
                    Create Account
                  </Link>
                </div>
              ) : (
                <>
                  {requiresRegistration ? (
                    <>
                      <div className="icon-field mb-8">
                        <input
                          type="text"
                          className="form-control h-56-px bg-neutral-50 radius-12"
                          placeholder="Full Name (Optional)"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          autoComplete="name"
                          disabled={accepting}
                        />
                        <span className="icon">
                          <i className="ri-user-3-line" />
                        </span>
                      </div>
                      <div className="icon-field mb-8">
                        <input
                          type="password"
                          className="form-control h-56-px bg-neutral-50 radius-12"
                          placeholder="Set Password (Minimum 4 characters)"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete="new-password"
                          disabled={accepting}
                          minLength={4}
                        />
                        <span className="icon">
                          <i className="ri-lock-password-line" />
                        </span>
                      </div>
                      <div className="icon-field mb-12">
                        <input
                          type="password"
                          className="form-control h-56-px bg-neutral-50 radius-12"
                          placeholder="Confirm Password"
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          autoComplete="new-password"
                          disabled={accepting}
                          minLength={4}
                        />
                        <span className="icon">
                          <i className="ri-lock-password-line" />
                        </span>
                      </div>
                    </>
                  ) : null}

                  <button
                    type="button"
                    className="btn btn-primary-600 text-sm btn-sm px-12 py-16 w-100 radius-12"
                    onClick={handleAccept}
                    disabled={!canAccept}
                  >
                    {accepting ? "Accepting..." : "Accept Invitation"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
