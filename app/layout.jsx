import { cookies } from "next/headers";
import "./globals.css";
import "./font.css";
import PluginInit from "@/src/helper/PluginInit";
import { I18nWrapper } from "@/app/(public)/_lib/I18nWrapper";

export const metadata = {
  title: "WPA — Pet Smart Solution",
  description: "World Pet Association (WPA) — Pet Smart Solution. Multi-panel web for pet care and management.",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const localeValue =
    cookieStore.get("app_locale")?.value || cookieStore.get("landing_locale")?.value || "en";
  const lang = localeValue === "bn" ? "bn" : "en";

  return (
    <html lang={lang}>
      <head>
        {/* Vendor / template styles served from /public/assets */}
        <link rel="stylesheet" href="/assets/css/remixicon.css" />
        <link rel="stylesheet" href="/assets/css/lib/bootstrap.min.css" />
        <link rel="stylesheet" href="/assets/css/lib/apexcharts.css" />
        <link rel="stylesheet" href="/assets/css/lib/dataTables.min.css" />
        <link rel="stylesheet" href="/assets/css/lib/editor-katex.min.css" />
        <link rel="stylesheet" href="/assets/css/lib/editor.atom-one-dark.min.css" />
        <link rel="stylesheet" href="/assets/css/lib/editor.quill.snow.css" />
        <link rel="stylesheet" href="/assets/css/lib/flatpickr.min.css" />
        <link rel="stylesheet" href="/assets/css/lib/full-calendar.css" />
        <link rel="stylesheet" href="/assets/css/lib/jquery-jvectormap-2.0.5.css" />
        <link rel="stylesheet" href="/assets/css/lib/magnific-popup.css" />
        <link rel="stylesheet" href="/assets/css/lib/slick.css" />
        <link rel="stylesheet" href="/assets/css/lib/prism.css" />
        <link rel="stylesheet" href="/assets/css/lib/file-upload.css" />
        <link rel="stylesheet" href="/assets/css/lib/audioplayer.css" />
        <link rel="stylesheet" href="/assets/css/lib/animate.min.css" />
        <link rel="stylesheet" href="/assets/css/extra.css" />
        {/* owner-panel.css quarantined to _quarantine_cleanup/2026-02-16/wowdash_all_dashboards/public/assets/css/ */}
      </head>
      <body>
        <I18nWrapper initialLocale={lang}>
          {children}
        </I18nWrapper>
        <PluginInit />
      </body>
    </html>
  );
}
