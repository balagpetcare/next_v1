"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiPost } from "@/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextUrl = sp.get("next") || "/admin";

  const [mode, setMode] = useState("email"); // email | phone
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload =
        mode === "phone"
          ? { phone: phone.trim(), password }
          : { email: email.trim().toLowerCase(), password };

      // Backend keeps returning token for old clients, but we rely on HttpOnly cookie.
      await apiPost("/api/v1/auth/login", payload);

      // Go to admin after cookie is set
      router.replace(nextUrl);
      router.refresh();
    } catch (err) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 440, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>BPA Admin Login</h2>
      <p style={{ marginBottom: 16, color: "#6b7280" }}>
        Sign in with your existing backend login. This page stores nothing in localStorage — it uses
        an HttpOnly cookie set by the API.
      </p>

      <form
        onSubmit={onSubmit}
        style={{ padding: 16, border: "1px solid #e5e7eb", borderRadius: 12 }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => setMode("email")}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: mode === "email" ? "#111827" : "white",
              color: mode === "email" ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            Email
          </button>
          <button
            type="button"
            onClick={() => setMode("phone")}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: mode === "phone" ? "#111827" : "white",
              color: mode === "phone" ? "white" : "#111827",
              cursor: "pointer",
            }}
          >
            Phone
          </button>
        </div>

        {mode === "email" ? (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              autoComplete="email"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
              }}
            />
          </div>
        ) : (
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              autoComplete="tel"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
              }}
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
              Tip: you can type with +880 or spaces — backend normalizes it.
            </div>
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 6 }}>Password</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
            }}
          />
        </div>

        {error ? (
          <div
            style={{
              marginBottom: 12,
              padding: 10,
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: 13,
            }}
          >
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111827",
            background: "#111827",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
          After login, you’ll be redirected to: <code>{nextUrl}</code>
        </div>
      </form>
    </div>
  );
}
