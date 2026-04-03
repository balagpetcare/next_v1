"use client";

import { useEffect, useState } from "react";
import { staffClinicAppointmentCollectPayment } from "@/lib/api";

export default function PayNowModal({ branchId, appointment, onClose, onSuccess, onRefreshList }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isAppointmentNotFound = error && (String(error).toLowerCase().includes("appointment not found") || String(error).toLowerCase().includes("appointment or pet not found"));
  const suggestedAmount =
    appointment?.priceSnapshot?.totalAmount != null
      ? Number(appointment.priceSnapshot.totalAmount)
      : appointment?.service?.category === "CONSULTATION" && appointment?.doctor?.clinicStaffProfile?.defaultConsultationFee != null
        ? Number(appointment.doctor.clinicStaffProfile.defaultConsultationFee)
        : appointment?.service?.price != null
          ? Number(appointment.service.price)
          : 0;
  useEffect(() => {
    if (!amount && suggestedAmount) setAmount(String(suggestedAmount));
  }, [suggestedAmount]);
  async function handlePay() {
    if (isAppointmentNotFound) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) { setError("Enter a valid amount"); return; }
    setSubmitting(true);
    setError("");
    try {
      await staffClinicAppointmentCollectPayment(branchId, appointment.id, { amount: amt, method });
      onSuccess();
    } catch (e) {
      setError(e?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Collect payment — #{appointment?.id}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger py-2">
                {isAppointmentNotFound ? (
                  <>
                    This appointment could not be found (it may have been removed or is not available in this branch). Close and refresh the list to see current data.
                    {typeof onRefreshList === "function" && (
                      <div className="mt-2">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => { onRefreshList(); setError(""); }}>Refresh list</button>
                      </div>
                    )}
                  </>
                ) : (
                  error
                )}
              </div>
            )}
            {!isAppointmentNotFound && (
              <>
                <p className="small">Patient: {appointment?.patient?.profile?.displayName ?? "—"} | Service: {appointment?.service?.name ?? "—"}</p>
                <div className="mb-3">
                  <label className="form-label">Amount</label>
                  <input type="number" className="form-control" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={suggestedAmount} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Method</label>
                  <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="DIGITAL">Digital</option>
                  </select>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>{isAppointmentNotFound ? "Close" : "Cancel"}</button>
            {!isAppointmentNotFound && (
              <button type="button" className="btn btn-primary" onClick={handlePay} disabled={submitting}>{submitting ? "…" : "Collect & close"}</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
