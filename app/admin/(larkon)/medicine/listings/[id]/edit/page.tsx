"use client";

import { useParams } from "next/navigation";
import MedicineListingForm from "../../_components/workspace/MedicineListingForm";

export default function AdminMedicineListingEditPage() {
  const params = useParams();
  const id = Number(params?.id);
  if (!id || Number.isNaN(id)) {
    return (
      <div className="dashboard-main-body py-4">
        <p className="text-muted small mb-0">Invalid listing id.</p>
      </div>
    );
  }
  return <MedicineListingForm mode="edit" listingId={id} />;
}
