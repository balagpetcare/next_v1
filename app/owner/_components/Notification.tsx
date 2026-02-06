"use client";

import { useEffect, useState } from "react";

export type NotificationType = "success" | "error" | "warning" | "info" | "confirm";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
};

type NotificationProps = {
  notification: Notification;
  onClose: () => void;
};

function NotificationItem({ notification, onClose }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto close for non-confirm notifications
    if (notification.type !== "confirm" && notification.duration !== 0) {
      const duration = notification.duration || 5000;
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleConfirm = () => {
    notification.onConfirm?.();
    handleClose();
  };

  const handleCancel = () => {
    notification.onCancel?.();
    handleClose();
  };

  const getIcon = () => {
    switch (notification.type) {
      case "success":
        return "✓";
      case "error":
        return "✕";
      case "warning":
        return "⚠";
      case "info":
        return "ℹ";
      case "confirm":
        return "?";
      default:
        return "";
    }
  };

  const getColorClasses = () => {
    switch (notification.type) {
      case "success":
        return "bg-success-focus border-success-main text-success-main";
      case "error":
        return "bg-danger-focus border-danger-main text-danger-main";
      case "warning":
        return "bg-warning-focus border-warning-main text-warning-main";
      case "info":
        return "bg-info-focus border-info-main text-info-main";
      case "confirm":
        return "bg-primary-focus border-primary-main text-primary-main";
      default:
        return "bg-secondary-focus border-secondary-main text-secondary-main";
    }
  };

  return (
    <div
      className={`card radius-12 border shadow-lg mb-3 ${getColorClasses()}`}
      style={{
        minWidth: "320px",
        maxWidth: "420px",
        transform: isVisible && !isLeaving ? "translateX(0)" : "translateX(400px)",
        opacity: isVisible && !isLeaving ? 1 : 0,
        transition: "all 0.3s ease-in-out",
      }}
    >
      <div className="card-body p-3">
        <div className="d-flex align-items-start gap-3">
          <div
            className="d-flex align-items-center justify-content-center"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              flexShrink: 0,
              fontSize: "18px",
              fontWeight: "bold",
            }}
          >
            {getIcon()}
          </div>
          <div className="flex-grow-1">
            <h6 className="fw-semibold mb-1" style={{ fontSize: "14px" }}>
              {notification.title}
            </h6>
            {notification.message && (
              <p className="mb-2 small" style={{ fontSize: "13px", opacity: 0.9 }}>
                {notification.message}
              </p>
            )}
            {notification.type === "confirm" && (
              <div className="d-flex gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-sm btn-primary radius-12"
                  onClick={handleConfirm}
                >
                  {notification.confirmText || "Confirm"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary radius-12"
                  onClick={handleCancel}
                >
                  {notification.cancelText || "Cancel"}
                </button>
              </div>
            )}
          </div>
          {notification.type !== "confirm" && (
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={handleClose}
              style={{ opacity: 0.7 }}
              aria-label="Close"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    // Listen for custom notification events
    const handleNotification = (e: CustomEvent<Notification>) => {
      const notification = {
        ...e.detail,
        id: e.detail.id || `notif-${Date.now()}-${Math.random()}`,
      };
      setNotifications((prev) => [...prev, notification]);
    };

    window.addEventListener("showNotification" as any, handleNotification as EventListener);
    return () => {
      window.removeEventListener("showNotification" as any, handleNotification as EventListener);
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div
      className="position-fixed"
      style={{
        top: "20px",
        right: "20px",
        zIndex: 10000,
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onClose={() => removeNotification(notification.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Helper function to show notifications
export function showNotification(notification: Omit<Notification, "id">) {
  const event = new CustomEvent("showNotification", {
    detail: notification,
  });
  window.dispatchEvent(event);
}

// Convenience functions
export const notify = {
  success: (title: string, message?: string, duration?: number) => {
    showNotification({ type: "success", title, message, duration });
  },
  error: (title: string, message?: string, duration?: number) => {
    showNotification({ type: "error", title, message, duration: duration || 7000 });
  },
  warning: (title: string, message?: string, duration?: number) => {
    showNotification({ type: "warning", title, message, duration });
  },
  info: (title: string, message?: string, duration?: number) => {
    showNotification({ type: "info", title, message, duration });
  },
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText?: string,
    cancelText?: string
  ) => {
    showNotification({
      type: "confirm",
      title,
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
      duration: 0, // Don't auto-close
    });
  },
};
