"use client";

import { useLanguage } from "@/app/(public)/_lib/LanguageContext";

export default function Page() {
  const { t } = useLanguage();
  return (
    <div>
      <h2>{t("shop.homeTitle")}</h2>
      <p>{t("shop.homeSubtitle")}</p>

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
