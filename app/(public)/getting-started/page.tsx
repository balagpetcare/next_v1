"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MEDIA } from "@/lib/mediaConfig";
import {
  GETTING_STARTED_PATHS,
  getPathByKey,
  type PathKey,
} from "@/lib/content/gettingStartedRequirements";

const COOKIE_SELECTED_PANEL = "selectedPanel";
const COOKIE_INTENDED_PANEL = "intendedPanel";
const COOKIE_MAX_AGE_DAYS = 365;

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
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

const BUSINESS_HIGHLIGHTS = [
  {
    icon: "ri-bar-chart-line",
    title: "Sales Analytics",
    description: "Live sales, daily & monthly growth",
  },
  {
    icon: "ri-money-dollar-circle-line",
    title: "Profit & Margin",
    description: "Know what you earn, not just what you sell",
  },
  {
    icon: "ri-printer-line",
    title: "POS & Orders",
    description: "In-store sales, invoices, printing",
  },
  {
    icon: "ri-dog-line",
    title: "Pet Products & Services",
    description: "Real pets, real services, real customers",
  },
];

/**
 * Public route: /getting-started. No session required; guests see full page.
 * Authenticated users past onboarding are redirected to post-auth-landing.
 * Served under (public) so it never goes through owner auth/KYC layout.
 */
