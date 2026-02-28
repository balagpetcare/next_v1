"use client";

import { useState, useCallback } from "react";
import { Modal, Button } from "react-bootstrap";

/**
 * Producer API error popup: normalizer + modal. Never shows raw JSON; uses backend message and optional hint.
 * Reuse on any producer page: (1) use useApiErrorPopup(), (2) render <ApiErrorModal />, (3) in catch call showApiErrorPopup(normalizeApiError(err)).
 */

/**
 * Normalize API errors (from apiFetch / producerApi or lib/api) for display.
 * @param {Error & { status?: number; data?: { message?: string; code?: string; errors?: unknown } }} err
 * @returns {{ httpStatus?: number; message: string; code?: string; fieldErrors?: unknown }}
 */
export function normalizeApiError(err) {
  if (!err) {
    return { message: "Request failed" };
  }
  const status = Number(err.status);
  const data = err.data && typeof err.data === "object" ? err.data : {};
  const message =
    typeof data.message === "string" && data.message
      ? data.message
      : err.message && typeof err.message === "string"
        ? err.message
        : data.error && typeof data.error === "string"
          ? data.error
          : "Request failed";
  const code = typeof data.code === "string" ? data.code : undefined;
  const fieldErrors = Array.isArray(data.errors) ? data.errors : data.fieldErrors;
  return {
    httpStatus: Number.isFinite(status) ? status : undefined,
    message,
    code,
    fieldErrors,
  };
}

/** Hint shown when backend blocks batch create due to product not activated. */
const PRODUCT_ACTIVATION_HINT =
  "This product is not activated yet. Please request platform admin approval to activate it before creating batches.";

function isProductActivationBlock(normalized) {
  const msg = (normalized.message || "").toLowerCase();
  return msg.includes("activated") || msg.includes("activation") || msg.includes("before creating batches");
}

/**
 * Hook that provides a modal popup for API errors (403 / 4xx / 5xx).
 * Use in producer pages: render <ApiErrorModal /> and on catch call showApiErrorPopup(normalizeApiError(err)).
 * @returns {{ showApiErrorPopup: (normalized: ReturnType<typeof normalizeApiError>) => void; ApiErrorModal: () => JSX.Element | null }}
 */
export function useApiErrorPopup() {
  const [error, setError] = useState(null);

  const showApiErrorPopup = useCallback((normalized) => {
    if (normalized && normalized.message) setError(normalized);
  }, []);

  const close = useCallback(() => setError(null), []);

  const ApiErrorModal = useCallback(
    function ApiErrorModalComponent() {
      if (!error) return null;
      const title = error.httpStatus === 403 ? "Action blocked" : "Request failed";
      const showHint = isProductActivationBlock(error);

      return (
        <Modal show onHide={close} centered backdrop="static" className="radius-12">
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-0">{error.message}</p>
            {showHint && (
              <p className="text-muted small mt-3 mb-0">{PRODUCT_ACTIVATION_HINT}</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" className="radius-12" onClick={close}>
              OK
            </Button>
          </Modal.Footer>
        </Modal>
      );
    },
    [error, close]
  );

  return { showApiErrorPopup, ApiErrorModal };
}
