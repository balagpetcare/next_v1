"use client";

import { useEffect, useState } from "react";
import { ownerGet, ownerPatch } from "@/app/owner/_lib/ownerApi";

export default function OwnerOnlineStorePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState({
    enabled: false,
    allowOnlineOrders: true,
    deliveryEnabled: true,
    pickupEnabled: true,
  });
  const [saving, setSaving] = useState(false);

  async function loadSettings() {
    setLoading(true);
    setError("");
    try {
      const res = await ownerGet("/api/v1/online-store/settings").catch(() => ({ success: false, data: null }));
      if (res?.success && res.data) {
        setSettings(res.data);
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

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      await ownerPatch("/api/v1/online-store/settings", settings);
      alert("Settings saved successfully!");
    } catch (e) {
      setError(e?.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container py-3">
      <div className="mb-4">
        <h2 className="mb-1">Online Store Management</h2>
        <div className="text-secondary">Configure your online store settings and product visibility</div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card radius-12">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Store Settings</h6>

          <div className="mb-4">
            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="enabled"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                disabled={loading}
              />
              <label className="form-check-label" htmlFor="enabled">
                Enable Online Store
              </label>
            </div>

            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="allowOnlineOrders"
                checked={settings.allowOnlineOrders}
                onChange={(e) => setSettings({ ...settings, allowOnlineOrders: e.target.checked })}
                disabled={loading || !settings.enabled}
              />
              <label className="form-check-label" htmlFor="allowOnlineOrders">
                Allow Online Orders
              </label>
            </div>

            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="deliveryEnabled"
                checked={settings.deliveryEnabled}
                onChange={(e) => setSettings({ ...settings, deliveryEnabled: e.target.checked })}
                disabled={loading || !settings.enabled}
              />
              <label className="form-check-label" htmlFor="deliveryEnabled">
                Enable Delivery
              </label>
            </div>

            <div className="form-check form-switch mb-3">
              <input
                className="form-check-input"
                type="checkbox"
                id="pickupEnabled"
                checked={settings.pickupEnabled}
                onChange={(e) => setSettings({ ...settings, pickupEnabled: e.target.checked })}
                disabled={loading || !settings.enabled}
              />
              <label className="form-check-label" htmlFor="pickupEnabled">
                Enable Pickup
              </label>
            </div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={handleSave} disabled={loading || saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
            <button className="btn btn-outline-secondary" onClick={loadSettings} disabled={loading || saving}>
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="card radius-12 mt-4">
        <div className="card-body p-24">
          <h6 className="mb-3 fw-semibold">Product Visibility</h6>
          <p className="text-muted mb-3">
            Manage which products are visible in your online store. You can control product visibility from the{" "}
            <a href="/owner/products">Products</a> page.
          </p>
          <Link href="/owner/products" className="btn btn-outline-primary">
            Manage Products
          </Link>
        </div>
      </div>
    </div>
  );
}
