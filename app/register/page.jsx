"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { detectAuthType, validateRegistration } from "@/src/utils/authHelpers";
import { apiPost } from "@/lib/api";
import AuthFooter from "@/src/bpa/components/AuthFooter";

/**
 * Unified Registration Page with WowDash Template Design
 * - If invite token is present: Shows invite-based registration
 * - Otherwise: Shows direct user registration
 * - Checks if user is already logged in and provides login option
 */
const API_BASE =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL) || "http://localhost:3000";

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { "Accept": "application/json" },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.message || json?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

// Invite-based Registration Component with WowDash Design
function InviteRegistration({ token, onSuccess, isAuthenticated, userInfo }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [requiresRegistration, setRequiresRegistration] = useState(true);
  const [userExists, setUserExists] = useState(false);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const inviteRoleLabel = useMemo(() => {
    const role = inviteInfo?.role;
    if (!role) return "";
    if (typeof role === "string") return role;
    if (typeof role === "object") return role.label || role.key || String(role.id || "");
    return String(role);
  }, [inviteInfo]);

  const canSubmit = useMemo(() => {
    if (!token) return false;
    if (!verified) return false;
    if (submitting) return false;
    if (userExists && !isAuthenticated) return false;
    // For existing users, no password needed
    if (!requiresRegistration) return true;
    // For new users, password is required
    if (!password || password.length < 4) return false;
    if (password !== confirm) return false;
    return true;
  }, [token, verified, password, confirm, submitting, requiresRegistration, userExists, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError("");
      setInviteInfo(null);
      setVerified(false);

      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const j = await apiGet(`/api/v1/auth/invites/verify?token=${encodeURIComponent(token)}`);
        if (cancelled) return;

        const data = j?.data || j;
        setInviteInfo(data || null);
        setVerified(true);
        setRequiresRegistration(data?.requiresRegistration !== false);
        setUserExists(data?.userExists === true);

        const dn = data?.displayName || data?.fullName || "";
        if (dn) setFullName(String(dn));

        // If user exists but is not logged in, show message to login first
        if (data?.userExists && !isAuthenticated) {
          setError("You already have an account. Please log in first to accept this invitation.");
        }
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Invite is invalid or expired");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [token, isAuthenticated]);

  async function handleAccept() {
    if (submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const payload = requiresRegistration
        ? {
            token,
            password,
            displayName: fullName?.trim() || undefined,
          }
        : {
            token,
          };

      const j = await apiPost(`/api/v1/auth/invites/accept`, payload);

      const accessToken = j?.token || j?.data?.token || j?.data?.accessToken;
      if (accessToken) {
        try {
          localStorage.setItem("bpa_access_token", String(accessToken));
        } catch {}
      }

      onSuccess?.();
    } catch (e) {
      setError(e?.message || "Failed to accept invitation");
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    await handleAccept();
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
            <h4 className="mb-12">Complete Registration</h4>
            <p className="mb-32 text-secondary-light text-lg">
              Finish your signup using the invitation link.
            </p>
          </div>

          {!token ? (
            <div className="alert alert-warning py-12 px-16 radius-8 mb-20" role="alert">
              No invite token found in the URL.
            </div>
          ) : null}

          {error ? (
            <div className="alert alert-danger py-12 px-16 radius-8 mb-20" role="alert">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="text-center py-24">
              <div className="text-secondary-light">Checking invitation…</div>
            </div>
          ) : verified ? (
            <div className="mb-20">
              {isAuthenticated ? (
                <div className="alert alert-info py-12 px-16 radius-8 mb-20" role="alert">
                  You are signed in as {userInfo?.email || userInfo?.phone || "your account"}.
                </div>
              ) : null}
              <div className="alert alert-success py-12 px-16 radius-8 mb-20" role="alert">
                <div className="fw-semibold mb-4">Invite verified ✅</div>
               
                {inviteInfo?.expiresAt ? (
                  <div className="text-sm mt-4">
                    Expires at: {new Date(inviteInfo.expiresAt).toLocaleString()}
                  </div>
                ) : null}
                {inviteInfo?.branch?.name && (
                  <div className="text-sm mt-4">
                    Branch: <b>{inviteInfo.branch.name}</b>
                  </div>
                )}
                {inviteInfo?.org?.name && (
                  <div className="text-sm mt-4">
                    Organization: <b>{inviteInfo.org.name}</b>
                  </div>
                )}
                {inviteInfo?.role && (
                  <div className="text-sm mt-4">
                    Role: <b>{inviteRoleLabel}</b>
                  </div>
                )}
              </div>

              {!requiresRegistration ? (
                // Accept/Decline form for existing users
                <div className="mb-20">
                  <div className="alert alert-info py-12 px-16 radius-8 mb-20" role="alert">
                    <div className="fw-semibold mb-4">You already have an account</div>
                    <div className="text-sm">
                      You can accept this invitation without creating a new account. No password is required.
                    </div>
                  </div>

                  <div className="d-flex gap-12">
                    <button
                      type="button"
                      className="btn btn-primary-600 text-sm btn-sm px-12 py-16 flex-grow-1 radius-12"
                      onClick={handleAccept}
                      disabled={submitting}
                    >
                      {submitting ? "Accepting..." : "Accept Invitation"}
                    </button>
                    <Link
                      href="/login"
                      className="btn btn-outline-secondary text-sm btn-sm px-12 py-16 flex-grow-1 radius-12"
                    >
                      Go to Login
                    </Link>
                  </div>
                </div>
              ) : (
                // Registration form for new users
                <form onSubmit={onSubmit}>
                <div className="icon-field mb-16">
                  <input
                    type="text"
                    className="form-control h-56-px bg-neutral-50 radius-12"
                    placeholder="Full Name (Optional)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    disabled={submitting}
                  />
                  <span className="icon">
                    <i className="ri-user-3-line" />
                  </span>
                </div>

                <div className="icon-field mb-16">
                  <input
                    type="password"
                    className={`form-control h-56-px bg-neutral-50 radius-12 ${password && password.length < 4 ? "is-invalid" : ""}`}
                    placeholder="Set Password (Minimum 4 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    disabled={submitting}
                    minLength={4}
                  />
                  <span className="icon">
                    <i className="ri-lock-password-line" />
                  </span>
                  {password && password.length < 4 && (
                    <div className="text-danger small mt-4">Password must be at least 4 characters</div>
                  )}
                </div>

                <div className="icon-field mb-20">
                  <input
                    type="password"
                    className={`form-control h-56-px bg-neutral-50 radius-12 ${password !== confirm && confirm ? "is-invalid" : ""}`}
                    placeholder="Confirm Password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    disabled={submitting}
                  />
                  <span className="icon">
                    <i className="ri-lock-password-line" />
                  </span>
                  {password !== confirm && confirm && (
                    <div className="text-danger small mt-4">Passwords do not match</div>
                  )}
                </div>

                  <button
                    type="submit"
                    className="btn btn-primary-600 text-sm btn-sm px-12 py-16 w-100 radius-12 mb-16"
                    disabled={!canSubmit}
                  >
                    {submitting ? "Creating Account..." : "Create Account"}
                  </button>
                </form>
              )}
            </div>
          ) : null}

          <div className="mt-24 text-center">
            <p className="text-secondary-light text-sm mb-0">
              Already have an account?{" "}
              <Link href="/login" className="text-primary-600 fw-semibold">
                Sign In
              </Link>
            </p>
          </div>

          <AuthFooter />
        </div>
      </div>
    </section>
  );
}

// Direct User Registration Component with WowDash Design
function UserRegistration({ onSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const authType = useMemo(() => {
    if (!identifier.trim()) return null;
    return detectAuthType(identifier);
  }, [identifier]);

  const validation = useMemo(() => {
    return validateRegistration({
      identifier,
      password,
      name,
    });
  }, [identifier, password, name]);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (!validation.valid) return false;
    if (password !== confirmPassword) return false;
    if (password.length < 4) return false;
    return true;
  }, [loading, validation, password, confirmPassword]);

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setLoading(true);

    try {
      const detected = detectAuthType(identifier);
      if (!detected.type) {
        setError("Please enter a valid email or phone number");
        setLoading(false);
        return;
      }

      const payload = {
        password,
        ...(detected.type === "email" ? { email: detected.normalized } : { phone: detected.normalized }),
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(address.trim() ? { address: address.trim() } : {}),
      };

      await apiPost("/api/v1/auth/register", payload);
      onSuccess?.();
    } catch (e) {
      setError(e?.message || "Registration failed");
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
            <h4 className="mb-12">Create Account</h4>
            <p className="mb-32 text-secondary-light text-lg">
              Register a new user account to get started.
            </p>
          </div>

          {error ? (
            <div className="alert alert-danger py-12 px-16 radius-8 mb-20" role="alert">
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit}>
            <div className="icon-field mb-16">
              <input
                type="text"
                className={`form-control h-56-px bg-neutral-50 radius-12 ${validation.errors.identifier ? "is-invalid" : ""}`}
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
              {validation.errors.identifier && (
                <div className="text-danger small mt-4">{validation.errors.identifier}</div>
              )}
              {identifier && !authType?.type && !validation.errors.identifier && (
                <div className="text-danger small mt-4">
                  Please enter a valid email or phone number
                </div>
              )}
            </div>

            <div className="icon-field mb-16">
              <input
                type="text"
                className="form-control h-56-px bg-neutral-50 radius-12"
                placeholder="Full Name (Optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                disabled={loading}
              />
              <span className="icon">
                <i className="ri-user-3-line" />
              </span>
            </div>

            <div className="icon-field mb-16">
              <input
                type="password"
                className={`form-control h-56-px bg-neutral-50 radius-12 ${validation.errors.password ? "is-invalid" : ""}`}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={loading}
                minLength={4}
              />
              <span className="icon">
                <i className="ri-lock-password-line" />
              </span>
              {validation.errors.password && (
                <div className="text-danger small mt-4">{validation.errors.password}</div>
              )}
            </div>

            <div className="icon-field mb-16">
              <input
                type="password"
                className={`form-control h-56-px bg-neutral-50 radius-12 ${password !== confirmPassword && confirmPassword ? "is-invalid" : ""}`}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={loading}
              />
              <span className="icon">
                <i className="ri-lock-password-line" />
              </span>
              {password !== confirmPassword && confirmPassword && (
                <div className="text-danger small mt-4">Passwords do not match</div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary-600 text-sm btn-sm px-12 py-16 w-100 radius-12"
              disabled={!canSubmit}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>

            <div className="mt-24 text-center">
              <p className="text-secondary-light text-sm mb-0">
                Already have an account?{" "}
                <Link href="/login" className="text-primary-600 fw-semibold">
                  Sign In
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

// Main Registration Page with Authentication Check
function RegisterPageContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("invite") || sp.get("token") || "";
  const [success, setSuccess] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Check if user is already logged in
  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const me = await apiGet("/api/v1/auth/me");
        if (cancelled) return;
        
        const userData = me?.data || me;
        if (userData && userData.id) {
          setIsAuthenticated(true);
          setUserInfo(userData);
        }
      } catch (e) {
        // User is not authenticated
        setIsAuthenticated(false);
      } finally {
        if (!cancelled) setCheckingAuth(false);
      }
    }

    checkAuth();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSuccess = () => {
    setSuccess(true);
    setTimeout(() => {
      router.push("/login?registered=1");
    }, 2000);
  };

  // Show loading state while checking authentication
  if (checkingAuth) {
    return (
      <section className="auth bg-base d-flex flex-wrap min-vh-100">
        <div className="auth-right py-32 px-24 d-flex flex-column justify-content-center w-100">
          <div className="max-w-464-px mx-auto w-100 text-center">
            <div className="text-secondary-light">Loading...</div>
          </div>
        </div>
      </section>
    );
  }

  // Show success message
  if (success) {
    return (
      <section className="auth bg-base d-flex flex-wrap min-vh-100">
        <div className="auth-right py-32 px-24 d-flex flex-column justify-content-center w-100">
          <div className="max-w-464-px mx-auto w-100">
            <div className="card p-32 radius-12 text-center">
              <div className="mb-16">
                <div className="text-success" style={{ fontSize: 64 }}>
                  <i className="ri-checkbox-circle-fill" />
                </div>
              </div>
              <h4 className="mb-8">Registration Successful!</h4>
              <p className="text-secondary-light mb-16">Your account has been created successfully.</p>
              <p className="text-secondary-light text-sm">Redirecting to login page...</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // If invite token is present, always show invite-based registration
  if (token) {
    return (
      <InviteRegistration
        token={token}
        onSuccess={handleSuccess}
        isAuthenticated={isAuthenticated}
        userInfo={userInfo}
      />
    );
  }

  // If user is already authenticated, show message with login option
  if (isAuthenticated) {
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
              <h4 className="mb-12">Already Signed In</h4>
              <p className="mb-32 text-secondary-light text-lg">
                You are already logged in to your account.
              </p>
            </div>

            <div className="alert alert-info py-12 px-16 radius-8 mb-20" role="alert">
              <div className="fw-semibold mb-4">
                {userInfo?.name || userInfo?.email || userInfo?.phone || "User"}
              </div>
              <div className="text-sm">
                {userInfo?.email && <div>Email: {userInfo.email}</div>}
                {userInfo?.phone && <div>Phone: {userInfo.phone}</div>}
              </div>
            </div>

            <div className="d-flex flex-column gap-12">
              <Link
                href="/"
                className="btn btn-primary-600 text-sm btn-sm px-12 py-16 w-100 radius-12"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/login"
                className="btn btn-light text-sm btn-sm px-12 py-16 w-100 radius-12"
              >
                Sign In to Different Account
              </Link>
            </div>

            <AuthFooter />
          </div>
        </div>
      </section>
    );
  }

  // Otherwise, show direct user registration
  return <UserRegistration onSuccess={handleSuccess} />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-vh-100 d-flex align-items-center justify-content-center text-secondary">Loading…</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
