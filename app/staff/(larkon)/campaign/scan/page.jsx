"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CampaignStaffShell from "@/src/bpa/campaign/staff/CampaignStaffShell";
import { campaignStaffValidateQr, loadCampaignStaffContext } from "@/lib/campaignApi";

export default function CampaignStaffScanPage() {
  const router = useRouter();
  const ctx = loadCampaignStaffContext();
  const videoRef = useRef(null);
  const [manual, setManual] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const processToken = useCallback(
    async (raw) => {
      if (!raw || busy) return;
      setBusy(true);
      setError("");
      try {
        let token = raw.trim();
        try {
          const url = new URL(token);
          const m = url.pathname.match(/\/c\/([a-f0-9]{32})/i) || url.pathname.match(/([a-f0-9]{32})/i);
          if (m) token = m[1];
        } catch {
          /* direct token or VAC-ref */
        }
        if (/^VAC-/i.test(token)) {
          router.push(`/staff/campaign/booking/${encodeURIComponent(token.toUpperCase())}`);
          return;
        }
        const result = await campaignStaffValidateQr(token);
        if (result.valid && result.bookingRef) {
          router.push(`/staff/campaign/booking/${encodeURIComponent(result.bookingRef)}`);
          return;
        }
        router.push(`/staff/campaign/booking/${encodeURIComponent(token)}`);
      } catch (e) {
        setError(e?.message || "Invalid QR code");
        setBusy(false);
      }
    },
    [busy, router]
  );

  useEffect(() => {
    if (!cameraOn || typeof window === "undefined") return;
    let stream;
    let detector;
    let raf;
    const run = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if ("BarcodeDetector" in window) {
          detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          const tick = async () => {
            if (!videoRef.current || !detector) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes?.[0]?.rawValue) {
                await processToken(codes[0].rawValue);
                return;
              }
            } catch {
              /* ignore frame errors */
            }
            raf = requestAnimationFrame(tick);
          };
          tick();
        } else {
          setError("QR auto-scan not supported in this browser. Use manual entry below.");
        }
      } catch {
        setError("Camera unavailable. Use manual entry below.");
        setCameraOn(false);
      }
    };
    run();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks?.().forEach((t) => t.stop());
    };
  }, [cameraOn, processToken]);

  if (!ctx) {
    return (
      <CampaignStaffShell title="Scan QR" backHref="/staff/campaign">
        <p className="text-muted">Select a campaign location first.</p>
        <Link href="/staff/campaign" className="btn btn-primary">
          Go to home
        </Link>
      </CampaignStaffShell>
    );
  }

  return (
    <CampaignStaffShell title="Scan QR" backHref="/staff/campaign">
      <div className="ratio ratio-4x3 bg-dark rounded overflow-hidden mb-3 position-relative">
        {cameraOn ? (
          <>
            <video ref={videoRef} className="w-100 h-100 object-fit-cover" playsInline muted />
            <div className="position-absolute top-50 start-50 translate-middle border border-2 border-success rounded" style={{ width: "60%", height: "60%", opacity: 0.85 }} aria-hidden />
          </>
        ) : (
          <div className="d-flex align-items-center justify-content-center text-white h-100 p-3 text-center small">
            Tap start camera to scan booking QR codes
          </div>
        )}
        {busy ? (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark bg-opacity-50 text-white">
            Looking up…
          </div>
        ) : null}
      </div>
      <p className="text-center text-muted small mb-2">Point camera at the QR code on the booking confirmation</p>
      <button type="button" className="btn btn-outline-primary w-100 mb-3 py-2" onClick={() => setCameraOn((v) => !v)}>
        {cameraOn ? "Stop camera" : "Start camera"}
      </button>
      <label className="form-label small text-muted">Or paste QR token / booking reference</label>
      <div className="input-group mb-2">
        <input
          className="form-control form-control-lg"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          placeholder="VAC-… or 32-char token"
          autoComplete="off"
        />
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => processToken(manual)}>
          Go
        </button>
      </div>
      {error ? <div className="alert alert-danger py-2 small">{error}</div> : null}
      <Link href="/staff/campaign/lookup" className="btn btn-link w-100">
        Manual token search instead
      </Link>
    </CampaignStaffShell>
  );
}
