"use client";

export type SyncStatus = "connected" | "reconnecting" | "offline";

export interface LiveSyncIndicatorProps {
  status?: SyncStatus;
  className?: string;
}

export function LiveSyncIndicator({ status = "connected", className = "" }: LiveSyncIndicatorProps) {
  const config = {
    connected: { label: "Live", dotClass: "bg-success", title: "Live updates connected" },
    reconnecting: { label: "Reconnecting", dotClass: "bg-warning", title: "Reconnecting…" },
    offline: { label: "Offline", dotClass: "bg-secondary", title: "Live updates disconnected" },
  }[status];

  return (
    <span
      className={`d-inline-flex align-items-center gap-1 small ${className}`.trim()}
      title={config.title}
    >
      <span className={`rounded-circle d-inline-block ${config.dotClass}`} style={{ width: 8, height: 8 }} />
      {config.label}
    </span>
  );
}
