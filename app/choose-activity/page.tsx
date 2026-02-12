"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const COOKIE_SELECTED_PANEL = "selectedPanel";
const COOKIE_MAX_AGE_DAYS = 365;

function setPanelCookie(panel: string) {
  if (typeof document === "undefined") return;
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_SELECTED_PANEL}=${encodeURIComponent(panel)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function apiBase() {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
}

async function fetchMe() {
  const res = await fetch(`${apiBase()}/api/v1/auth/me`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

/** Activity options based on panels from /me */
const ACTIVITY_OPTIONS: Array<{
  key: string;
  label: string;
  description: string;
  path: string;
  icon: string;
  panelKey?: string;
}> = [
  { key: "owner", panelKey: "owner", label: "Owner Dashboard", description: "Manage your business, branches, and products", path: "/owner/dashboard", icon: "ri-store-3-line" },
  { key: "admin", panelKey: "admin", label: "Admin Panel", description: "Platform administration and moderation", path: "/admin", icon: "ri-shield-user-line" },
  { key: "producer", panelKey: "producer", label: "Producer Portal", description: "Manage products and batches", path: "/producer", icon: "ri-box-3-line" },
  { key: "staff", panelKey: "staff", label: "Staff Workspace", description: "Branch operations and POS", path: "/staff", icon: "ri-user-star-line" },
  { key: "country", panelKey: "country", label: "Country Admin", description: "Country-level administration", path: "/country/dashboard", icon: "ri-global-line" },
  { key: "shop", panelKey: "shop", label: "Shop Panel", description: "Retail and orders", path: "/shop", icon: "ri-shopping-cart-line" },
  { key: "clinic", panelKey: "clinic", label: "Clinic Panel", description: "Appointments and patients", path: "/clinic", icon: "ri-hospital-line" },
  { key: "mother", label: "Shop / Browse as Customer", description: "Continue as a customer or shopper", path: "/mother", icon: "ri-user-line" },
];

export default function ChooseActivityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<typeof ACTIVITY_OPTIONS>([]);
  const [isCustomerOnly, setIsCustomerOnly] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const me = await fetchMe();
        if (cancelled) return;

        const panels = me?.panels ?? {};
        const routing = me?.routing ?? {};
        const isCustomerOnly = routing.isCustomerOnly === true;

        if (process.env.NODE_ENV === "development") {
          console.log("[choose-activity] auth/me routing:", {
            panels,
            routing,
          });
        }

        // Build list of available activities based on panels
        const hasAnyPanel = Object.values(panels).some(Boolean);
        const available: typeof ACTIVITY_OPTIONS = [];

        if (hasAnyPanel) {
          for (const opt of ACTIVITY_OPTIONS) {
            if (opt.panelKey && panels[opt.panelKey] === true) available.push(opt);
          }
        }

        // Customer-only: no business panels → show mother (Shop/Browse as Customer)
        if (available.length === 0) {
          const motherOpt = ACTIVITY_OPTIONS.find((o) => o.key === "mother");
          if (motherOpt) available.push(motherOpt);
        }

        // Auto-redirect only when single BUSINESS panel (not mother)
        const singleOpt = available.length === 1 ? available[0] : null;
        if (singleOpt && singleOpt.key !== "mother") {
          setPanelCookie(singleOpt.key);
          if (process.env.NODE_ENV === "development") {
            console.log("[choose-activity] X-Redirect-Reason: single_business_panel ->", singleOpt.path);
          }
          router.replace(singleOpt.path);
          return;
        }

        // Do NOT auto-redirect to mother when it's the only option; show UI + CTA to create/join business
        setIsCustomerOnly(available.length === 1 && available[0]?.key === "mother");
        setActivities(available);
      } catch (e) {
        if (!cancelled) {
          setError("Please sign in to continue.");
          router.replace("/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function handleSelect(opt: (typeof ACTIVITY_OPTIONS)[0]) {
    setPanelCookie(opt.key);
    if (process.env.NODE_ENV === "development") {
      console.log("[choose-activity] X-Redirect-Reason: user_selected ->", opt.path);
    }
    router.replace(opt.path);
  }

  if (loading) {
    return (
      <section className="auth bg-base d-flex flex-wrap min-vh-100 align-items-center justify-content-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-primary-600" style={{ fontSize: 32 }} />
          <p className="text-secondary-light mt-16 mb-0">Loading…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="auth bg-base d-flex flex-wrap min-vh-100 align-items-center justify-content-center py-40">
      <div className="container" style={{ maxWidth: 640 }}>
        <div className="text-center mb-32">
          <Link href="/" className="d-inline-block mb-24">
            <img src="/assets/images/logo.png" alt="BPA" style={{ maxWidth: 180 }} />
          </Link>
          <h3 className="mb-8">Choose your activity</h3>
          <p className="text-secondary-light mb-0">
            Select where you want to continue
          </p>
        </div>

        {error && (
          <div className="alert alert-danger radius-12 mb-24">{error}</div>
        )}

        {isCustomerOnly && (
          <div className="alert alert-info radius-12 mb-24 d-flex align-items-start gap-12">
            <i className="ri-information-line mt-2" style={{ fontSize: 20 }} />
            <div>
              <div className="fw-semibold mb-4">Want to run a business?</div>
              <p className="text-secondary-light small mb-0">
                Create or join an organization to access Owner, Producer, or Staff panels.
              </p>
              <Link href="/owner/onboarding" className="btn btn-sm btn-outline-primary-600 mt-12">
                Get started as Owner
              </Link>
              <span className="mx-8 text-secondary">or</span>
              <Link href="/owner/register" className="btn btn-sm btn-outline-secondary mt-12">
                Register
              </Link>
            </div>
          </div>
        )}

        <div className="d-flex flex-column gap-16">
          {activities.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className="btn btn-outline-primary-600 d-flex align-items-center gap-16 p-24 radius-12 text-start"
              onClick={() => handleSelect(opt)}
            >
              <div
                className="d-flex align-items-center justify-content-center rounded-circle bg-primary-50"
                style={{ width: 48, height: 48, minWidth: 48 }}
              >
                <i className={opt.icon} style={{ fontSize: 22 }} />
              </div>
              <div className="flex-grow-1">
                <div className="fw-semibold">{opt.label}</div>
                <div className="text-secondary-light text-sm">{opt.description}</div>
              </div>
              <i className="ri-arrow-right-s-line text-secondary" style={{ fontSize: 20 }} />
            </button>
          ))}
        </div>

        <div className="text-center mt-32">
          <Link href="/login" className="text-secondary-light text-sm">
            Sign in to a different account
          </Link>
        </div>
      </div>
    </section>
  );
}