export default function GettingStartedPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [showContent, setShowContent] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [activePath, setActivePath] = useState<PathKey>("owner");
  const requirementsSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const VALID_PATH_KEYS: PathKey[] = ["owner", "clinic", "shop", "producer", "customer"];
  const HASH_PATTERN = /^#?requirements-(owner|clinic|shop|producer|customer)$/;

  function parseHash(): PathKey | null {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash?.trim() || "";
    const match = hash.match(HASH_PATTERN);
    return match ? (match[1] as PathKey) : null;
  }

  function scrollToRequirements() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        requirementsSectionRef.current?.scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  // Initial load: if hash matches, select tab and scroll (defer to next paint for reliable scroll)
  useEffect(() => {
    if (typeof window === "undefined" || !showContent) return;
    const key = parseHash();
    if (key) {
      setActivePath(key);
      scrollToRequirements();
    }
  }, [showContent]);

  // Sync tab when hash changes (e.g. back/forward, manual edit)
  useEffect(() => {
    if (typeof window === "undefined" || !showContent) return;
    const onHashChange = () => {
      const key = parseHash();
      if (key && VALID_PATH_KEYS.includes(key)) setActivePath(key);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [showContent]);

  // Public page: no session required. If authenticated and past onboarding, redirect to post-auth-landing.
  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const me = await fetchMe();
        if (cancelled) return;

        const r = me?.routing ?? {};
        const allowedPanels = r.allowedPanels ?? Object.keys(me?.panels ?? {}).filter((k) => me?.panels?.[k]);
        const unclassified = Array.isArray(allowedPanels) && allowedPanels.length === 0;
        const onboardingIntroRequired = r.onboardingIntroRequired === true || unclassified;

        if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
          console.log("[getting-started] auth/me routing:", r);
        }

        if (!onboardingIntroRequired) {
          router.replace("/post-auth-landing");
          return;
        }
        if (!cancelled) setShowContent(true);
      } catch {
        // Guest or 401: show page; do not redirect to login
        if (!cancelled) setShowContent(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  /** Scroll to requirements and optionally select a path. NO navigation. NEVER sets intendedPanel/selectedPanel cookies. */
  function handleViewRequirements(pathKey?: PathKey) {
    if (pathKey) setActivePath(pathKey);
    if (pathKey && typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}#requirements-${pathKey}`);
    }
    scrollToRequirements();
  }

  /** Tab click: keep hash in sync with selected tab */
  function handleTabSelect(pathKey: PathKey) {
    setActivePath(pathKey);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `${window.location.pathname}#requirements-${pathKey}`);
    }
  }

  /** Navigate to setup — this MAY trigger KYC redirect on target route */
  function handleStartSetup(pathKey: PathKey) {
    const path = getPathByKey(pathKey);
    if (!path) return;
    setCookie(path.cookieKey, path.cookieValue);
    let target = path.ctaRoute;
    if (path.useIntroParam) {
      target += target.includes("?") ? "&intro=1" : "?intro=1";
    }
    if (typeof process !== "undefined" && process.env?.NODE_ENV === "development") {
      console.log(`[getting-started] X-Redirect-Reason: start_setup_${pathKey} -> ${target}`);
    }
    router.replace(target);
  }

  function handleBrowseAsCustomer() {
    handleStartSetup("customer");
  }

  if (loading || !showContent) {
    return (
      <div
        className="position-fixed top-0 start-0 w-100 min-vh-100 d-flex align-items-center justify-content-center"
        style={{ background: "#0f172a", zIndex: 9999 }}
      >
        <div className="text-center text-white">
          <i className="ri-loader-4-line" style={{ fontSize: 32 }} />
          <p className="mt-16 mb-0 opacity-75">Loading…</p>
        </div>
      </div>
    );
  }

  const showVideo = !prefersReducedMotion && !videoError;
  const activePathData = getPathByKey(activePath);

  return (
    <div className="w-100">
      {/* Hero: full viewport, video/poster as background */}
      <div
        className="position-relative w-100"
        style={{ minHeight: "100vh" }}
      >
        {/* Background layer — pointer-events: none so overlay receives clicks */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
        {showVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-100 h-100"
            style={{ objectFit: "cover" }}
            poster={MEDIA.gettingStarted.poster}
            onError={() => setVideoError(true)}
          >
            <source src={MEDIA.gettingStarted.video} type="video/mp4" />
          </video>
        ) : (
          <div
            className="w-100 h-100"
            style={{
              backgroundImage: `url(${MEDIA.gettingStarted.poster})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
        {/* Dark overlay 50–60% */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background: "rgba(0,0,0,0.55)",
            zIndex: 1,
          }}
        />
        </div>

        {/* Hero Overlay Content — pointer-events: auto so buttons are clickable */}
      <div
        className="position-relative d-flex flex-column align-items-center justify-content-center min-vh-100 px-24 py-40"
        style={{ zIndex: 2, pointerEvents: "auto" }}
      >
        <div className="text-center" style={{ maxWidth: 720 }}>
          {/* Logo */}
          <Link
            href="/"
            className="d-inline-block mb-40 opacity-90"
            style={{ animation: "gettingStartedFadeIn 0.6s ease-out forwards" }}
          >
            <img
              src="/assets/images/logo.png"
              alt="BPA"
              style={{ maxWidth: 160, filter: "brightness(1.1)" }}
            />
          </Link>

          {/* Main Headline */}
          <h1
            className="text-white fw-bold mb-16 lh-tight"
            style={{
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              animation: "gettingStartedSlideUp 0.6s ease-out 0.1s both",
            }}
          >
            Run a Real Pet Business.
            <br />
            Watch Your Sales Grow.
          </h1>

          {/* Supporting Text */}
          <p
            className="text-white opacity-90 mb-32"
            style={{
              fontSize: "1.1rem",
              animation: "gettingStartedSlideUp 0.6s ease-out 0.2s both",
            }}
          >
            Track sales, profit, services, and customers —
            <br className="d-none d-md-block" />
            all in one powerful system.
          </p>

          {/* Business Highlights */}
          <div
            className="row g-16 mb-40 justify-content-center"
            style={{ animation: "gettingStartedSlideUp 0.6s ease-out 0.3s both" }}
          >
            {BUSINESS_HIGHLIGHTS.map((h, i) => (
              <div
                key={i}
                className="col-6 col-md-3"
                style={{ animationDelay: `${0.35 + i * 0.05}s` }}
              >
                <div
                  className="rounded-3 p-16 text-white text-center"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  <i
                    className={`${h.icon} d-block mb-8`}
                    style={{ fontSize: 28, opacity: 0.95 }}
                  />
                  <div className="fw-semibold small">{h.title}</div>
                  <div
                    className="small opacity-80"
                    style={{ fontSize: "0.7rem", lineHeight: 1.3 }}
                  >
                    {h.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Buttons — Primary scrolls to docs, does NOT navigate */}
          <div
            className="d-flex flex-column flex-sm-row gap-16 justify-content-center mb-24"
            style={{ animation: "gettingStartedSlideUp 0.6s ease-out 0.5s both" }}
          >
            <button
              type="button"
              onClick={() => handleViewRequirements("owner")}
              className="btn btn-primary btn-lg px-32 py-100 rounded-3 fw-semibold shadow"
              style={{
                background: "var(--bs-primary, #6366f1)",
                border: "none",
                minWidth: 220,
              }}
            >
              See Requirements & Steps
            </button>
            <button
              type="button"
              onClick={handleBrowseAsCustomer}
              className="btn btn-outline-light btn-lg px-32 py-100 rounded-3 fw-semibold"
              style={{ minWidth: 200 }}
            >
              Browse as Customer
            </button>
          </div>

          {/* Trust Line */}
          <p
            className="text-white-50 small mb-0"
            style={{
              animation: "gettingStartedSlideUp 0.6s ease-out 0.6s both",
              fontSize: "0.85rem",
            }}
          >
            Trusted by pet shops, clinics, producers, and service providers.
          </p>

          {/* Scroll hint */}
          <p
            className="text-white-50 small mt-24 mb-0 opacity-75"
            style={{ animation: "gettingStartedSlideUp 0.6s ease-out 0.7s both" }}
          >
            See requirements & steps below
          </p>

          {/* Sign in to different account — Owner panel: use /owner/login */}
          <Link
            href="/owner/login"
            className="d-inline-block mt-24 text-white-50 small text-decoration-underline-hover"
            style={{ animation: "gettingStartedSlideUp 0.6s ease-out 0.8s both" }}
          >
            Sign in to a different account
          </Link>
        </div>
        </div>
      </div>

      {/* Requirements & Steps Section — below hero, own background */}
      <section
        ref={requirementsSectionRef}
        id="requirements"
        className="position-relative py-48 px-24"
        style={{
          zIndex: 3,
          background: "linear-gradient(180deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        }}
      >
        <div className="container" style={{ maxWidth: 900 }}>
          <h2 className="text-white fw-bold text-center mb-8">
            Requirements & Steps
          </h2>
          <p className="text-white-50 text-center mb-40">
            Choose your path and see what you&apos;ll need.
          </p>

          {/* Path tabs */}
          <div
            className="d-flex flex-wrap gap-8 justify-content-center mb-32"
            role="tablist"
          >
            {GETTING_STARTED_PATHS.map((p) => (
              <button
                key={p.pathKey}
                type="button"
                role="tab"
                aria-selected={activePath === p.pathKey}
                onClick={() => handleTabSelect(p.pathKey)}
                className="btn rounded-3 fw-semibold px-20 py-100"
                style={{
                  background:
                    activePath === p.pathKey
                      ? "rgba(99, 102, 241, 0.3)"
                      : "rgba(255,255,255,0.08)",
                  border:
                    activePath === p.pathKey
                      ? "1px solid rgba(99, 102, 241, 0.6)"
                      : "1px solid rgba(255,255,255,0.12)",
                  color: "white",
                }}
              >
                <i className={`${p.icon} me-8`} style={{ fontSize: 18 }} />
                {p.shortLabel}
              </button>
            ))}
          </div>

          {/* Path content */}
          {activePathData && (
            <div
              id={`requirements-${activePath}`}
              className="rounded-3 p-24 mb-24"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
              role="tabpanel"
            >
              <div className="mb-24">
                <h3 className="text-white fw-semibold mb-8">
                  {activePathData.label}
                </h3>
                <p className="text-white-50 mb-0">
                  {activePathData.description}
                </p>
              </div>

              <div className="row g-24">
                {/* What you'll need */}
                <div className="col-12 col-md-6">
                  <div className="fw-semibold text-white mb-12">
                    What you&apos;ll need
                  </div>
                  {activePathData.documents.length > 0 ? (
                    <ul className="list-unstyled mb-0">
                      {activePathData.documents.map((d, i) => (
                        <li
                          key={i}
                          className="d-flex align-items-start gap-12 mb-12 text-white-50"
                        >
                          <i
                            className={`${d.required ? "ri-checkbox-circle-line text-primary" : "ri-checkbox-blank-circle-line"}`}
                            style={{ fontSize: 18, marginTop: 2 }}
                          />
                          <span>
                            {d.label}
                            {d.required && (
                              <span className="text-primary ms-4">*</span>
                            )}
                            {d.hint && (
                              <span className="d-block small opacity-75 mt-4">
                                {d.hint}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-white-50 mb-0">
                      No documents required. You can browse and shop right away.
                    </p>
                  )}
                </div>

                {/* Step-by-step */}
                <div className="col-12 col-md-6">
                  <div className="fw-semibold text-white mb-12">
                    Step-by-step
                  </div>
                  <div className="d-flex flex-column gap-16">
                    {activePathData.steps.map((s, i) => (
                      <div
                        key={i}
                        className="d-flex gap-16"
                        style={{
                          borderLeft: "2px solid rgba(99, 102, 241, 0.5)",
                          paddingLeft: 16,
                          marginLeft: 8,
                        }}
                      >
                        <span
                          className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                          style={{
                            width: 28,
                            height: 28,
                            minWidth: 28,
                            background: "rgba(99, 102, 241, 0.4)",
                            fontSize: 14,
                          }}
                        >
                          {i + 1}
                        </span>
                        <div>
                          <div className="text-white fw-medium small">
                            {s.title}
                          </div>
                          <div className="text-white-50 small mt-4">
                            {s.description}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Path actions: View Requirements (scroll) + Start Setup (navigate) */}
              <div className="mt-32 pt-24 d-flex flex-wrap gap-12" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <button
                  type="button"
                  onClick={() => handleViewRequirements(activePath)}
                  className="btn btn-outline-light rounded-3 px-24 py-100 fw-semibold"
                >
                  View Requirements
                </button>
                <button
                  type="button"
                  onClick={() => handleStartSetup(activePath)}
                  className="btn btn-primary rounded-3 px-32 py-14 fw-semibold"
                >
                  {activePathData.startSetupLabel}
                </button>
              </div>
            </div>
          )}

          {/* Footer note */}
          <p className="text-center text-white-50 small mb-0">
            Content from platform verification policy.{" "}
            <Link
              href="/owner/login"
              className="text-primary text-decoration-underline-hover"
            >
              Sign in to a different account
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
