"use client";

import { useEffect, useState } from "react";
import { getEnforcementHolds } from "../_lib/producerApi";

/**
 * Shows a warning banner when the current producer org/product/batch has an active enforcement hold.
 * Use on dashboard (no props), product detail (productId), batch detail (batchId).
 */
export default function EnforcementHoldBanner({ productId, batchId }) {
  const [holds, setHolds] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getEnforcementHolds({ productId, batchId });
        if (!cancelled) setHolds(data || null);
      } catch {
        if (!cancelled) setHolds(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [productId, batchId]);

  if (loading || !holds) return null;
  const orgHold = holds.orgHold;
  const productHold = holds.productHold;
  const batchHold = holds.batchHold;
  const hasHold = orgHold || productHold || batchHold;
  if (!hasHold) return null;

  const messages = [];
  if (orgHold?.caseNo) messages.push(`Organization is under an enforcement hold (Case ${orgHold.caseNo}).`);
  if (productHold?.caseNo) messages.push(`This product is under an enforcement hold (Case ${productHold.caseNo}).`);
  if (batchHold?.caseNo) messages.push(`This batch is under an enforcement hold (Case ${batchHold.caseNo}).`);

  return (
    <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
      <span className="me-2">⚠</span>
      <div>
        <strong>Trust & Safety</strong>
        <p className="mb-0 small">{messages.join(" ")} Contact support if you believe this is an error.</p>
      </div>
    </div>
  );
}
