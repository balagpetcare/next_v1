import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import "@/src/styles/landing.css";
import { LanguageProvider } from "./_lib/LanguageContext";
import PublicHeader from "./_components/PublicHeader";
import GoToTopButton from "./_components/GoToTopButton";

const siteMode = process.env.SITE_MODE || "owner";
const LOCALE_COOKIE_NAMES = ["app_locale", "landing_locale"] as const;
const defaultPaths: Record<string, string> = {
  mother: "/mother",
  shop: "/shop",
  clinic: "/clinic",
  admin: "/admin",
  owner: "/owner",
  producer: "/producer",
  country: "/country",
};

export const metadata = {
  title: "BPA/WPA — পোষা প্রাণীর ব্যবসা প্ল্যাটফর্ম | Bangladesh Pet Association",
  description:
    "পেট শপ, ভেট ক্লিনিক, গ্রুমিং সেন্টার ও সাপ্লাইয়ারদের জন্য সম্পূর্ণ ব্যবসায়িক সমাধান। বিক্রয়, ইনভেন্টরি, রিপোর্ট, স্টাফ—সব এক প্ল্যাটফর্মে। BPA অফিসিয়াল।",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3104"),
  openGraph: {
    title: "BPA/WPA — Pet Business Platform",
    description:
      "Complete pet business management for shops, clinics, groomers. Sales, inventory, reports—all in one. Official BPA platform.",
    images: ["/og-image.png"],
    url: "/",
  },
  alternates: { canonical: "/" },
};

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (siteMode !== "owner" && siteMode !== "producer") {
    const path = defaultPaths[siteMode] ?? "/owner";
    redirect(path);
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
    "@type": "SoftwareApplication",
    name: "BPA/WPA Pet Business Platform",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "BDT",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      reviewCount: "3",
    },
  };

  if (siteMode === "producer") {
    return (
      <div className="landing producer-landing">
        <main id="main-content" role="main">
          {children}
        </main>
        <GoToTopButton />
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
        <GoToTopButton />
      </LanguageProvider>
    </div>
  );
}
