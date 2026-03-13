"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getBrowserSafeApiBase,
  isPathAllowedForPanels,
  resolveLandingPathFromMe,
  CHOOSE_ACTIVITY_PATH,
} from "@/lib/authRedirect";

const COOKIE_SELECTED_PANEL = "selectedPanel";
const LOOP_GUARD_KEY = "postAuth_lastRedirect";
const LOOP_GUARD_MS = 5000;

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function clearCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

async function fetchMe() {
  const base = getBrowserSafeApiBase();
  const url = `${base}/api/v1/auth/me`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (process.env.NODE_ENV === "development") {
    console.info("[post-auth-landing] auth/me", { url: url || "(same-origin)", status: res.status, ok: res.ok });
  }
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}

const PANEL_PATHS: Record<string, string> = {
  mother: "/mother",
  owner: "/owner/dashboard",
  admin: "/admin",
  producer: "/producer",
  staff: "/staff",
  country: "/country/dashboard",
  shop: "/shop",
  clinic: "/clinic",
  doctor: "/doctor/dashboard",
};

/** Doctor panel runs on port 3107; redirect to full URL when we're on another port */
const DOCTOR_PANEL_PORT = 3107;

function doRedirect(
  router: ReturnType<typeof useRouter>,
  path: string,
  reason: string
) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[post-auth-landing] X-Redirect-Reason: ${reason} -> ${path}`);
  }
  if (typeof window !== "undefined" && path.startsWith("/doctor") && window.location.port !== String(DOCTOR_PANEL_PORT)) {
    const url = `${window.location.protocol}//${window.location.hostname}:${DOCTOR_PANEL_PORT}${path}`;
    window.location.href = url;
    return;
  }
  router.replace(path);
}

