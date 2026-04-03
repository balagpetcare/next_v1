"use client";

import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";
import MedicineConfirmModal from "../../_components/MedicineConfirmModal";
import { ADMIN_MEDICINE_BASE, ADMIN_MEDICINE_IMPORTS } from "../../_lib/paths";

type ModalKind = "deactivate" | "activate" | "archive" | "restore" | null;

type Props = {
  listingId: number;
  archived: boolean;
  isActive: boolean;
  firstImportBatchId?: number | null;
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
  onAfterMutation: () => void;
  onWorkspaceError: (message: string) => void;
};

export default function MedicineListingRowActions({
  listingId,
  archived,
  isActive,
  firstImportBatchId,
  menuOpen,
  onMenuOpenChange,
  onAfterMutation,
  onWorkspaceError,
}: Props) {
  const detail = `${ADMIN_MEDICINE_BASE}/listings/${listingId}`;
  const editHref = `${detail}/edit`;
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ top: number; left: number; minWidth: number }>({ top: 0, left: 0, minWidth: 0 });
  const [mounted, setMounted] = useState(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [deactivateNote, setDeactivateNote] = useState("");
  const [archiveReason, setArchiveReason] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const positionMenu = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const minWidth = Math.max(200, r.width);
    setMenuStyle({
      top: r.bottom + window.scrollY + 4,
      left: r.right + window.scrollX - minWidth,
      minWidth,
    });
  }, []);

  useLayoutEffect(() => {
    if (menuOpen) positionMenu();
  }, [menuOpen, positionMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const onScroll = () => positionMenu();
    const onResize = () => positionMenu();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen, positionMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      const portalMenu = document.getElementById(`ml-actions-menu-${listingId}`);
      if (portalMenu?.contains(t)) return;
      onMenuOpenChange(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen, listingId, onMenuOpenChange]);

  const closeMenu = () => onMenuOpenChange(false);

  const run = async (fn: () => Promise<void>) => {
    try {
      setBusy(true);
      onWorkspaceError("");
      await fn();
      closeMenu();
      onAfterMutation();
    } catch (e) {
      onWorkspaceError((e as Error)?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const menu =
    menuOpen && mounted
      ? createPortal(
          <ul
            id={`ml-actions-menu-${listingId}`}
            className="dropdown-menu show shadow-sm radius-12 py-1"
            style={{
              position: "absolute",
              top: menuStyle.top,
              left: menuStyle.left,
              minWidth: menuStyle.minWidth,
              zIndex: 1080,
              display: "block",
            }}
            role="menu"
          >
            <li role="none">
              <Link className="dropdown-item" href={detail} role="menuitem" onClick={closeMenu}>
                <i className="ri-external-link-line me-2" aria-hidden />
                Open
              </Link>
            </li>
            <li role="none">
              <Link className="dropdown-item" href={editHref} role="menuitem" onClick={closeMenu}>
                <i className="ri-edit-2-line me-2" aria-hidden />
                Edit
              </Link>
            </li>
            {!archived && isActive ? (
              <li role="none">
                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setDeactivateNote("");
                    setModal("deactivate");
                    closeMenu();
                  }}
                >
                  <i className="ri-pause-circle-line me-2" aria-hidden />
                  Disable
                </button>
              </li>
            ) : null}
            {!archived && !isActive ? (
              <li role="none">
                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setModal("activate");
                    closeMenu();
                  }}
                >
                  <i className="ri-play-circle-line me-2" aria-hidden />
                  Enable
                </button>
              </li>
            ) : null}
            {!archived ? (
              <li role="none">
                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setArchiveReason("");
                    setModal("archive");
                    closeMenu();
                  }}
                >
                  <i className="ri-archive-line me-2" aria-hidden />
                  Archive
                </button>
              </li>
            ) : null}
            {archived ? (
              <li role="none">
                <button
                  type="button"
                  className="dropdown-item"
                  role="menuitem"
                  disabled={busy}
                  onClick={() => {
                    setModal("restore");
                    closeMenu();
                  }}
                >
                  <i className="ri-arrow-go-back-line me-2" aria-hidden />
                  Restore
                </button>
              </li>
            ) : null}
            {firstImportBatchId != null ? (
              <li role="none">
                <Link
                  className="dropdown-item"
                  href={`${ADMIN_MEDICINE_IMPORTS}/${firstImportBatchId}`}
                  role="menuitem"
                  onClick={closeMenu}
                >
                  <i className="ri-git-branch-line me-2" aria-hidden />
                  View import source
                </Link>
              </li>
            ) : (
              <li role="none">
                <span className="dropdown-item-text small text-muted">No import batch on file</span>
              </li>
            )}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className="dropdown text-end" onClick={(e) => e.stopPropagation()}>
      <button
        ref={btnRef}
        type="button"
        className="btn btn-sm btn-outline-secondary dropdown-toggle radius-8"
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMenuOpenChange(!menuOpen);
        }}
      >
        Actions
      </button>
      {menu}

      <MedicineConfirmModal
        open={modal === "deactivate"}
        title="Disable listing"
        confirmLabel="Disable"
        confirmVariant="warning"
        busy={busy}
        onClose={() => setModal(null)}
        onConfirm={() =>
          run(async () => {
            await adminMedicineWorkspaceApi.listingsPatch(listingId, {
              isActive: false,
              deactivatedReason: deactivateNote.trim() || undefined,
            });
            setModal(null);
          })
        }
      >
        <p>Optional note stored on the audit trail.</p>
        <label className="form-label">Note</label>
        <input className="form-control form-control-sm" value={deactivateNote} onChange={(e) => setDeactivateNote(e.target.value)} />
      </MedicineConfirmModal>

      <MedicineConfirmModal
        open={modal === "activate"}
        title="Enable listing"
        confirmLabel="Enable"
        confirmVariant="success"
        busy={busy}
        onClose={() => setModal(null)}
        onConfirm={() =>
          run(async () => {
            await adminMedicineWorkspaceApi.listingsPatch(listingId, { isActive: true, deactivatedReason: null });
            setModal(null);
          })
        }
      >
        <p>Activate this SKU for new prescribing in the catalog?</p>
      </MedicineConfirmModal>

      <MedicineConfirmModal
        open={modal === "archive"}
        title="Archive listing"
        confirmLabel="Archive"
        confirmVariant="danger"
        busy={busy}
        onClose={() => setModal(null)}
        onConfirm={() =>
          run(async () => {
            await adminMedicineWorkspaceApi.listingsArchive(listingId, { reason: archiveReason.trim() || undefined });
            setModal(null);
          })
        }
      >
        <p className="text-muted small">Archive is blocked if prescriptions reference this listing.</p>
        <label className="form-label">Reason (optional)</label>
        <input className="form-control form-control-sm" value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} />
      </MedicineConfirmModal>

      <MedicineConfirmModal
        open={modal === "restore"}
        title="Restore from archive"
        confirmLabel="Restore"
        confirmVariant="success"
        busy={busy}
        onClose={() => setModal(null)}
        onConfirm={() =>
          run(async () => {
            await adminMedicineWorkspaceApi.listingsRestore(listingId);
            setModal(null);
          })
        }
      >
        <p>Restore this listing from archive?</p>
      </MedicineConfirmModal>
    </div>
  );
}
