"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/(public)/_lib/LanguageContext";

const COOKIE_INTENDED_PANEL = "intendedPanel";
const BUSINESS_PANELS = ["owner", "producer", "shop", "clinic", "admin", "staff", "country"];

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function apiBase() {
  if (typeof window !== "undefined") return "";
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
}

export default function Page() {
  const { t } = useLanguage();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const res = await fetch(`${apiBase()}/api/v1/auth/me`, {
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (cancelled) return;
        if (!res.ok) {
          if (!cancelled) setChecked(true);
          return;
        }
        const me = await res.json().catch(() => ({}));
        const r = me?.routing ?? {};
        const isCustomerOnly = r.isCustomerOnly === true;
        const intendedPanel = getCookie(COOKIE_INTENDED_PANEL);
        const isBusinessIntended = intendedPanel && BUSINESS_PANELS.includes(String(intendedPanel).toLowerCase());

        if (process.env.NODE_ENV === "development") {
          console.log("[mother] auth/me routing:", {
            isCustomerOnly,
            intendedPanel,
            isBusinessIntended,
            routing: r,
          });
        }

        // Business-intended users (from getting-started) should reroute to post-auth-landing
        if (isBusinessIntended) {
          if (process.env.NODE_ENV === "development") {
            console.log("[mother] X-Redirect-Reason: business_intended -> /post-auth-landing");
          }
          router.replace("/post-auth-landing");
          return;
        }

        // /mother is terminal ONLY for isCustomerOnly users (no business panels, not business-intended)
        if (isCustomerOnly) {
          if (!cancelled) setChecked(true);
          return;
        }

        // Authenticated but NOT customer-only: redirect to post-auth-landing
        if (process.env.NODE_ENV === "development") {
          console.log("[mother] X-Redirect-Reason: not_customer_only -> /post-auth-landing");
        }
        router.replace("/post-auth-landing");
      } catch {
        if (!cancelled) setChecked(true);
      }
    }
    check();
    return () => { cancelled = true; };
  }, [router]);

  if (!checked) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-secondary">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div>
      <h2>{t("mother.homeTitle")}</h2>
      <p>{t("mother.homeSubtitle")}</p>

      <ul>
        <li><a href="/health">Health check page</a></li>
        <li><a href="/debug">Debug info</a></li>
      </ul>

      <div
        style={{
          marginTop: 16,
          padding: 12,
          border: "1px solid #e5e7eb",
          borderRadius: 10,
        }}
      >
        <strong>Next steps:</strong>
        <ol>
          <li>
            Create your real pages inside <code>app</code> for this site
          </li>
          <li>
            Connect API later using <code>lib/api</code>
          </li>
          <li>
            Add auth later (tokens/cookies) for protected areas
          </li>
        </ol>
      </div>
    </div>
  );
}
