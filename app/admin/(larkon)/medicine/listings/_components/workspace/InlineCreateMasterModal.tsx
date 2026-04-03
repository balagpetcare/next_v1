"use client";

import { useState } from "react";
import { adminMedicineWorkspaceApi } from "@/lib/adminApi";

export type InlineMasterKind = "generic" | "dosageForm" | "manufacturer" | "brand" | "presentation";

type Props = {
  show: boolean;
  kind: InlineMasterKind;
  onClose: () => void;
  onCreated: (opt: { id: number; label: string }) => void;
  /** Required when kind === "brand" */
  manufacturerId?: number | null;
  /** Required when kind === "presentation" */
  genericId?: number | null;
  dosageFormId?: number | null;
};

export default function InlineCreateMasterModal({
  show,
  kind,
  onClose,
  onCreated,
  manufacturerId,
  genericId,
  dosageFormId,
}: Props) {
  const [name, setName] = useState("");
  const [strength, setStrength] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!show) return null;

  const title =
    kind === "generic"
      ? "New generic"
      : kind === "dosageForm"
        ? "New dosage form"
        : kind === "manufacturer"
          ? "New manufacturer"
          : kind === "brand"
            ? "New brand"
            : "New presentation (strength)";

  const submit = async () => {
    setErr("");
    setBusy(true);
    try {
      if (kind === "generic") {
        const r = await adminMedicineWorkspaceApi.genericsCreate({ displayName: name.trim() });
        const d = r.data as { id?: number; displayName?: string };
        if (d?.id) onCreated({ id: d.id, label: d.displayName ?? name.trim() });
      } else if (kind === "dosageForm") {
        const r = await adminMedicineWorkspaceApi.dosageFormsCreate({ displayName: name.trim() });
        const d = r.data as { id?: number; displayName?: string };
        if (d?.id) onCreated({ id: d.id, label: d.displayName ?? name.trim() });
      } else if (kind === "manufacturer") {
        const r = await adminMedicineWorkspaceApi.manufacturersCreate({ displayName: name.trim() });
        const d = r.data as { id?: number; displayName?: string };
        if (d?.id) onCreated({ id: d.id, label: d.displayName ?? name.trim() });
      } else if (kind === "brand") {
        if (manufacturerId == null) throw new Error("Select a manufacturer first");
        const r = await adminMedicineWorkspaceApi.brandsCreate({ manufacturerId, displayName: name.trim() });
        const d = r.data as { id?: number; displayName?: string };
        if (d?.id) onCreated({ id: d.id, label: d.displayName ?? name.trim() });
      } else if (kind === "presentation") {
        if (genericId == null || dosageFormId == null) throw new Error("Generic and dosage form required");
        const r = await adminMedicineWorkspaceApi.presentationsCreate({
          genericId,
          dosageFormId,
          strengthDisplay: strength.trim(),
        });
        const d = r.data as { id?: number; strengthDisplay?: string };
        if (d?.id) onCreated({ id: d.id, label: d.strengthDisplay ?? strength.trim() });
      }
      setName("");
      setStrength("");
      onClose();
    } catch (e) {
      setErr((e as Error)?.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content radius-12">
          <div className="modal-header">
            <h6 className="modal-title">{title}</h6>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {err ? <div className="alert alert-danger py-2 small">{err}</div> : null}
            {kind === "presentation" ? (
              <div className="mb-3">
                <label className="form-label small">Strength (e.g. 500 mg, 10 mg/ml)</label>
                <input className="form-control form-control-sm" value={strength} onChange={(e) => setStrength(e.target.value)} autoFocus />
              </div>
            ) : (
              <div className="mb-3">
                <label className="form-label small">Display name</label>
                <input className="form-control form-control-sm" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
            )}
            {kind === "brand" && manufacturerId == null ? (
              <p className="small text-warning mb-0">Choose a manufacturer in Core identity before creating a brand.</p>
            ) : null}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-light btn-sm" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm radius-8"
              disabled={busy || (kind === "presentation" ? !strength.trim() : !name.trim()) || (kind === "brand" && manufacturerId == null)}
              onClick={() => submit()}
            >
              {busy ? "Saving…" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
