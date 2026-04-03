"use client";

import { useState, useRef, useEffect, useLayoutEffect, useId } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { staffClinicPatientDetailPath } from "@/lib/staffClinicPatientRoutes";
import { useToast } from "@/src/hooks/useToast";

/**
 * Row actions for staff visits list. Self-contained (no owner ActionDropdown / no Iconify) so the
 * trigger always renders: avoids SSR/hydration or icon-bundle issues that can blank the Actions cell.
 * Menu uses a body portal so it is not clipped by .table-responsive overflow.
 */
export default function VisitRowActions({ branchId, visit, onOpenDrawer, permissions }) {
  const toast = useToast();
  const menuDomId = useId();

  const v = visit && typeof visit === "object" ? visit : null;
  const rawId = v?.id ?? v?.visitId ?? v?.visit_id;
  const visitId = rawId != null && rawId !== "" ? Number(rawId) : NaN;
  const visitOk = Number.isFinite(visitId) && visitId > 0;
  const row = visitOk && v ? { ...v, id: visitId } : null;
  const canBilling = permissions?.canBilling;

  const petIdRaw = row?.petId ?? row?.pet?.id;
  const petIdNum = petIdRaw != null && petIdRaw !== "" ? Number(petIdRaw) : NaN;
  const hasPetForPatientLink = Number.isFinite(petIdNum) && petIdNum > 0;

  const appointmentIdRaw = row?.appointmentId ?? row?.appointment?.id;
  const appointmentIdNum = appointmentIdRaw != null && appointmentIdRaw !== "" ? Number(appointmentIdRaw) : NaN;
  const hasAppointmentForLink = Number.isFinite(appointmentIdNum) && appointmentIdNum > 0;

  const [moreOpen, setMoreOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });
  const wrapRef = useRef(null);
  const menuRef = useRef(null);

  const actions =
    visitOk && row
      ? [
          {
            label: "Preview in drawer",
            iconClass: "ri-eye-line",
            onClick: () => onOpenDrawer?.(row),
          },
          {
            label: "Full visit record",
            iconClass: "ri-file-list-3-line",
            href: `/staff/branch/${branchId}/clinic/visits/${visitId}`,
          },
          ...(hasPetForPatientLink
            ? [
                {
                  label: "Patient file",
                  iconClass: "ri-user-heart-line",
                  href: staffClinicPatientDetailPath(branchId, petIdNum),
                },
              ]
            : []),
          ...(hasAppointmentForLink
            ? [
                {
                  label: "Appointments list",
                  iconClass: "ri-calendar-check-line",
                  href: `/staff/branch/${branchId}/clinic/appointments`,
                },
              ]
            : []),
          ...(canBilling
            ? [
                {
                  label: "Billing",
                  iconClass: "ri-bill-line",
                  href: `/staff/branch/${branchId}/clinic/billing?visitId=${visitId}`,
                },
              ]
            : []),
          { divider: true },
          {
            label: "Copy treatment #",
            iconClass: "ri-file-copy-line",
            onClick: () => {
              const code = row.treatmentCode || String(visitId);
              if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
                toast.error("Clipboard is not available in this browser or context.");
                return;
              }
              void navigator.clipboard.writeText(code).then(
                () => toast.success("Treatment # copied"),
                () => toast.error("Could not copy to clipboard.")
              );
            },
          },
        ]
      : [];

  useLayoutEffect(() => {
    if (!visitOk || !moreOpen || !wrapRef.current) return;
    const buttonRect = wrapRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const estimatedHeight = actions.length * 44 + 16;
    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    let top;
    if (spaceAbove > spaceBelow && spaceAbove > estimatedHeight) {
      top = buttonRect.top - estimatedHeight - 8;
    } else {
      top = buttonRect.bottom + 8;
    }
    const right = viewportWidth - buttonRect.right;
    setPosition({ top, right });
  }, [moreOpen, actions.length, visitOk]);

  useEffect(() => {
    if (!moreOpen) return;
    let removeListener = () => {};
    const timerId = setTimeout(() => {
      const handleClickOutside = (event) => {
        const inWrap = wrapRef.current?.contains(event.target);
        const inMenu = menuRef.current?.contains(event.target);
        if (!inWrap && !inMenu) setMoreOpen(false);
      };
      document.addEventListener("mousedown", handleClickOutside);
      removeListener = () => document.removeEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timerId);
      removeListener();
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setMoreOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  useEffect(() => {
    if (!visitOk && moreOpen) setMoreOpen(false);
  }, [visitOk, moreOpen]);

  if (!visitOk || !row) return null;

  return (
    <div
      ref={wrapRef}
      className="d-inline-flex align-items-center gap-1 justify-content-end flex-wrap"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="btn btn-sm btn-primary"
        onClick={(e) => {
          e.stopPropagation();
          onOpenDrawer?.(row);
        }}
      >
        View
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-secondary d-inline-flex align-items-center gap-1"
        onClick={(e) => {
          e.stopPropagation();
          // Toggle on click (not mousedown). Opening on mousedown re-renders a full-screen backdrop
          // before mouseup; the next event can hit the backdrop and close the menu instantly.
          setMoreOpen((prev) => !prev);
        }}
        aria-expanded={moreOpen}
        aria-haspopup="menu"
        aria-controls={menuDomId}
        title="More actions"
      >
        <i className="ri-more-2-fill" aria-hidden />
        <span className="d-none d-xl-inline">More</span>
      </button>

      {moreOpen &&
        typeof document !== "undefined" &&
        document.body &&
        createPortal(
          <>
            <div
              role="presentation"
              aria-hidden="true"
              style={{ position: "fixed", inset: 0, zIndex: 9998 }}
              onClick={() => setMoreOpen(false)}
            />
            <div
              id={menuDomId}
              ref={menuRef}
              role="menu"
              className="dropdown-menu show"
              style={{
                position: "fixed",
                display: "block",
                visibility: "visible",
                minWidth: "220px",
                padding: "8px",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                zIndex: 9999,
                backgroundColor: "#ffffff",
                top: `${position.top}px`,
                right: `${position.right}px`,
              }}
            >
              {actions.map((action, idx) => {
                if (action.divider) {
                  return <div key={idx} className="dropdown-divider my-2" />;
                }
                if (action.href) {
                  return (
                    <Link
                      key={idx}
                      href={action.href}
                      role="menuitem"
                      className="dropdown-item d-flex align-items-center gap-2 py-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        action.onClick?.(e);
                        queueMicrotask(() => setMoreOpen(false));
                      }}
                    >
                      {action.iconClass ? <i className={action.iconClass} style={{ width: "1.1rem" }} aria-hidden /> : null}
                      <span>{action.label}</span>
                    </Link>
                  );
                }
                return (
                  <button
                    key={idx}
                    type="button"
                    role="menuitem"
                    className="dropdown-item d-flex align-items-center gap-2 py-2 w-100 text-start border-0 bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoreOpen(false);
                      action.onClick?.(e);
                    }}
                  >
                    {action.iconClass ? <i className={action.iconClass} style={{ width: "1.1rem" }} aria-hidden /> : null}
                    <span>{action.label}</span>
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
    </div>
  );
}
