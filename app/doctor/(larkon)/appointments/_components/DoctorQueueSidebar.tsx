"use client";

import { useState } from "react";
import type { TabId } from "./DoctorKpiSummaryCards";

function requestNotificationPermission(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "granted") return;
  if (Notification.permission !== "denied") {
    Notification.requestPermission();
  }
}

export interface QueueTab {
  id: TabId;
  label: string;
  statuses?: string;
  priority?: string;
}

const DEFAULT_TABS: QueueTab[] = [
  { id: "waiting", label: "Waiting Now", statuses: "CHECKED_IN,IN_QUEUE,CALLED" },
  { id: "upcoming", label: "Upcoming", statuses: "BOOKED,CONFIRMED" },
  { id: "in_consult", label: "In Consultation", statuses: "IN_CONSULT" },
  { id: "follow_up", label: "Follow-up" },
  { id: "emergency", label: "Emergency", priority: "EMERGENCY" },
  { id: "completed", label: "Completed", statuses: "COMPLETED" },
  { id: "all", label: "All" },
];

export interface DoctorQueueSidebarStats {
  total: number;
  statusCounts: Record<string, number>;
  emergencyCount: number;
  followUpCount: number;
}

export interface DoctorQueueSidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  stats: DoctorQueueSidebarStats | null;
  tabs?: QueueTab[];
}

function getCountForTab(tab: QueueTab, stats: DoctorQueueSidebarStats | null): number {
  if (!stats) return 0;
  const sc = stats.statusCounts;
  if (tab.id === "all") return stats.total;
  if (tab.id === "waiting")
    return (sc.CHECKED_IN ?? 0) + (sc.IN_QUEUE ?? 0) + (sc.CALLED ?? 0);
  if (tab.id === "emergency") return stats.emergencyCount;
  if (tab.id === "follow_up") return stats.followUpCount;
  if (tab.statuses) {
    const statusList = tab.statuses.split(",").map((s) => s.trim());
    return statusList.reduce((sum, s) => sum + (sc[s] ?? 0), 0);
  }
  return 0;
}

export function DoctorQueueSidebar({
  activeTab,
  onTabChange,
  stats,
  tabs = DEFAULT_TABS,
}: DoctorQueueSidebarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="card radius-12 shadow-sm" style={{ minWidth: 200, maxWidth: 260 }}>
      <div className="card-header py-2">
        <h6 className="mb-0 small text-secondary">Queue</h6>
      </div>
      <div className="card-body p-2">
        <nav className="nav flex-column gap-1">
          {tabs.map((tab) => {
            const count = getCountForTab(tab, stats);
            const isActive = activeTab === tab.id;
            const isEmergency = tab.id === "emergency" && count > 0;
            return (
              <div key={tab.id} className="d-flex flex-column gap-1">
                <button
                  type="button"
                  className={`nav-link text-start d-flex justify-content-between align-items-center rounded px-2 py-2 ${
                    isActive ? "active bg-primary text-white" : "text-dark"
                  } ${isEmergency ? "border border-danger" : ""}`}
                  onClick={() => onTabChange(tab.id)}
                >
                  <span>{tab.label}</span>
                  <span className={`badge rounded-pill ${isActive ? "bg-light text-primary" : "bg-secondary"}`}>
                    {count}
                  </span>
                </button>
                {isEmergency && typeof window !== "undefined" && "Notification" in window && Notification.permission === "default" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestNotificationPermission();
                    }}
                  >
                    Notify me
                  </button>
                )}
              </div>
            );
          })}
        </nav>
        <div className="mt-2 border-top pt-2">
          <button
            type="button"
            className="btn btn-sm btn-outline-secondary w-100 d-flex align-items-center justify-content-between"
            onClick={() => setFiltersOpen(!filtersOpen)}
            aria-expanded={filtersOpen}
          >
            <span>Advanced filters</span>
            <span className="small">{filtersOpen ? "▼" : "▶"}</span>
          </button>
          {filtersOpen && (
            <div className="mt-2 small text-muted">
              <p className="mb-1">Visit type, species, payment, and priority filters can be added here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
