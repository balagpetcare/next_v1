"use client";

import { useState } from "react";
import { PageHeader } from "@/src/components/dashboard";
import EnterpriseAppointmentWizard from "@/src/components/booking/EnterpriseAppointmentWizard";

export default function ClinicBookPage() {
  const [branchId] = useState(1); // This would come from context/props

  return (
    <div>
      <PageHeader
        title="Book Appointment"
        subtitle="Create new appointments with step-by-step guidance"
      />
      
      <EnterpriseAppointmentWizard 
        branchId={branchId}
        onComplete={(data) => {
          // Handle appointment creation
          console.log("Appointment created:", data);
          // Redirect or show success message
        }}
        onCancel={() => {
          // Handle cancellation
          console.log("Booking cancelled");
        }}
      />
    </div>
  );
}
