"use client";

import { useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ownerPost } from "@/app/owner/_lib/ownerApi";
import Link from "next/link";
// Tip: If you have Lucide or FontAwesome installed, add icons for better UX
// import { Lock, User, CheckCircle } from "lucide-react"; 

function Card({ title, subtitle, children }) {
  return (
    <div className="card h-100 radius-12 border-0 shadow-sm">
      <div className="card-header bg-transparent border-bottom-0 pt-24 px-24">
        <h5 className="mb-0 text-primary-600">{title}</h5>
        {subtitle && <p className="text-muted small mb-0">{subtitle}</p>}
      </div>
      <div className="card-body p-24">{children}</div>
    </div>
  );
}

export default function InviteAcceptPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => sp.get("token") || "", [sp]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setOk(false);

    try {
      if (!token) throw new Error("Security token missing. Please check your email link.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters for better security.");
      if (password !== confirm) throw new Error("Passwords do not match. Please re-type.");

      setLoading(true);
      await ownerPost("/api/v1/auth/invites/accept", {
        token,
        password,
        displayName: displayName?.trim() || undefined,
      });
      setOk(true);

      setTimeout(() => {
        router.replace("/owner/login");
      }, 1500);
    } catch (e2) {
      setError(e2?.message || "Accept failed. Please try again or contact support.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-bg-gradient min-vh-100 d-flex align-items-center">
      <div className="container" style={{ maxWidth: 600 }}>
        <div className="text-center mb-32">
          {/* Add your logo here */}
          <h2 className="fw-bold text-dark mb-8">Welcome to the Team</h2>
          <p className="text-secondary">Please complete your profile to activate your account</p>
        </div>

        {error && (
          <div className="alert alert-danger border-0 radius-8 d-flex align-items-center mb-16" role="alert">
            <span className="me-8">⚠️</span> {error}
          </div>
        )}

        {ok && (
          <div className="alert alert-success border-0 radius-8 d-flex align-items-center mb-16" role="alert">
            <span className="me-8">✅</span> Success! Redirecting you to login...
          </div>
        )}

        <Card 
          title="Account Setup" 
          subtitle="Set your preferred display name and a strong password."
        >
          <form onSubmit={submit} className="row g-20">
            <div className="col-12">
              <label className="form-label fw-semibold text-secondary-light">Display Name</label>
              <div className="input-group">
                <span className="input-group-text bg-base border-end-0"><i className="ri-user-line"></i></span>
                <input 
                  className="form-control border-start-0" 
                  placeholder="e.g. John Doe" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)} 
                />
              </div>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold text-secondary-light">New Password</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="••••••••"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label fw-semibold text-secondary-light">Confirm Password</label>
              <input 
                type="password" 
                className="form-control" 
                placeholder="••••••••"
                value={confirm} 
                onChange={(e) => setConfirm(e.target.value)} 
              />
            </div>

            <div className="col-12 mt-32">
              <button 
                className="btn btn-primary w-100 py-12 fw-bold radius-8 d-flex align-items-center justify-content-center" 
                type="submit" 
                disabled={loading || ok}
              >
                {loading ? (
                  <span className="spinner-border spinner-border-sm me-8" role="status"></span>
                ) : null}
                {loading ? "Processing..." : "Activate Account & Login"}
              </button>
            </div>

            <div className="col-12 text-center mt-16">
              <p className="mb-0 text-muted small">
                Already have an account? <Link href="/owner/login" className="text-primary-600 fw-semibold">Sign In</Link>
              </p>
            </div>
          </form>
        </Card>
        
        <div className="text-center mt-24">
          <p className="text-muted extra-small px-32">
            This is a secure invitation link. If you did not expect this, please ignore this page.
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-bg-gradient {
          background: #f8f9fa; /* Or your dashboard's specific theme color */
        }
        .extra-small {
          font-size: 0.75rem;
        }
        .g-20 {
          gap: 20px;
        }
      `}</style>
    </div>
  );
}