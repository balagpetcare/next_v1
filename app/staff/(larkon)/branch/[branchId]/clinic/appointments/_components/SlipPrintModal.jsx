"use client";

import { useEffect, useState } from "react";
import { staffClinicAppointmentSlip, staffClinicAppointmentPaymentSlip } from "@/lib/api";

export default function SlipPrintModal({ branchId, appointmentId, type, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => {
    if (!branchId || !appointmentId) return;
    setError("");
    setLoading(true);
    const fn = type === "payment" ? staffClinicAppointmentPaymentSlip : staffClinicAppointmentSlip;
    fn(branchId, appointmentId)
      .then((d) => { setData(d); setError(""); })
      .catch(() => setError("slip_failed"))
      .finally(() => setLoading(false));
  }, [branchId, appointmentId, type, retryKey]);
  function doPrint() {
    const el = document.getElementById("slip-content");
    if (el) {
      const win = window.open("", "_blank");
      win.document.write(`
        <html><head><title>${type === "payment" ? "Payment" : "Appointment"} slip</title>
        <style>body{font-family:monospace;padding:12px;max-width:320px;} .row{display:flex;justify-content:space-between;} hr{margin:8px 0;}
        </style></head><body>${el.innerHTML}</body></html>`);
      win.document.close();
      win.print();
      win.close();
    }
  }
  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{type === "payment" ? "Payment slip" : "Appointment slip"}</h5>
            <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
          </div>
          <div className="modal-body">
            {loading && <p className="text-muted">Loading…</p>}
            {error && (
              <div className="alert alert-danger py-2">
                Slip could not be loaded. Close and refresh the list if needed.
                <div className="mt-2">
                  <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setRetryKey((k) => k + 1)}>
                    Retry
                  </button>
                </div>
              </div>
            )}
            {!error && data && (
              <div id="slip-content" className="slip-thermal">
                {type === "payment" ? (
                  <>
                    <div><strong>Payment slip</strong></div>
                    <hr />
                    <div className="row"><span>Appointment #</span><span>{data.appointmentId}</span></div>
                    <div className="row"><span>Token</span><span>{data.tokenNo ?? "—"}</span></div>
                    <div className="row"><span>Patient</span><span>{data.patientName}</span></div>
                    <div className="row"><span>Pet</span><span>{data.petName}</span></div>
                    <div className="row"><span>Service</span><span>{data.serviceName}</span></div>
                    <div className="row"><span>Amount</span><span>{data.paidAmount}</span></div>
                    <div className="row"><span>Method</span><span>{data.paymentMethod}</span></div>
                    <div className="row"><span>Paid at</span><span>{data.paidAt ? new Date(data.paidAt).toLocaleString() : ""}</span></div>
                  </>
                ) : (
                  <>
                    <div><strong>Appointment slip</strong></div>
                    <hr />
                    <div className="row"><span>ID / Token</span><span>{data.appointmentId} {data.tokenNo ? ` / ${data.tokenNo}` : ""}</span></div>
                    <div className="row"><span>Patient</span><span>{data.patientName}</span></div>
                    <div className="row"><span>Pet</span><span>{data.petName ?? "—"}</span></div>
                    <div className="row"><span>Doctor</span><span>{data.doctorName}</span></div>
                    <div className="row"><span>Service</span><span>{data.serviceName}</span></div>
                    <div className="row"><span>Date / Time</span><span>{data.scheduledStartAt ? new Date(data.scheduledStartAt).toLocaleString() : ""}</span></div>
                    <div className="row"><span>Payment</span><span>{data.paymentStatus ?? "UNPAID"}</span></div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Close</button>
            {data && <button type="button" className="btn btn-primary" onClick={doPrint}>Print</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
