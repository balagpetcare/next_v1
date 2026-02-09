"use client";

import { useEffect, useState } from "react";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";

export default function StaffInviteNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(new Set());

  async function loadNotifications() {
    try {
      setLoading(true);
      const res = await ownerGet("/api/v1/me/notifications");
      if (res && res?.success && Array.isArray(res.data)) {
        // Filter only STAFF_INVITE notifications
        const staffInvites = res.data.filter((n) => n.type === "STAFF_INVITE");
        setNotifications(staffInvites);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function handleAccept(notificationId) {
    if (processing.has(notificationId)) return;

    try {
      setProcessing((prev) => new Set(prev).add(notificationId));
      await ownerPost(`/api/v1/me/notifications/${notificationId}/accept-invite`, {});
      await loadNotifications(); // Refresh list
    } catch (error) {
      alert(error?.message || "Failed to accept invitation");
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  }

  async function handleDecline(notificationId) {
    if (processing.has(notificationId)) return;

    try {
      setProcessing((prev) => new Set(prev).add(notificationId));
      await ownerPost(`/api/v1/me/notifications/${notificationId}/decline-invite`, {});
      await loadNotifications(); // Refresh list
    } catch (error) {
      alert(error?.message || "Failed to decline invitation");
    } finally {
      setProcessing((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  }

  if (loading) {
    return (
      <div className="card radius-12 mb-4">
        <div className="card-body p-24">
          <div className="text-secondary-light text-center py-16">Loading notifications...</div>
        </div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return null; // Don't show anything if no notifications
  }

  return (
    <div className="card radius-12 mb-4">
      <div className="card-body p-24">
        <div className="d-flex align-items-center justify-content-between mb-16">
          <h6 className="mb-0 fw-semibold">
            <i className="solar:user-id-outline me-2" />
            Staff Invitations
          </h6>
          <span className="badge bg-primary">{notifications.length}</span>
        </div>

        <div className="d-flex flex-column gap-12">
          {notifications.map((notification) => {
            const meta = notification.meta || {};
            const isProcessing = processing.has(notification.id);
            const expiresAt = meta.expiresAt ? new Date(meta.expiresAt) : null;
            const isExpired = expiresAt && expiresAt.getTime() < Date.now();

            return (
              <div
                key={notification.id}
                className="alert alert-info py-12 px-16 radius-8 mb-0 d-flex align-items-start justify-content-between gap-16"
                role="alert"
              >
                <div className="flex-grow-1">
                  <div className="fw-semibold mb-4">{notification.title}</div>
                  <div className="text-sm mb-8">{notification.message}</div>
                  {meta.branchName && (
                    <div className="text-sm text-secondary-light">
                      <i className="solar:shop-2-outline me-1" />
                      Branch: <strong>{meta.branchName}</strong>
                    </div>
                  )}
                  {meta.orgName && (
                    <div className="text-sm text-secondary-light">
                      <i className="solar:buildings-outline me-1" />
                      Organization: <strong>{meta.orgName}</strong>
                    </div>
                  )}
                  {meta.role && (
                    <div className="text-sm text-secondary-light">
                      <i className="solar:user-id-outline me-1" />
                      Role: <strong>{meta.role}</strong>
                    </div>
                  )}
                  {expiresAt && (
                    <div className={`text-sm mt-4 ${isExpired ? "text-danger" : "text-secondary-light"}`}>
                      <i className="solar:calendar-outline me-1" />
                      {isExpired ? "Expired" : `Expires: ${expiresAt.toLocaleString()}`}
                    </div>
                  )}
                </div>
                <div className="d-flex gap-8 flex-shrink-0">
                  {!isExpired && (
                    <>
                      <button
                        className="btn btn-success btn-sm px-12 py-8"
                        onClick={() => handleAccept(notification.id)}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <span className="spinner-border spinner-border-sm me-1" />
                        ) : (
                          <i className="solar:check-circle-outline me-1" />
                        )}
                        Accept
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm px-12 py-8"
                        onClick={() => handleDecline(notification.id)}
                        disabled={isProcessing}
                      >
                        <i className="solar:close-circle-outline me-1" />
                        Decline
                      </button>
                    </>
                  )}
                  {isExpired && (
                    <span className="badge bg-danger">Expired</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