function PostAuthLandingContent() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "redirecting" | "loop_guard" | "debug">("loading");
  const [debugPayload, setDebugPayload] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const me = await fetchMe();
        if (cancelled) return;

        const r = me?.routing ?? {};
        const default_redirect = r.default_redirect ?? me?.default_redirect ?? "/choose-activity";
        const allowedPanels = r.allowedPanels ?? Object.keys(me?.panels ?? {}).filter((k) => me?.panels?.[k]);
        const unclassified = Array.isArray(allowedPanels) && allowedPanels.length === 0;
        const onboardingIntroRequired = r.onboardingIntroRequired === true || unclassified;
        const needsActivitySelection = r.needsActivitySelection ?? me?.needsActivitySelection === true;
        const isCustomerOnly = r.isCustomerOnly === true;
        const verificationRequired = r.verificationRequired === true;
        const verificationStatus = r.verificationStatus ?? "NONE";
        let verificationRedirect = r.verificationRedirect ?? null;
        // Doctor candidates must go to doctor verification, not owner KYC
        const doctorStatus = me?.doctorVerificationStatus;
        const onDoctorPanel = typeof window !== "undefined" && window.location.port === "3107";
        if (verificationRedirect === "/owner/kyc") {
          if (onDoctorPanel) {
            // Logged in from doctor panel (3107): keep them in doctor flow
            verificationRedirect = "/doctor/verification";
          } else if (doctorStatus != null && String(doctorStatus).toUpperCase() !== "VERIFIED") {
            verificationRedirect = "/doctor/verification";
          }
        }
        let selectedPanel = getCookie(COOKIE_SELECTED_PANEL);
        if (onboardingIntroRequired || unclassified) {
          clearCookie(COOKIE_SELECTED_PANEL);
          selectedPanel = null;
        }
        const intendedPanel = getCookie("intendedPanel");

        // Only trust selectedPanel if it is in server-allowed panels (prevents cross-panel redirect loop)
        if (selectedPanel && allowedPanels && !allowedPanels.includes(selectedPanel)) {
          clearCookie(COOKIE_SELECTED_PANEL);
          selectedPanel = null;
        }

        const payload = {
          onboardingIntroRequired,
          needsActivitySelection,
          default_redirect,
          allowedPanels,
          isCustomerOnly,
          verificationRequired,
          verificationStatus,
          verificationRedirect,
          selectedPanel,
          intendedPanel,
          debugReason: r.debugReason,
        };

        if (process.env.NODE_ENV === "development") {
          console.log("[post-auth-landing] auth/me routing:", payload);
        }

        const loopGuard = () => {
          const last = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(LOOP_GUARD_KEY) : null;
          const lastTime = last ? Number(last) : 0;
          if (lastTime && Date.now() - lastTime < LOOP_GUARD_MS) {
            return true;
          }
          return false;
        };

        const recordRedirect = (_target: string) => {
          if (typeof sessionStorage !== "undefined") {
            sessionStorage.setItem(LOOP_GUARD_KEY, String(Date.now()));
          }
        };

        setStatus("redirecting");

        // Loop guard: if we redirected recently, stop to avoid loop
        if (loopGuard()) {
          if (!cancelled) {
            setDebugPayload({ ...payload, reason: "loop_guard_recent_redirect" });
            setStatus("debug");
          }
          return;
        }

        // A) onboardingIntroRequired -> /getting-started (first-time users)
        if (onboardingIntroRequired) {
          recordRedirect("/getting-started");
          doRedirect(router, "/getting-started", "onboardingIntroRequired");
          return;
        }

        // B) verificationRequired && verificationStatus != APPROVED -> verificationRedirect (only if allowed)
        if (verificationRequired && verificationStatus !== "APPROVED" && verificationRedirect) {
          if (isPathAllowedForPanels(verificationRedirect, allowedPanels)) {
            recordRedirect(verificationRedirect);
            doRedirect(router, verificationRedirect, "verification_required");
            return;
          }
        }

        // C) needsActivitySelection -> use selectedPanel only when in allowedPanels; else choose-activity
        if (needsActivitySelection && !unclassified) {
          if (isCustomerOnly && selectedPanel === "mother" && isPathAllowedForPanels("/mother", allowedPanels)) {
            recordRedirect("/mother");
            doRedirect(router, "/mother", "isCustomerOnly_selectedPanel_mother");
            return;
          }
          if (selectedPanel && PANEL_PATHS[selectedPanel] && allowedPanels?.includes(selectedPanel)) {
            const path = PANEL_PATHS[selectedPanel];
            recordRedirect(path);
            doRedirect(router, path, `selectedPanel_${selectedPanel}`);
            return;
          }
          recordRedirect(CHOOSE_ACTIVITY_PATH);
          doRedirect(router, CHOOSE_ACTIVITY_PATH, "needsActivitySelection");
          return;
        }

        // D) default_redirect: resolve safe path (never redirect to a panel user cannot access)
        const path = resolveLandingPathFromMe({
          default_redirect,
          allowedPanels: allowedPanels ?? [],
          selectedPanel,
          intendedPanel,
          panelPaths: PANEL_PATHS,
        });
        recordRedirect(path);
        doRedirect(router, path, "default_redirect");
      } catch (e) {
        if (cancelled) return;
        if (process.env.NODE_ENV === "development") {
          console.warn("[post-auth-landing] auth/me failed, redirecting to /login", e?.message ?? e);
        }
        // Redirect to neutral login (no next param) to avoid cross-panel loop
        try {
          sessionStorage.removeItem("staffLogin_lastRedirectAt");
        } catch (_) {}
        router.replace("/login");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (status === "debug" && debugPayload) {
    const isDev = process.env.NODE_ENV === "development";
    return (
      <section className="auth bg-base d-flex flex-wrap min-vh-100 align-items-center justify-content-center p-32">
        <div className="card p-24 radius-12" style={{ maxWidth: 520 }}>
          <h5 className="mb-16">Redirect loop guard</h5>
          <p className="text-secondary-light small mb-20">
            Redirect would repeat. Go to onboarding documentation or choose another destination.
          </p>
          {isDev && (
            <pre className="bg-neutral-50 p-16 radius-8 small overflow-auto mb-20" style={{ maxHeight: 220 }}>
              {JSON.stringify(debugPayload, null, 2)}
            </pre>
          )}
          <div className="d-flex flex-wrap gap-12">
            <Link href="/getting-started" className="btn btn-primary-600">
              Onboarding & Requirements
            </Link>
            {isDev && (
              <>
                <Link href="/choose-activity" className="btn btn-outline-secondary btn-sm">
                  Choose Activity
                </Link>
                <Link href="/mother" className="btn btn-outline-secondary btn-sm">
                  Mother
                </Link>
              </>
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="auth bg-base d-flex flex-wrap min-vh-100 align-items-center justify-content-center">
      <div className="text-center">
        <div
          className="d-inline-flex align-items-center justify-content-center bg-primary-50 rounded-circle mb-24"
          style={{ width: 64, height: 64 }}
        >
          <i className="ri-loader-4-line text-primary-600" style={{ fontSize: 28 }} />
        </div>
        <p className="text-secondary-light mb-0">
          {status === "redirecting" ? "Taking you to your dashboard…" : "Loading…"}
        </p>
      </div>
    </section>
  );
}

export default function PostAuthLandingPage() {
  return (
    <Suspense fallback={
      <section className="auth bg-base d-flex flex-wrap min-vh-100 align-items-center justify-content-center">
        <div className="text-center">
          <i className="ri-loader-4-line text-primary-600" style={{ fontSize: 28 }} />
          <p className="text-secondary-light mt-16 mb-0">Loading…</p>
        </div>
      </section>
    }>
      <PostAuthLandingContent />
    </Suspense>
  );
}
