"use client";

import { useLanguage } from "@/app/(public)/_lib/LanguageContext";

export default function CountryDashboardPage() {
  const { t } = useLanguage();
  const metricLabels = [
    t("country.totalOrgs"),
    t("country.clinics"),
    t("country.petshops"),
    t("country.shelters"),
    t("country.donations7d"),
    t("country.fundraisingActive"),
    t("country.adoptionsPending"),
    t("country.rescueOpen"),
  ];
  const queueItems = [
    t("country.adoptionApprovalsPending"),
    t("country.orgVerificationPending"),
    t("country.fundraisingApprovalsPending"),
    t("country.reportsPending"),
  ];

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">{t("country.dashboardTitle")}</h2>
      <div className="row g-3 mb-3">
        {metricLabels.map((label) => (
          <div key={label} className="col-md-3 col-sm-6">
            <div className="card">
              <div className="card-body">
                <div className="text-secondary small">{label}</div>
                <div className="h4 mb-0">—</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-lg-8">
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-2">{t("country.activityTimeline")}</h6>
              <div className="text-secondary small">{t("country.latestActionsHere")}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h6 className="mb-2">{t("country.quickQueues")}</h6>
              <div className="row g-2">
                {queueItems.map((item) => (
                  <div key={item} className="col-md-6">
                    <div className="border rounded p-2 text-secondary small">{item}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-2">{t("country.featureStatus")}</h6>
              <div className="text-secondary small">{t("country.featureStatusPlaceholder")}</div>
            </div>
          </div>
          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-2">{t("country.complianceAlerts")}</h6>
              <div className="text-secondary small">{t("country.noAlerts")}</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h6 className="mb-2">{t("country.staffOnline")}</h6>
              <div className="text-secondary small">{t("country.lastActivitySummary")}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
