"use client";

import type { ProductsKpiStats } from "./types";
import styles from "./ProductsKpiStrip.module.css";

const CARD_ICONS: Record<string, string> = {
  Total: "ri-box-3-line",
  Active: "ri-checkbox-circle-line",
  Inactive: "ri-close-circle-line",
  "Low Stock": "ri-error-warning-line",
  Draft: "ri-draft-line",
  Pending: "ri-time-line",
};

type CardKey = "Total" | "Active" | "Inactive" | "Low Stock" | "Draft" | "Pending";

type CardItem = {
  key: CardKey;
  label: CardKey;
  value: number;
  show: boolean;
  tone?: "default" | "success" | "danger" | "warning";
};

type Props = {
  stats: ProductsKpiStats;
  role?: string;
  loading?: boolean;
  className?: string;

  /** Optional future hook: click card => apply filter */
  onCardClick?: (key: CardKey) => void;
  activeCard?: CardKey | null;
};

export function ProductsKpiStrip({
  stats,
  loading,
  className = "",
  onCardClick,
  activeCard = null,
}: Props) {
  const cards = (
    [
      { key: "Total", label: "Total", value: stats.total, show: true, tone: "default" as const },
      { key: "Active", label: "Active", value: stats.active, show: true, tone: "success" as const },
      { key: "Inactive", label: "Inactive", value: stats.inactive, show: true, tone: "danger" as const },
      { key: "Low Stock", label: "Low Stock", value: stats.lowStock, show: stats.lowStock >= 0, tone: "warning" as const },
      { key: "Draft", label: "Draft", value: stats.draft, show: stats.draft >= 0, tone: "default" as const },
      { key: "Pending", label: "Pending", value: stats.pendingApproval, show: stats.pendingApproval >= 0, tone: "warning" as const },
    ] satisfies CardItem[]
  ).filter((c) => c.show);

  if (cards.length === 0) return null;

  return (
    <div className={` d-flex gap-2 flex-wrap my-3 ${styles.strip} ${className}`} role="group" aria-label="Product stats">
      {cards.map(({ key, label, value, tone }) => {
        const clickable = typeof onCardClick === "function";
        const isActive = activeCard === key;

        return (
          <div
            key={key}
            className={`card col-xl  ${styles.card} ${isActive ? styles.cardActive : ""} ${clickable ? styles.cardClickable : ""}`}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? () => onCardClick(key) : undefined}
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onCardClick(key);
                    }
                  }
                : undefined
            }
            aria-pressed={clickable ? isActive : undefined}
          >
            <div className={`card-body ${styles.cardBody}`}>
              <div className={styles.left}>
                <div className={styles.label}>{label}</div>

                {loading ? (
                  <div className={styles.skeletonWrap} aria-hidden>
                    <span className={`placeholder ${styles.skeleton}`} />
                  </div>
                ) : (
                  <div
                    className={`${styles.value} ${
                      tone === "danger" && value > 0 ? "text-danger" : ""
                    } ${tone === "success" && value > 0 ? "text-success" : ""}`}
                  >
                    {value}
                  </div>
                )}
              </div>

              <div className={`${styles.iconBadge} ${tone ? styles[`tone_${tone}`] : ""}`} aria-hidden>
                <i className={CARD_ICONS[label] || "ri-dashboard-line"} />
              </div>
            </div>

            {/* optional tiny hint row (kept minimal, premium) */}
            {!loading && clickable && (
              <div className={styles.hint}>
                <span className="text-muted">Click to filter</span>
                <i className="ri-arrow-right-s-line text-muted" aria-hidden />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}