"use client";

import { useEffect, useState } from "react";
import { ownerGet, ownerPatch, ownerPut } from "@/app/owner/_lib/ownerApi";
import Link from "next/link";

export default function OwnerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    orderAlerts: true,
    stockAlerts: true,
    verificationAlerts: true,
  });

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const profileRes = await ownerGet("/api/v1/owner/profile").catch(() => ({ success: false, data: null }));
      if (profileRes?.success && profileRes.data) {
        setProfile(profileRes.data);
      }
    } catch (e) {
      setError(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    setError("");
    try {
      await ownerPut("/api/v1/owner/profile", profile);
      alert("Profile updated successfully!");
    } catch (e) {
      setError(e?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotifications() {
    setSaving(true);
    setError("");
    try {
      // Save notification preferences (would need API endpoint)
      await ownerPatch("/api/v1/owner/settings/notifications", notifications);
      alert("Notification settings saved successfully!");
    } catch (e) {
      setError(e?.message || "Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-3">
      <div className="mb-4">
        <h2 className="mb-1">Settings</h2>
        <div className="text-secondary">Manage your account settings and preferences</div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-4" role="tablist">
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            Profile
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === "notifications" ? "active" : ""}`}
            onClick={() => setActiveTab("notifications")}
          >
            Notifications
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === "organizations" ? "active" : ""}`}
            onClick={() => setActiveTab("organizations")}
          >
            Organizations
          </button>
        </li>
        <li className="nav-item" role="presentation">
          <button
            className={`nav-link ${activeTab === "integrations" ? "active" : ""}`}
            onClick={() => setActiveTab("integrations")}
          >
            Integrations
          </button>
        </li>
      </ul>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className="card radius-12">
          <div className="card-body p-24">
            <h6 className="mb-3 fw-semibold">Profile Settings</h6>
            {loading ? (
              <div className="text-center text-secondary py-4">Loading...</div>
            ) : (
              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label">Display Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={profile?.displayName || ""}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={profile?.email || ""}
                    disabled
                  />
                  <div className="form-text">Email cannot be changed</div>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={profile?.phone || ""}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving}>
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="card radius-12">
          <div className="card-body p-24">
            <h6 className="mb-3 fw-semibold">Notification Preferences</h6>
            <div className="mb-4">
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="emailNotifications"
                  checked={notifications.emailNotifications}
                  onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="emailNotifications">
                  Email Notifications
                </label>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="smsNotifications"
                  checked={notifications.smsNotifications}
                  onChange={(e) => setNotifications({ ...notifications, smsNotifications: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="smsNotifications">
                  SMS Notifications
                </label>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="orderAlerts"
                  checked={notifications.orderAlerts}
                  onChange={(e) => setNotifications({ ...notifications, orderAlerts: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="orderAlerts">
                  Order Alerts
                </label>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="stockAlerts"
                  checked={notifications.stockAlerts}
                  onChange={(e) => setNotifications({ ...notifications, stockAlerts: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="stockAlerts">
                  Stock Alerts
                </label>
              </div>
              <div className="form-check form-switch mb-3">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="verificationAlerts"
                  checked={notifications.verificationAlerts}
                  onChange={(e) => setNotifications({ ...notifications, verificationAlerts: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="verificationAlerts">
                  Verification Alerts
                </label>
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSaveNotifications} disabled={saving}>
              {saving ? "Saving..." : "Save Notifications"}
            </button>
          </div>
        </div>
      )}

      {/* Organizations Tab */}
      {activeTab === "organizations" && (
        <div className="card radius-12">
          <div className="card-body p-24">
            <h6 className="mb-3 fw-semibold">Organization Settings</h6>
            <p className="text-muted mb-3">
              Manage your organization settings. You can edit organization details from the{" "}
              <Link href="/owner/organizations">Organizations</Link> page.
            </p>
            <Link href="/owner/organizations" className="btn btn-outline-primary">
              Manage Organizations
            </Link>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === "integrations" && (
        <div className="card radius-12">
          <div className="card-body p-24">
            <h6 className="mb-3 fw-semibold">API Keys & Integrations</h6>
            <p className="text-muted mb-3">
              Manage API keys and third-party integrations. This feature will be available soon.
            </p>
            <div className="alert alert-info mb-0">
              <i className="solar:info-circle-outline me-2" />
              API key management and integrations are coming soon.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
