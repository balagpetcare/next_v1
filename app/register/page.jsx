"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, Col, Row, Button } from "react-bootstrap";
import { detectAuthType, validateRegistration } from "@/src/utils/authHelpers";
import { apiPost } from "@/lib/api";
import AuthFooter from "@/src/bpa/components/AuthFooter";

/** Larkon-style two-column layout wrapper: form left, image right */
function LarkonAuthLayout({ children }) {
  return (
    <div className="d-flex flex-column vh-100 p-3">
      <div className="d-flex flex-column flex-grow-1">
        <Row className="h-100">
          <Col xxl={7}>
            <Row className="justify-content-center h-100">
              <Col lg={6} className="py-lg-5">
                <div className="d-flex flex-column h-100 justify-content-center">
                  {children}
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
                  className="w-100 h-100"
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
    <LarkonAuthLayout>
      <div className="auth-logo mb-4">
        <Link href="/" className="d-inline-block">
          <img src="/assets/images/logo.png" alt="BPA" height={32} />
        </Link>
      </div>
      <h2 className="fw-bold fs-24">Complete Registration</h2>
      <p className="text-muted mt-1 mb-4">Finish your signup using the invitation link.</p>

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
          <div className="text-muted">Checking invitation…</div>
        </div>
      ) : verified ? (
        <div className="mb-5">
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
            <div className="mb-4">
              <div className="alert alert-info py-12 px-16 radius-8 mb-20" role="alert">
                <div className="fw-semibold mb-4">You already have an account</div>
                <div className="text-sm">
                  You can accept this invitation without creating a new account. No password is required.
                </div>
              </div>
              <div className="d-flex gap-2">
                <Button variant="primary" onClick={handleAccept} disabled={submitting} className="flex-grow-1">
                  {submitting ? "Accepting..." : "Accept Invitation"}
                </Button>
                <Link href="/login" className="btn btn-outline-secondary flex-grow-1 text-center">
                  Go to Login
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="authentication-form">
              <div className="mb-3">
                <label className="form-label" htmlFor="invite-fullname">Full Name (Optional)</label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-end-0">
                    <i className="ri-user-3-line" />
                  </span>
                  <input
                    id="invite-fullname"
                    type="text"
                    className="form-control"
                    placeholder="Full Name (Optional)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="invite-password">Set Password (min 4 characters)</label>
                <div className={`input-group ${password && password.length < 4 ? "is-invalid" : ""}`}>
                  <span className="input-group-text bg-light border-end-0">
                    <i className="ri-lock-password-line" />
                  </span>
                  <input
                    id="invite-password"
                    type="password"
                    className="form-control"
                    placeholder="Set Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    disabled={submitting}
                    minLength={4}
                  />
                </div>
                {password && password.length < 4 && (
                  <div className="text-danger small mt-1">Password must be at least 4 characters</div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label" htmlFor="invite-confirm">Confirm Password</label>
                <div className={`input-group ${password !== confirm && confirm ? "is-invalid" : ""}`}>
                  <span className="input-group-text bg-light border-end-0">
                    <i className="ri-lock-password-line" />
                  </span>
                  <input
                    id="invite-confirm"
                    type="password"
                    className="form-control"
                    placeholder="Confirm Password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                    disabled={submitting}
                  />
                </div>
                {password !== confirm && confirm && (
                  <div className="text-danger small mt-1">Passwords do not match</div>
                )}
              </div>
              <div className="mb-4 text-center d-grid">
                <Button variant="primary" type="submit" disabled={!canSubmit}>
                  {submitting ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      <p className="text-muted text-center mb-0 mt-3">
        Already have an account?{" "}
        <Link href="/login" className="text-dark fw-bold">
          Sign In
        </Link>
      </p>
      <AuthFooter />
    </LarkonAuthLayout>
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
    <LarkonAuthLayout>
      <div className="auth-logo mb-4">
        <Link href="/" className="d-inline-block">
          <img src="/assets/images/logo.png" alt="BPA" height={32} />
        </Link>
      </div>
      <h2 className="fw-bold fs-24">Sign Up</h2>
      <p className="text-muted mt-1 mb-4">New to our platform? Register a new account to get started.</p>

      {error ? (
        <div className="alert alert-danger py-12 px-16 radius-8 mb-20" role="alert">
          {error}
        </div>
      ) : null}

      <div className="mb-5">
        <form onSubmit={onSubmit} className="authentication-form">
          <div className="mb-3">
            <label className="form-label" htmlFor="reg-identifier">Email or Phone Number</label>
            <div className={`input-group ${validation.errors.identifier || (identifier && !authType?.type) ? "is-invalid" : ""}`}>
              <span className="input-group-text bg-light border-end-0">
                <i className={authType?.type === "email" ? "ri-mail-line" : "ri-phone-line"} />
              </span>
              <input
                id="reg-identifier"
                type="text"
                className="form-control"
                placeholder="Enter your email or phone number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                disabled={loading}
              />
            </div>
            {(validation.errors.identifier || (identifier && !authType?.type)) && (
              <div className="text-danger small mt-1">
                {validation.errors.identifier || "Please enter a valid email or phone number"}
              </div>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="reg-name">Full Name (Optional)</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-end-0">
                <i className="ri-user-3-line" />
              </span>
              <input
                id="reg-name"
                type="text"
                className="form-control"
                placeholder="Full Name (Optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                disabled={loading}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="reg-password">Password</label>
            <div className={`input-group ${validation.errors.password ? "is-invalid" : ""}`}>
              <span className="input-group-text bg-light border-end-0">
                <i className="ri-lock-password-line" />
              </span>
              <input
                id="reg-password"
                type="password"
                className="form-control"
                placeholder="Enter your password (min 4 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={loading}
                minLength={4}
              />
            </div>
            {validation.errors.password && (
              <div className="text-danger small mt-1">{validation.errors.password}</div>
            )}
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
            <div className={`input-group ${password !== confirmPassword && confirmPassword ? "is-invalid" : ""}`}>
              <span className="input-group-text bg-light border-end-0">
                <i className="ri-lock-password-line" />
              </span>
              <input
                id="reg-confirm"
                type="password"
                className="form-control"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                disabled={loading}
              />
            </div>
            {password !== confirmPassword && confirmPassword && (
              <div className="text-danger small mt-1">Passwords do not match</div>
            )}
          </div>
          <div className="mb-4 text-center d-grid">
            <Button variant="primary" type="submit" disabled={!canSubmit}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </div>
        </form>
        <p className="text-muted text-center mb-0">
          Already have an account?{" "}
          <Link href="/login" className="text-dark fw-bold">
            Sign In
          </Link>
        </p>
      </div>
      <AuthFooter />
    </LarkonAuthLayout>
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
      <LarkonAuthLayout>
        <div className="auth-logo mb-4">
          <Link href="/" className="d-inline-block">
            <img src="/assets/images/logo.png" alt="BPA" height={32} />
          </Link>
        </div>
        <div className="text-center text-muted">Loading...</div>
      </LarkonAuthLayout>
    );
  }

  // Show success message
  if (success) {
    return (
      <LarkonAuthLayout>
        <div className="auth-logo mb-4">
          <Link href="/" className="d-inline-block">
            <img src="/assets/images/logo.png" alt="BPA" height={32} />
          </Link>
        </div>
        <div className="card p-4 text-center">
          <div className="mb-3 text-success" style={{ fontSize: 48 }}>
            <i className="ri-checkbox-circle-fill" />
          </div>
          <h4 className="mb-2">Registration Successful!</h4>
          <p className="text-muted mb-2">Your account has been created successfully.</p>
          <p className="text-muted small mb-0">Redirecting to login page...</p>
        </div>
      </LarkonAuthLayout>
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
      <LarkonAuthLayout>
        <div className="auth-logo mb-4">
          <Link href="/" className="d-inline-block">
            <img src="/assets/images/logo.png" alt="BPA" height={32} />
          </Link>
        </div>
        <h2 className="fw-bold fs-24">Already Signed In</h2>
        <p className="text-muted mt-1 mb-4">You are already logged in to your account.</p>
        <div className="alert alert-info py-12 px-16 radius-8 mb-20" role="alert">
          <div className="fw-semibold mb-2">
            {userInfo?.name || userInfo?.email || userInfo?.phone || "User"}
          </div>
          <div className="text-sm">
            {userInfo?.email && <div>Email: {userInfo.email}</div>}
            {userInfo?.phone && <div>Phone: {userInfo.phone}</div>}
          </div>
        </div>
        <div className="d-grid gap-2 mb-4">
          <Link href="/post-auth-landing" className="btn btn-primary">
            Go to Dashboard
          </Link>
          <Link href="/login" className="btn btn-outline-secondary">
            Sign In to Different Account
          </Link>
        </div>
        <AuthFooter />
      </LarkonAuthLayout>
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
