"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";

function guessMimeType(url, mimeType) {
  if (mimeType) return String(mimeType).toLowerCase();
  const value = String(url || "").toLowerCase();
  if (value.includes(".pdf")) return "application/pdf";
  if (value.includes(".png")) return "image/png";
  if (value.includes(".jpg") || value.includes(".jpeg")) return "image/jpeg";
  if (value.includes(".webp")) return "image/webp";
  if (value.includes(".gif")) return "image/gif";
  return "application/octet-stream";
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return String(value);
  }
}

function normalizeDocument(item, index) {
  const source = item?.media || item;
  const url = source?.url || source?.media?.url || source?.mediaUrl || null;
  const mimeType = guessMimeType(url, source?.mimeType || item?.mimeType);
  const type = item?.documentType || item?.type || source?.type || "Document";
  return {
    id: item?.id || source?.id || index,
    title: item?.title || type || `Document #${index + 1}`,
    documentType: type || "OTHER",
    url,
    mimeType,
    fileSize: item?.fileSize || source?.size || null,
    uploadedAt: item?.createdAt || source?.createdAt || null,
    expiryDate: item?.expiryDate || source?.expiryDate || null,
    verified: item?.verified ?? source?.verified ?? null,
    raw: item,
  };
}

export default function DocGrid({ docs = [], documents = [] }) {
  const allDocs = docs.length ? docs : documents;
  const normalizedDocs = useMemo(
    () => (allDocs || []).map((doc, index) => normalizeDocument(doc, index)),
    [allDocs]
  );
  const [viewerIndex, setViewerIndex] = useState(-1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [sideBySide, setSideBySide] = useState(true);

  if (!normalizedDocs.length) {
    return <div className="text-secondary">No documents.</div>;
  }

  const selectedDoc = viewerIndex >= 0 ? normalizedDocs[viewerIndex] : null;
  const canGoPrev = viewerIndex > 0;
  const canGoNext = viewerIndex >= 0 && viewerIndex < normalizedDocs.length - 1;
  const isPdf = selectedDoc?.mimeType?.includes("pdf");

  return (
    <>
      <div className="row g-2">
        {normalizedDocs.map((doc, index) => (
          <div className="col-md-6 col-lg-4" key={doc.id || index}>
            <div className="card radius-12 h-100">
              <div className="card-body d-flex flex-column gap-2">
                <div className="fw-semibold">{doc.title}</div>
                <div className="small text-secondary">{doc.documentType}</div>
                <div className="small text-secondary">
                  Uploaded: {formatDate(doc.uploadedAt)}
                </div>
                <div className="small text-secondary">
                  Expiry: {formatDate(doc.expiryDate)}
                </div>
                <div className="small text-secondary">
                  File: {doc.mimeType || "unknown"}
                </div>
                <div className="small text-secondary">
                  Size: {doc.fileSize ? `${doc.fileSize} bytes` : "—"}
                </div>
                <div className="small">
                  Verified:{" "}
                  <span className={`badge ${doc.verified ? "bg-success" : "bg-secondary"}`}>
                    {doc.verified ? "Yes" : "No"}
                  </span>
                </div>
                {doc.url ? (
                  <div className="d-flex flex-wrap gap-2 mt-2">
                    <a
                      className="btn btn-sm btn-outline-primary"
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon icon="solar:eye-bold" /> View
                    </a>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        setViewerIndex(index);
                        setZoom(100);
                        setRotation(0);
                      }}
                    >
                      <Icon icon="solar:maximize-bold" /> Preview
                    </button>
                    <a
                      className="btn btn-sm btn-outline-secondary"
                      href={doc.url}
                      download
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon icon="solar:download-bold" /> Download
                    </a>
                  </div>
                ) : (
                  <div className="text-secondary">No URL</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedDoc ? (
        <div
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ background: "rgba(15, 23, 42, 0.88)", zIndex: 9999 }}
          onClick={() => setViewerIndex(-1)}
        >
          <div
            className="h-100 p-3 p-md-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="card h-100">
              <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-semibold">{selectedDoc.title}</div>
                  <div className="small text-secondary">{selectedDoc.documentType}</div>
                </div>
                <div className="d-flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setSideBySide((value) => !value)}
                  >
                    <Icon icon="solar:sidebar-minimalistic-outline" />{" "}
                    {sideBySide ? "Single Pane" : "Side by Side"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setZoom((value) => Math.max(50, value - 10))}
                  >
                    <Icon icon="solar:minus-circle-outline" /> Zoom Out
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setZoom((value) => Math.min(300, value + 10))}
                  >
                    <Icon icon="solar:add-circle-outline" /> Zoom In
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => {
                      setZoom(100);
                      setRotation(0);
                    }}
                  >
                    <Icon icon="solar:refresh-outline" /> Fit
                  </button>
                  {!isPdf ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setRotation((value) => (value + 90) % 360)}
                    >
                      <Icon icon="solar:restart-outline" /> Rotate
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => setViewerIndex(-1)}
                  >
                    <Icon icon="solar:close-circle-bold" /> Close
                  </button>
                </div>
              </div>

              <div className="card-body h-100 overflow-hidden">
                <div className="row g-3 h-100">
                  <div className={`${sideBySide ? "col-12 col-xl-8" : "col-12"} h-100`}>
                    <div className="border rounded h-100 d-flex align-items-center justify-content-center bg-light overflow-auto">
                      {isPdf ? (
                        <iframe
                          title={selectedDoc.title}
                          src={selectedDoc.url || ""}
                          className="w-100 h-100 border-0"
                        />
                      ) : (
                        <img
                          src={selectedDoc.url || ""}
                          alt={selectedDoc.title}
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                            transformOrigin: "center",
                            transition: "transform 0.2s ease",
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {sideBySide ? (
                    <div className="col-12 col-xl-4">
                      <div className="border rounded p-3 h-100 overflow-auto">
                        <h6 className="mb-2">Document Details</h6>
                        <div className="small text-secondary mb-1">
                          Type: {selectedDoc.documentType}
                        </div>
                        <div className="small text-secondary mb-1">
                          MIME: {selectedDoc.mimeType}
                        </div>
                        <div className="small text-secondary mb-1">
                          Uploaded: {formatDate(selectedDoc.uploadedAt)}
                        </div>
                        <div className="small text-secondary mb-1">
                          Expiry: {formatDate(selectedDoc.expiryDate)}
                        </div>
                        <div className="small text-secondary mb-1">
                          Size: {selectedDoc.fileSize ? `${selectedDoc.fileSize} bytes` : "—"}
                        </div>
                        <div className="small text-secondary mb-3">
                          Verified: {selectedDoc.verified ? "Yes" : "No"}
                        </div>
                        <a
                          href={selectedDoc.url || "#"}
                          className="btn btn-sm btn-outline-primary"
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open in new tab
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="card-footer d-flex justify-content-between">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={!canGoPrev}
                  onClick={() => {
                    if (!canGoPrev) return;
                    setViewerIndex((value) => value - 1);
                    setZoom(100);
                    setRotation(0);
                  }}
                >
                  <Icon icon="solar:alt-arrow-left-outline" /> Previous
                </button>
                <span className="small text-secondary">
                  {viewerIndex + 1} / {normalizedDocs.length}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={!canGoNext}
                  onClick={() => {
                    if (!canGoNext) return;
                    setViewerIndex((value) => value + 1);
                    setZoom(100);
                    setRotation(0);
                  }}
                >
                  Next <Icon icon="solar:alt-arrow-right-outline" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
