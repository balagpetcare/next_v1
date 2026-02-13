import "@/src/styles/landing.css";
import ProducerLandingPage from "./_components/ProducerLandingPage";

export const metadata = {
  title: "Producer Portal — Batch & Serial Traceability | BPA",
  description:
    "Manage batches, generate QR/serial codes, track scans and analytics. Batch/lot management, factory integrations, quality verification.",
};

export default function ProducerPage() {
  return (
    <div className="landing producer-landing">
      <ProducerLandingPage />
    </div>
  );
}
