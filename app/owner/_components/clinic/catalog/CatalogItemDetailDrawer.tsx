"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Offcanvas } from "react-bootstrap";
import { ownerClinicItemById } from "@/app/owner/_lib/ownerApi";
import { DOMAIN_BADGE } from "./catalogConstants";

type ItemDetail = {
  id: number;
  itemCode: string;
  name: string;
  domainType: string;
  baseUnit?: string | null;
  description?: string | null;
  isActive?: boolean;
  category?: { id: number; name: string };
  consumableProfile?: {
    consumableType?: string;
    sterileRequired?: boolean;
    wastageTrackRequired?: boolean;
    procedureLinked?: boolean;
    issueUnit?: string | null;
    usageNoteTemplate?: string | null;
  } | null;
  instrumentProfile?: { sterilizationRequired?: boolean } | null;
  _count?: { packageItems?: number };
  variants?: Array<{ id: number; variantName: string }>;
};

type CatalogItemDetailDrawerProps = {
  branchId: string;
  itemId: number | null;
  show: boolean;
  onHide: () => void;
  onUpdated?: () => void;
  /** Pass from list row when available to avoid extra request for count */
  linkageCount?: number;
};

export default function CatalogItemDetailDrawer({
  branchId,
  itemId,
  show,
  onHide,
  onUpdated,
  linkageCount: linkageCountProp,
}: CatalogItemDetailDrawerProps) {
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show || !branchId || !itemId) {
      setItem(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    ownerClinicItemById(branchId, itemId)
      .then((data) => {
        if (!cancelled && data) setItem(data as ItemDetail);
      })
      .catch(() => {
        if (!cancelled) setItem(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [show, branchId, itemId]);

  const linkageCount = linkageCountProp ?? (item as ItemDetail & { _count?: { packageItems?: number } })?._count?.packageItems ?? 0;

  return (
    <Offcanvas show={show} onHide={onHide} placement="end" className="border-0 shadow-lg" style={{ width: "min(400px, 100vw)" }}>
      <Offcanvas.Header closeButton className="border-bottom">
        <Offcanvas.Title className="fw-semibold">Item details</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body className="p-0">
        {loading ? (
          <div className="p-4 text-center text-muted">
            <div className="spinner-border spinner-border-sm" role="status" />
            <p className="mb-0 mt-2 small">Loading…</p>
          </div>
        ) : !item ? (
          <div className="p-4 text-center text-muted small">Item not found.</div>
        ) : (
          <div className="p-4">
            <div className="mb-3">
              <div className="fw-semibold fs-6">{item.name}</div>
              <code className="small text-muted">{item.itemCode}</code>
            </div>
            <div className="mb-3">
              <span className={`badge radius-8 me-1 mb-1 ${DOMAIN_BADGE[item.domainType] ?? "bg-secondary"}`}>
                {item.domainType}
              </span>
              {item.category && (
                <span className="badge bg-secondary-subtle text-secondary-emphasis radius-8 mb-1">{item.category.name}</span>
              )}
            </div>
            <dl className="row small mb-0">
              <dt className="col-5 text-muted">Base unit</dt>
              <dd className="col-7">{item.baseUnit || "—"}</dd>
              {item.consumableProfile && (
                <>
                  <dt className="col-5 text-muted">Issue unit</dt>
                  <dd className="col-7">{item.consumableProfile.issueUnit || "—"}</dd>
                  <dt className="col-5 text-muted">Consumable type</dt>
                  <dd className="col-7">{item.consumableProfile.consumableType || "—"}</dd>
                </>
              )}
              <dt className="col-5 text-muted">Status</dt>
              <dd className="col-7">{item.isActive !== false ? "Active" : "Inactive"}</dd>
              <dt className="col-5 text-muted">Where used</dt>
              <dd className="col-7">{linkageCount} package(s)</dd>
            </dl>
            {(item.consumableProfile?.sterileRequired || item.consumableProfile?.wastageTrackRequired || item.consumableProfile?.procedureLinked) && (
              <div className="mt-3">
                <div className="small text-muted mb-1">Flags</div>
                <div className="d-flex flex-wrap gap-1">
                  {item.consumableProfile.sterileRequired && <span className="badge bg-info-subtle text-info-emphasis radius-8">Sterile</span>}
                  {item.consumableProfile.wastageTrackRequired && <span className="badge bg-warning-subtle text-warning-emphasis radius-8">Wastage tracked</span>}
                  {item.consumableProfile.procedureLinked && <span className="badge bg-primary-subtle text-primary-emphasis radius-8">Procedure-linked</span>}
                </div>
              </div>
            )}
            {item.consumableProfile?.usageNoteTemplate && (
              <div className="mt-3">
                <div className="small text-muted mb-1">Usage template</div>
                <p className="small mb-0 bg-light rounded p-2">{item.consumableProfile.usageNoteTemplate}</p>
              </div>
            )}
            <div className="mt-4 pt-3 border-top d-flex flex-wrap gap-2">
              <Link
                href={`/owner/clinic/${branchId}/catalog/${item.id}`}
                className="btn btn-primary btn-sm radius-8"
                onClick={() => { onUpdated?.(); onHide(); }}
              >
                Full edit
              </Link>
              <Link
                href={`/owner/clinic/${branchId}/catalog/${item.id}`}
                className="btn btn-outline-secondary btn-sm radius-8"
                onClick={onHide}
              >
                View page
              </Link>
            </div>
          </div>
        )}
      </Offcanvas.Body>
    </Offcanvas>
  );
}
