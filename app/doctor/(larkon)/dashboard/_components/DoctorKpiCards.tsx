"use client";

type KpiData = {
  totalAppointments: number;
  waitingPatients: number;
  inConsultation: number;
  completed: number;
  followUpDue: number;
  pendingPrescriptions: number;
  todayEarnings: number;
  urgentAlerts: number;
};

const DEFAULT_KPIS: KpiData = {
  totalAppointments: 0,
  waitingPatients: 0,
  inConsultation: 0,
  completed: 0,
  followUpDue: 0,
  pendingPrescriptions: 0,
  todayEarnings: 0,
  urgentAlerts: 0,
};

export function DoctorKpiCards({ kpis, loading }: { kpis?: Partial<KpiData> | null; loading?: boolean }) {
  const data = { ...DEFAULT_KPIS, ...(kpis || {}) };
  const cards = [
    { key: "totalAppointments", label: "Today's Appointments", value: data.totalAppointments, cls: "text-primary" },
    { key: "waitingPatients", label: "Waiting Patients", value: data.waitingPatients, cls: "text-warning" },
    { key: "inConsultation", label: "In Consultation", value: data.inConsultation, cls: "text-info" },
    { key: "completed", label: "Completed", value: data.completed, cls: "text-success" },
    { key: "followUpDue", label: "Follow-up Due", value: data.followUpDue, cls: "text-secondary" },
    { key: "pendingPrescriptions", label: "Pending Prescriptions", value: data.pendingPrescriptions, cls: "text-danger" },
    { key: "todayEarnings", label: "Today's Earnings", value: `BDT ${Number(data.todayEarnings || 0).toFixed(2)}`, cls: "text-success" },
    { key: "urgentAlerts", label: "Urgent Alerts", value: data.urgentAlerts, cls: "text-danger" },
  ];

  return (
    <div className="row g-3 mb-3">
      {cards.map((card) => (
        <div key={card.key} className="col-6 col-md-4 col-xl-3">
          <div className="card radius-12 h-100">
            <div className="card-body py-3">
              <div className="small text-muted">{card.label}</div>
              <div className={`h5 mb-0 mt-1 ${card.cls}`}>
                {loading ? "..." : card.value}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
