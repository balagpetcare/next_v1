"use client";

import { useEffect, useState } from "react";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

/** API returns { lotId, lot: { id, lotCode, mfgDate, expDate }, onHandQty } */
type FefoLotItem = {
  lotId: number;
  lot: { id: number; lotCode: string; mfgDate?: string | null; expDate?: string | null };
  onHandQty?: number;
};

type LotSectionProps = {
  useExistingLot: boolean;
  onUseExistingLotChange: (use: boolean) => void;
  locationId: string;
  variantId: number | null;
  orgId: string;
  /** Existing lot */
  lotId: string;
  onLotIdChange: (id: string) => void;
  /** New lot */
  lotCode: string;
  onLotCodeChange: (v: string) => void;
  mfgDate: string;
  onMfgDateChange: (v: string) => void;
  expDate: string;
  onExpDateChange: (v: string) => void;
  requiresExpiry?: boolean;
  disabled?: boolean;
};

export function LotSection({
  useExistingLot,
  onUseExistingLotChange,
  locationId,
  variantId,
  orgId,
  lotId,
  onLotIdChange,
  lotCode,
  onLotCodeChange,
  mfgDate,
  onMfgDateChange,
  expDate,
  onExpDateChange,
  requiresExpiry,
  disabled,
}: LotSectionProps) {
  const [lots, setLots] = useState<FefoLotItem[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);

  useEffect(() => {
    if (!locationId || !variantId) {
      setLots([]);
      return;
    }
    setLoadingLots(true);
    ownerGet<{ data?: FefoLotItem[] }>(
      `/api/v1/inventory/fefo?locationId=${locationId}&variantId=${variantId}`
    )
      .then((res) => setLots(Array.isArray(res?.data) ? res.data : []))
      .catch(() => setLots([]))
      .finally(() => setLoadingLots(false));
  }, [locationId, variantId]);

  const expDateObj = expDate ? new Date(expDate) : null;
  const expWarnPast = expDateObj && expDateObj <= new Date();

  return (
    <div className="border rounded p-2 bg-light">
      <div className="form-check form-check-inline">
        <input
          type="radio"
          id="lot-existing"
          className="form-check-input"
          checked={useExistingLot}
          onChange={() => onUseExistingLotChange(true)}
          disabled={disabled || !locationId || !variantId}
        />
        <label className="form-check-label small" htmlFor="lot-existing">
          Use existing lot
        </label>
      </div>
      <div className="form-check form-check-inline">
        <input
          type="radio"
          id="lot-new"
          className="form-check-input"
          checked={!useExistingLot}
          onChange={() => onUseExistingLotChange(false)}
          disabled={disabled}
        />
        <label className="form-check-label small" htmlFor="lot-new">
          Create new lot
        </label>
      </div>

      {useExistingLot && (
        <div className="mt-2">
          <label className="form-label small">Lot</label>
          <select
            className="form-select form-select-sm"
            value={lotId}
            onChange={(e) => onLotIdChange(e.target.value)}
            disabled={disabled || loadingLots || lots.length === 0}
          >
            <option value="">{loadingLots ? "Loading…" : lots.length === 0 ? "No lots at this location" : "Select lot"}</option>
            {lots.map((item) => {
              const lot = item.lot;
              const expStr = lot.expDate ? (typeof lot.expDate === "string" ? lot.expDate : (lot.expDate as Date)?.toISOString?.()?.slice(0, 10)) : "";
              return (
                <option key={lot.id} value={lot.id}>
                  {lot.lotCode} {expStr ? `(exp: ${expStr})` : ""}
                </option>
              );
            })}
          </select>
        </div>
      )}

      {!useExistingLot && (
        <div className="row g-2 mt-2">
          <div className="col-12 col-md-4">
            <label className="form-label small">Org ID</label>
            <input type="text" className="form-control form-control-sm" value={orgId} readOnly disabled />
            <span className="form-text small">From location</span>
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label small">Lot code</label>
            <input
              type="text"
              className="form-control form-control-sm"
              value={lotCode}
              onChange={(e) => onLotCodeChange(e.target.value)}
              placeholder="e.g. LOT-001"
              disabled={disabled}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label small">Mfg date</label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={mfgDate}
              onChange={(e) => onMfgDateChange(e.target.value)}
              disabled={disabled}
            />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label small">
              Expiry date {requiresExpiry && <span className="text-danger">*</span>}
            </label>
            <input
              type="date"
              className="form-control form-control-sm"
              value={expDate}
              onChange={(e) => onExpDateChange(e.target.value)}
              disabled={disabled}
            />
            {expWarnPast && <span className="small text-warning">Expiry is in the past</span>}
          </div>
        </div>
      )}
    </div>
  );
}
