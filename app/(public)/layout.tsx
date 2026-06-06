import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import "@/src/styles/landing.css";
import "@/src/styles/producer-landing.css";
import { LanguageProvider } from "./_lib/LanguageContext";
import { organization, buildOrganizationJsonLd } from "@/config/organization";
import PublicHeader from "./_components/PublicHeader";
import PublicSiteFooter from "./_components/PublicSiteFooter";
import GoToTopButton from "./_components/GoToTopButton";
import {
  getSiteMode,
  getPanelHomePath,
  isProducerMode,
  shouldRedirectRootFromPublic,
} from "@/src/shared/panel/siteMode";

const siteMode = getSiteMode();
const LOCALE_COOKIE_NAMES = ["app_locale", "landing_locale"] as const;

const appBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3104";

export const metadata = {
  title: `BPA/WPA — পোষা প্রাণীর ব্যবসা প্ল্যাটফর্ম | ${organization.name.en}`,
  description:
    "পেট শপ, ভেট ক্লিনিক, গ্রুমিং সেন্টার ও সাপ্লাইয়ারদের জন্য সম্পূর্ণ ব্যবসায়িক সমাধান। বিক্রয়, ইনভেন্টরি, রিপোর্ট, স্টাফ—সব এক প্ল্যাটফর্মে। BPA অফিসিয়াল।",
  metadataBase: new URL(appBase),
  openGraph: {
    title: `BPA/WPA — Pet Business Platform | ${organization.name.en}`,
    description:
      "Complete pet business management for shops, clinics, groomers. Sales, inventory, reports—all in one. Official BPA platform.",
    images: ["/og-image.png"],
    url: "/",
    siteName: organization.name.en,
  },
  alternates: { canonical: "/" },
  other: {
    "contact:email": organization.email,
    "contact:phone": organization.phone,
    "contact:website": organization.website,
  },
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (shouldRedirectRootFromPublic(siteMode)) {
    redirect(getPanelHomePath(siteMode));
  }

  let initialLocale: "en" | "bn" = "en";
  try {
    const cookieStore = await cookies();
    for (const name of LOCALE_COOKIE_NAMES) {
      const v = cookieStore.get(name)?.value;
      if (v === "bn" || v === "en") {
        initialLocale = v;
        break;
      }
    }
  } catch {
    /* server-side cookies not available */
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationJsonLd(`${organization.website}/og-image.png`),
      {
        "@type": "SoftwareApplication",
        name: "BPA/WPA Pet Business Platform",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: appBase,
        publisher: {
          "@type": "Organization",
          name: organization.name.en,
          url: organization.website,
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "BDT",
        },
      },
    ],
  };

  if (isProducerMode(siteMode)) {
    return (
      <div className="landing producer-landing pl-v2">
        <main id="main-content" role="main">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="landing">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LanguageProvider initialLocale={initialLocale}>
        <PublicHeader />
        <main id="main-content" role="main">
          {children}
        </main>
        <PublicSiteFooter />
        <GoToTopButton />
      </LanguageProvider>
    </div>
  );
}
