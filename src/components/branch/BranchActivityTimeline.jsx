"use client";

import { useState, useMemo } from "react";
import Card from "@/src/bpa/components/ui/Card";

/**
 * BranchActivityTimeline – last 20–50 activities; filter All vs Me. Requires dashboard.view (or audit.view if present).
 */
export default function BranchActivityTimeline({
  activity = [],
  permissions = [],
  currentUserId,
}) {
  const perms = Array.isArray(permissions) ? permissions : [];
  const canView = perms.includes("dashboard.view") || perms.includes("audit.view");
  if (!canView) return null;

  const [filter, setFilter] = useState("all");
  const list = Array.isArray(activity) ? activity : [];
  const filtered = useMemo(() => {
    if (filter !== "me" || currentUserId == null) return list.slice(0, 50);
    return list.filter((a) => String(a.actorId ?? a.userId ?? a.actor?.id ?? "") === String(currentUserId)).slice(0, 50);
  }, [list, filter, currentUserId]);

  return (
    <Card
      title="Activity"
      subtitle="Recent activity"
    >
      <div className="d-flex align-items-center gap-12 mb-16">
        <button
          type="button"
          className={`btn btn-sm ${filter === "all" ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          type="button"
          className={`btn btn-sm ${filter === "me" ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={() => setFilter("me")}
        >
          Me
        </button>
      </div>
      {filtered.length === 0 ? (
        <p className="text-secondary-light text-sm mb-0">No activity yet.</p>
      ) : (
        <ul className="list-unstyled mb-0 activity-timeline">
          {filtered.slice(0, 20).map((item, i) => (
            <li key={item.id != null ? `act-${item.id}` : `act-fallback-${i}`} className="d-flex gap-12 py-8 border-bottom border-secondary-200 last-border-0">
              <i className="ri-circle-fill text-primary-600 flex-shrink-0 mt-4" style={{ fontSize: 6 }} aria-hidden />
              <div className="flex-grow-1 min-w-0">
                <span className="text-sm">
                  {item.action ?? item.type ?? "Activity"}
                  {item.actorName && <span className="text-secondary-light"> — {item.actorName}</span>}
                </span>
                {item.metadata != null && (
                  <span className="text-secondary-light text-xs d-block">
                    {(() => {
                      try {
                        return typeof item.metadata === "string" ? item.metadata : JSON.stringify(item.metadata);
                      } catch {
                        return "—";
                      }
                    })()}
                  </span>
                )}
                {item.createdAt && (
                  <span className="text-secondary-light text-xs d-block">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {filtered.length > 20 && (
        <p className="text-secondary-light text-sm mt-12 mb-0">Showing last 20 of {filtered.length}</p>
      )}
    </Card>
  );
}
