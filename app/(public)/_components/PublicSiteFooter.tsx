"use client";

import { organization, organizationMailtoHref, organizationTelHref } from "@/config/organization";
import { useLanguage } from "../_lib/LanguageContext";

export default function PublicSiteFooter() {
  const { locale } = useLanguage();
  const isBn = locale === "bn";
  const name = isBn ? organization.name.bn : organization.name.en;

  return (
    <footer className="jamina-footer border-t border-slate-200 bg-slate-950 text-slate-300 py-12 px-4 sm:px-6" role="contentinfo">
      <div className="max-w-6xl mx-auto grid gap-10 md:grid-cols-2">
        <div>
          <p className="text-lg font-bold text-white m-0">{name}</p>
          <p className="mt-3 text-sm text-slate-400 m-0">{isBn ? organization.mission.bn : organization.mission.en}</p>
        </div>
        <address className="not-italic text-sm space-y-3">
          <div>
            <span className="block text-slate-500">{isBn ? "ওয়েবসাইট" : "Website"}</span>
            <a href={organization.website} className="text-teal-300 hover:text-white no-underline" target="_blank" rel="noopener noreferrer">
              {organization.websiteDisplay}
            </a>
          </div>
          <div>
            <span className="block text-slate-500">{isBn ? "ইমেইল" : "Email"}</span>
            <a href={organizationMailtoHref()} className="text-teal-300 hover:text-white no-underline">
              {organization.email}
            </a>
          </div>
          <div>
            <span className="block text-slate-500">{isBn ? "মোবাইল" : "Mobile"}</span>
            <a href={organizationTelHref()} className="text-teal-300 hover:text-white no-underline">
              {organization.phone}
            </a>
          </div>
          <div>
            <span className="block text-slate-500">{isBn ? "ঠিকানা" : "Address"}</span>
            <span className="text-slate-400">
              {organization.address.streetAddress}
              <br />
              {organization.address.addressLocality} {organization.address.postalCode}, {organization.address.addressCountry}
            </span>
          </div>
        </address>
      </div>
      <p className="max-w-6xl mx-auto mt-10 pt-6 border-t border-slate-800 text-center text-xs text-slate-500 m-0">
        © {new Date().getFullYear()} {name}. All rights reserved.
      </p>
    </footer>
  );
}
