"use client";

import { useEffect } from "react";
import { Icon } from "@iconify/react";

/**
 * Professional Confirmation Alert Component
 * 
 * @param {boolean} open - Whether the alert is visible
 * @param {function} onClose - Callback when alert is closed
 * @param {function} onConfirm - Callback when action is confirmed
 * @param {string} type - Type of action: 'approve' | 'reject' | 'suspend' | 'request-changes'
 * @param {string} title - Alert title
 * @param {string} message - Alert message
 * @param {string} confirmLabel - Label for confirm button
 * @param {boolean} loading - Loading state
 * @param {React.ReactNode} children - Optional additional content (e.g., note input)
 * @param {boolean} requireNote - Whether a note is required before confirming
 */
export default function ConfirmationAlert({
  open,
  onClose,
  onConfirm,
  type = "approve",
  title,
  message,
  confirmLabel,
  loading = false,
  children,
  requireNote = false,
  noteValue = "",
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const getConfig = () => {
    switch (type) {
      case "approve":
        return {
          icon: "solar:check-circle-bold",
          iconColor: "text-success",
          iconBg: "bg-success bg-opacity-10",
          confirmBtnClass: "btn-success",
          title: title || "Approve Verification",
          message: message || "Are you sure you want to approve this verification? This action will update the status to verified.",
        };
      case "reject":
        return {
          icon: "solar:close-circle-bold",
          iconColor: "text-danger",
          iconBg: "bg-danger bg-opacity-10",
          confirmBtnClass: "btn-danger",
          title: title || "Reject Verification",
          message: message || "Are you sure you want to reject this verification? Please provide a reason below.",
        };
      case "suspend":
        return {
          icon: "solar:stop-circle-bold",
          iconColor: "text-warning",
          iconBg: "bg-warning bg-opacity-10",
          confirmBtnClass: "btn-warning",
          title: title || "Suspend Verification",
          message: message || "Are you sure you want to suspend this verification? This will lock the account.",
        };
      case "request-changes":
        return {
          icon: "solar:edit-circle-bold",
          iconColor: "text-info",
          iconBg: "bg-info bg-opacity-10",
          confirmBtnClass: "btn-info",
          title: title || "Request Changes",
          message: message || "Request changes to this verification. Please provide details below.",
        };
      default:
        return {
          icon: "solar:question-circle-bold",
          iconColor: "text-secondary",
          iconBg: "bg-secondary bg-opacity-10",
          confirmBtnClass: "btn-primary",
          title: title || "Confirm Action",
          message: message || "Are you sure you want to proceed?",
        };
    }
  };

  const config = getConfig();
  const canConfirm = !requireNote || (requireNote && noteValue?.trim());

  return (
    <div
      className="modal fade show d-block"
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        animation: "fadeIn 0.2s ease-out",
      }}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
      `}</style>
      <div
        className="modal-dialog modal-dialog-centered"
        style={{
          maxWidth: "520px",
          animation: "slideUp 0.3s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="modal-content border-0"
          style={{
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1)",
            background: "#ffffff",
          }}
        >
          {/* Header with gradient */}
          <div
            className="modal-header border-0"
            style={{
              background: type === "approve"
                ? "linear-gradient(135deg, #d4edda 0%, #ffffff 100%)"
                : type === "reject"
                ? "linear-gradient(135deg, #f8d7da 0%, #ffffff 100%)"
                : type === "suspend"
                ? "linear-gradient(135deg, #fff3cd 0%, #ffffff 100%)"
                : "linear-gradient(135deg, #d1ecf1 0%, #ffffff 100%)",
              padding: "28px 28px 20px",
              position: "relative",
            }}
          >
            <div className="d-flex align-items-center gap-3 w-100">
              <div
                className={`d-flex align-items-center justify-content-center ${config.iconBg}`}
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "16px",
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  animation: open ? "pulse 0.6s ease-out" : "none",
                }}
              >
                <Icon
                  icon={config.icon}
                  className={config.iconColor}
                  style={{ fontSize: "32px" }}
                />
              </div>
              <div className="flex-grow-1">
                <h5
                  className="modal-title mb-1 fw-bold"
                  style={{
                    fontSize: "20px",
                    color: "#212529",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {config.title}
                </h5>
                <div
                  style={{
                    height: "3px",
                    width: "40px",
                    background: type === "approve"
                      ? "#28a745"
                      : type === "reject"
                      ? "#dc3545"
                      : type === "suspend"
                      ? "#ffc107"
                      : "#17a2b8",
                    borderRadius: "2px",
                    marginTop: "4px",
                  }}
                />
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={onClose}
                disabled={loading}
                aria-label="Close"
                style={{
                  opacity: loading ? 0.3 : 0.6,
                  transition: "opacity 0.2s ease",
                  fontSize: "14px",
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.opacity = "0.6";
                }}
              />
            </div>
          </div>

          {/* Body */}
          <div
            className="modal-body"
            style={{
              padding: "24px 28px",
              background: "#ffffff",
            }}
          >
            <p
              className="mb-0"
              style={{
                fontSize: "15px",
                color: "#495057",
                lineHeight: "1.7",
                fontWeight: "400",
              }}
            >
              {config.message}
            </p>
            {children && (
              <div style={{ marginTop: "20px" }}>{children}</div>
            )}
          </div>

          {/* Footer */}
          <div
            className="modal-footer border-0"
            style={{
              padding: "20px 28px 28px",
              background: "#f8f9fa",
            }}
          >
            <div className="d-flex gap-3 w-100">
              <button
                type="button"
                className="btn btn-outline-secondary flex-grow-1"
                onClick={onClose}
                disabled={loading}
                style={{
                  borderRadius: "10px",
                  padding: "12px 24px",
                  fontWeight: "600",
                  fontSize: "14px",
                  borderWidth: "2px",
                  transition: "all 0.2s ease",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "#6c757d";
                    e.currentTarget.style.borderColor = "#6c757d";
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.borderColor = "#6c757d";
                    e.currentTarget.style.color = "#6c757d";
                    e.currentTarget.style.transform = "translateY(0)";
                  }
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`btn ${config.confirmBtnClass} flex-grow-1`}
                onClick={onConfirm}
                disabled={loading || !canConfirm}
                style={{
                  borderRadius: "10px",
                  padding: "12px 24px",
                  fontWeight: "600",
                  fontSize: "14px",
                  boxShadow:
                    loading || !canConfirm
                      ? "none"
                      : type === "approve"
                      ? "0 4px 12px rgba(40, 167, 69, 0.3)"
                      : type === "reject"
                      ? "0 4px 12px rgba(220, 53, 69, 0.3)"
                      : type === "suspend"
                      ? "0 4px 12px rgba(255, 193, 7, 0.3)"
                      : "0 4px 12px rgba(23, 162, 184, 0.3)",
                  transition: "all 0.2s ease",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  border: "none",
                  opacity: loading || !canConfirm ? 0.6 : 1,
                  cursor: loading || !canConfirm ? "not-allowed" : "pointer",
                }}
                onMouseEnter={(e) => {
                  if (!loading && canConfirm) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      type === "approve"
                        ? "0 6px 20px rgba(40, 167, 69, 0.4)"
                        : type === "reject"
                        ? "0 6px 20px rgba(220, 53, 69, 0.4)"
                        : type === "suspend"
                        ? "0 6px 20px rgba(255, 193, 7, 0.4)"
                        : "0 6px 20px rgba(23, 162, 184, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading && canConfirm) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      type === "approve"
                        ? "0 4px 12px rgba(40, 167, 69, 0.3)"
                        : type === "reject"
                        ? "0 4px 12px rgba(220, 53, 69, 0.3)"
                        : type === "suspend"
                        ? "0 4px 12px rgba(255, 193, 7, 0.3)"
                        : "0 4px 12px rgba(23, 162, 184, 0.3)";
                  }
                }}
              >
                {loading ? (
                  <span className="d-flex align-items-center justify-content-center gap-2">
                    <span
                      className="spinner-border spinner-border-sm"
                      role="status"
                      aria-hidden="true"
                      style={{ width: "16px", height: "16px" }}
                    />
                    <span>Processing...</span>
                  </span>
                ) : (
                  confirmLabel || "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
