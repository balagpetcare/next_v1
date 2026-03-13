"use client";

import LoadingState from "@/src/components/dashboard/LoadingState";
import EmptyState from "@/src/components/dashboard/EmptyState";

export interface ServiceItem {
  id: number;
  name: string;
  category?: string;
  price: number;
  duration?: number | null;
  status?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT", minimumFractionDigits: 0 }).format(
    amount
  );
}

export interface ServiceSelectorProps {
  services: ServiceItem[];
  selectedId?: number | null;
  onSelect: (service: ServiceItem) => void;
  loading?: boolean;
  error?: string | null;
}

export default function ServiceSelector({
  services,
  selectedId,
  onSelect,
  loading,
  error,
}: ServiceSelectorProps) {
  if (loading) return <LoadingState message="Loading services…" />;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!services?.length) return <EmptyState title="No services" description="No services available for this branch." />;

  return (
    <div className="service-selector d-flex flex-column gap-2">
      {services.map((svc) => (
        <button
          key={svc.id}
          type="button"
          className={`card text-start ${selectedId === svc.id ? "border-primary border-2" : ""}`}
          onClick={() => onSelect(svc)}
        >
          <div className="card-body py-2 px-3 d-flex justify-content-between align-items-center">
            <div>
              <span className="fw-semibold">{svc.name}</span>
              {svc.category && (
                <span className="badge bg-light text-dark ms-2">{String(svc.category).replace(/_/g, " ")}</span>
              )}
              {svc.duration != null && (
                <span className="small text-muted ms-2">{svc.duration} min</span>
              )}
            </div>
            <span className="text-primary fw-semibold">{formatCurrency(svc.price)}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
