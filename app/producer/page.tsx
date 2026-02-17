import "@/src/styles/producer-landing.css";
import ProducerLandingPage from "./_components/ProducerLandingPage";

export const metadata = {
  title: "Producer Portal — Batch & Serial Traceability | BPA",
  description:
    "Manage batches, generate QR/serial codes, track scans and analytics. Batch/lot management, factory integrations, quality verification.",
};

export default function ProducerPage() {
  return (
    <div className="landing producer-landing pl-v2">
      <ProducerLandingPage />
    </div>
  );
}
