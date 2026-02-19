"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import LkInput from "@larkon-ui/components/LkInput";
import { useBranchContext } from "@/lib/useBranchContext";
import { staffGetDispatch, staffReceiveDispatch } from "@/lib/api";
import { useToast } from "@/src/hooks/useToast";
import { getMessageFromApiError } from "@/src/lib/apiErrorToMessage";
import Card from "@/src/bpa/components/ui/Card";
import BranchHeader from "@/src/components/branch/BranchHeader";
import AccessDenied from "@/src/components/branch/AccessDenied";

const REQUIRED_PERM = "inventory.receive";

function statusBadge(status) {
  const map = {
    IN_TRANSIT: "bg-info",
    DELIVERED: "bg-success",
    CREATED: "bg-secondary",
    PACKED: "bg-warning text-dark",
  };
  return map[status] ?? "bg-secondary";
}

function formatSentDate(dispatch) {
  const d = dispatch.inTransitAt ?? dispatch.createdAt;
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { dateStyle: "medium" }) + " " + date.toLocaleTimeString(undefined, { timeStyle: "short" });
}

export default function StaffDispatchReceivePage() {
  const params = useParams();
  const router = useRouter();
  const branchId = useMemo(() => String(params?.branchId ?? ""), [params]);
  const dispatchId = useMemo(() => parseInt(params?.dispatchId ?? "0", 10), [params]);
  const { branch, myAccess, isLoading: ctxLoading, errorCode, hasViewPermission } = useBranchContext(branchId);
  const toast = useToast();

  const [dispatch, setDispatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receiveSuccess, setReceiveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState("");
  const [lineInputs, setLineInputs] = useState({});
  const [rowChecked, setRowChecked] = useState({});
  const permissions = myAccess?.permissions ?? [];
  const canReceive = permissions.includes(REQUIRED_PERM);

  useEffect(() => {
    if (errorCode === "unauthorized") router.replace("/staff/login");
  }, [errorCode, router]);

  useEffect(() => {
    if (!dispatchId || dispatchId <= 0) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    staffGetDispatch(dispatchId)
      .then((d) => {
        if (!cancelled && d) {
          setDispatch(d);
          const init = {};
          const checked = {};
          (d.items ?? []).forEach((line) => {
            const key = `${line.variantId}-${line.lotId ?? 0}`;
            const dispatched = line.quantityDispatched ?? 0;
            const alreadyR = line.quantityReceived ?? 0;
            const alreadyD = line.quantityDamaged ?? 0;
            const alreadyS = line.quantityShort ?? 0;
            const remaining = dispatched - alreadyR - alreadyD - alreadyS;
            init[key] = {
              received: remaining > 0 ? String(remaining) : "0",
              damaged: "0",
              short: "0",
            };
            checked[key] = false;
          });
          setLineInputs(init);
          setRowChecked(checked);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load dispatch");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dispatchId]);

  const getLineKey = (line) => `${line.variantId}-${line.lotId ?? 0}`;

  const getRemaining = useCallback((line) => {
    const dispatched = line.quantityDispatched ?? 0;
    const alreadyR = line.quantityReceived ?? 0;
    const alreadyD = line.quantityDamaged ?? 0;
    const alreadyS = line.quantityShort ?? 0;
    return dispatched - alreadyR - alreadyD - alreadyS;
  }, []);

  const updateLine = (key, field, value) => {
    setLineInputs((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [field]: value },
    }));
  };

  const toggleRow = (key) => {
    setRowChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const receiveAll = () => {
    if (!dispatch?.items?.length) return;
    const nextChecked = { ...rowChecked };
    const nextInputs = { ...lineInputs };
    dispatch.items.forEach((line) => {
      const key = getLineKey(line);
      const remaining = getRemaining(line);
      if (remaining > 0) {
        nextChecked[key] = true;
        nextInputs[key] = {
          ...(nextInputs[key] ?? {}),
          received: String(remaining),
          damaged: nextInputs[key]?.damaged ?? "0",
          short: nextInputs[key]?.short ?? "0",
        };
      }
    });
    setRowChecked(nextChecked);
    setLineInputs(nextInputs);
  };

  const getRowTotal = (key) => {
    const inp = lineInputs[key] ?? { received: "0", damaged: "0", short: "0" };
    const r = Math.max(0, parseInt(inp.received ?? "0", 10));
    const d = Math.max(0, parseInt(inp.damaged ?? "0", 10));
    const s = Math.max(0, parseInt(inp.short ?? "0", 10));
    return r + d + s;
  };

  const getRowError = (line) => {
    const key = getLineKey(line);
    if (!rowChecked[key]) return null;
    const remaining = getRemaining(line);
    const total = getRowTotal(key);
    if (total > remaining) return `Total cannot exceed ${remaining}`;
    return null;
  };

  const canSubmit = useMemo(() => {
    if (!dispatch?.items?.length || receiveSuccess || submitting) return false;
    let hasAnyChecked = false;
    let allValid = true;
    for (const line of dispatch.items) {
      const key = getLineKey(line);
      if (!rowChecked[key]) continue;
      hasAnyChecked = true;
      const total = getRowTotal(key);
      if (total <= 0) allValid = false;
      const remaining = getRemaining(line);
      if (total > remaining) allValid = false;
    }
    return hasAnyChecked && allValid;
  }, [dispatch?.items, lineInputs, rowChecked, receiveSuccess, submitting, getRemaining]);

  const summary = useMemo(() => {
    let lines = 0;
    let qty = 0;
    (dispatch?.items ?? []).forEach((line) => {
      const key = getLineKey(line);
      if (!rowChecked[key]) return;
      const total = getRowTotal(key);
      if (total <= 0) return;
      lines += 1;
      qty += total;
    });
    return { lines, qty };
  }, [dispatch?.items, rowChecked, lineInputs, getLineKey]);

  const buildItems = useCallback(() => {
    const items = [];
    (dispatch?.items ?? []).forEach((line) => {
      const key = getLineKey(line);
      if (!rowChecked[key]) return;
      const inp = lineInputs[key];
      if (!inp) return;
      const received = Math.max(0, parseInt(inp.received ?? "0", 10));
      const damaged = Math.max(0, parseInt(inp.damaged ?? "0", 10));
      const short = Math.max(0, parseInt(inp.short ?? "0", 10));
      if (received + damaged + short <= 0) return;
      const remaining = getRemaining(line);
      if (received + damaged + short > remaining) return;
      items.push({
        variantId: line.variantId,
        lotId: line.lotId ?? undefined,
        quantityReceived: received,
        quantityDamaged: damaged,
        quantityShort: short,
      });
    });
    return items;
  }, [dispatch?.items, rowChecked, lineInputs, getRemaining]);

  const doSubmit = useCallback(
    (items) => {
      if (items.length === 0) {
        toast.warning("Select at least one line with quantity to receive.");
        return;
      }
      setSubmitting(true);
      setError("");
      staffReceiveDispatch(dispatchId, { items, notes })
        .then(() => {
          setReceiveSuccess(true);
          toast.success("Received successfully", { duration: 5000 });
          setTimeout(() => router.push(`/staff/branch/${branchId}/inventory/incoming`), 1200);
        })
        .catch((err) => {
          const msg = getMessageFromApiError(err);
          setError(msg);
          toast.error(msg);
        })
        .finally(() => setSubmitting(false));
    },
    [dispatchId, notes, branchId, router, toast]
  );

  const handleReceiveSelected = (e) => {
    e.preventDefault();
    if (!dispatch || dispatch.status !== "IN_TRANSIT") {
      toast.error("Dispatch is not in transit. Cannot receive.");
      return;
    }
    const items = buildItems();
    doSubmit(items);
  };

  const handleReceiveAll = (e) => {
    e.preventDefault();
    if (!dispatch || dispatch.status !== "IN_TRANSIT") {
      toast.error("Dispatch is not in transit. Cannot receive.");
      return;
    }
    const items = [];
    (dispatch?.items ?? []).forEach((line) => {
      const remaining = getRemaining(line);
      if (remaining <= 0) return;
      items.push({
        variantId: line.variantId,
        lotId: line.lotId ?? undefined,
        quantityReceived: remaining,
        quantityDamaged: 0,
        quantityShort: 0,
      });
    });
    if (items.length === 0) {
      toast.warning("No remaining quantity to receive.");
      return;
    }
    doSubmit(items);
  };

  if (ctxLoading) {
    return (
      <div className="container py-40 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-16 text-secondary-light">Loading...</p>
      </div>
    );
  }
  if (errorCode === "forbidden" || !hasViewPermission || !canReceive) {
    return (
      <AccessDenied
        missingPerm={REQUIRED_PERM}
        onBack={() => router.push(`/staff/branch/${branchId}/inventory/incoming`)}
      />
    );
  }

  if (loading || !dispatch) {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="text-center py-40">
          {loading ? (
            <>
              <div className="spinner-border text-primary" role="status" />
              <p className="mt-16 text-secondary-light">Loading dispatch...</p>
            </>
          ) : (
            <p className="text-secondary-light">Dispatch not found.</p>
          )}
          <Link href={`/staff/branch/${branchId}/inventory/incoming`} className="btn btn-outline-primary btn-sm mt-16">
            Back to Incoming
          </Link>
        </div>
      </div>
    );
  }

  if (dispatch.status !== "IN_TRANSIT") {
    return (
      <div className="container py-24">
        <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />
        <div className="alert alert-info">
          Dispatch #{dispatchId} is <span className={`badge ${statusBadge(dispatch.status)}`}>{dispatch.status}</span>. It can only be received when IN_TRANSIT.
        </div>
        <Link href={`/staff/branch/${branchId}/inventory/incoming`} className="btn btn-outline-primary btn-sm">
          Back to Incoming
        </Link>
      </div>
    );
  }

  const fromName = dispatch.fromLocation?.name ?? "—";
  const toName = dispatch.toLocation?.name ?? "—";
  const sentDate = formatSentDate(dispatch);

  return (
    <div className="container py-24">
      <BranchHeader branch={branch} myAccess={myAccess} branchId={branchId} />

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-16 mb-24">
        <h5 className="mb-0">Receive by document</h5>
        <Link href={`/staff/branch/${branchId}/inventory/incoming`} className="btn btn-outline-primary btn-sm">
          Back to Incoming
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      <Card title="Document" className="mb-24">
        <div className="row g-2 small">
          <div className="col-12 col-md-6"><strong>From:</strong> {fromName}</div>
          <div className="col-12 col-md-6"><strong>To:</strong> {toName}</div>
          <div className="col-12 col-md-6"><strong>Document:</strong> Dispatch #{dispatch.id}</div>
          <div className="col-12 col-md-6"><strong>Sent date:</strong> {sentDate}</div>
          <div className="col-12"><strong>Status:</strong> <span className={`badge ${statusBadge(dispatch.status)}`}>{dispatch.status}</span></div>
        </div>
      </Card>

      <Card title="Receive items" subtitle="Check rows to receive. ReceiveQty + Damaged + Short must not exceed Remaining.">
        <form onSubmit={handleReceiveSelected}>
          <div className="table-responsive mb-24">
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Product</th>
                  <th>Lot / Expiry</th>
                  <th className="text-end">Sent</th>
                  <th className="text-end">Already</th>
                  <th className="text-end">Remaining</th>
                  <th className="text-end">ReceiveQty</th>
                  <th className="text-end">Damaged</th>
                  <th className="text-end">Short</th>
                </tr>
              </thead>
              <tbody>
                {(dispatch.items ?? []).map((line) => {
                  const key = getLineKey(line);
                  const dispatched = line.quantityDispatched ?? 0;
                  const alreadyR = line.quantityReceived ?? 0;
                  const alreadyD = line.quantityDamaged ?? 0;
                  const alreadyS = line.quantityShort ?? 0;
                  const remaining = getRemaining(line);
                  const inp = lineInputs[key] ?? { received: "0", damaged: "0", short: "0" };
                  const t = line.variant?.title ?? "";
                  const sku = line.variant?.sku ?? "";
                  const variantName = t && sku ? `${t} (${sku})` : (t || sku || `Variant ${line.variantId}`);
                  const lotDisplay = line.lot ? `${line.lot.lotCode ?? line.lot.id}${line.lot.expDate ? " · " + new Date(line.lot.expDate).toLocaleDateString() : ""}` : "—";
                  const rowErr = getRowError(line);
                  const checked = rowChecked[key];
                  return (
                    <tr
                      key={key}
                      className={rowErr ? "table-danger" : checked ? "table-light" : ""}
                      onClick={() => toggleRow(key)}
                      style={{ cursor: "pointer" }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={!!checked}
                          onChange={() => toggleRow(key)}
                          disabled={remaining <= 0}
                        />
                      </td>
                      <td>
                        {variantName}
                        {rowErr && <div className="small text-danger mt-0">{rowErr}</div>}
                      </td>
                      <td className="text-muted small">{lotDisplay}</td>
                      <td className="text-end">{dispatched}</td>
                      <td className="text-end">{alreadyR} / {alreadyD} / {alreadyS}</td>
                      <td className="text-end">{remaining}</td>
                      <td className="text-end" style={{ width: 90 }} onClick={(e) => e.stopPropagation()}>
                        <LkInput
                          type="number"
                          min={0}
                          max={remaining}
                          size="sm"
                          value={inp.received ?? "0"}
                          onChange={(e) => updateLine(key, "received", e.target.value)}
                          disabled={!checked || remaining <= 0}
                        />
                      </td>
                      <td className="text-end" style={{ width: 80 }} onClick={(e) => e.stopPropagation()}>
                        <LkInput
                          type="number"
                          min={0}
                          max={remaining}
                          size="sm"
                          value={inp.damaged ?? "0"}
                          onChange={(e) => updateLine(key, "damaged", e.target.value)}
                          disabled={!checked || remaining <= 0}
                        />
                      </td>
                      <td className="text-end" style={{ width: 80 }} onClick={(e) => e.stopPropagation()}>
                        <LkInput
                          type="number"
                          min={0}
                          max={remaining}
                          size="sm"
                          value={inp.short ?? "0"}
                          onChange={(e) => updateLine(key, "short", e.target.value)}
                          disabled={!checked || remaining <= 0}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {Object.keys(rowChecked).some((k) => rowChecked[k]) && (
            <div className="mb-3 small text-muted">
              Receiving {summary.lines} line(s), total Qty {summary.qty}
            </div>
          )}
          <div className="mb-16">
            <label className="form-label">Notes (optional)</label>
            <LkInput
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes..."
            />
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || receiveSuccess || !canSubmit}
            >
              {receiveSuccess ? "Received" : submitting ? "Receiving…" : "Receive selected"}
            </button>
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={submitting || receiveSuccess || !dispatch?.items?.some((line) => getRemaining(line) > 0)}
              onClick={handleReceiveAll}
            >
              Receive all
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
