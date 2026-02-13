"use client";

import { Icon } from "@iconify/react";

export default function ProducerSecurityKeySection() {
  return (
    <section
      id="security-keys"
      className="producer-section producer-security"
      aria-labelledby="producer-security-title"
    >
      <div className="producer-container">
        <h2 id="producer-security-title" className="producer-section-title producer-section-title-numbered">
          <span className="producer-section-num" aria-hidden>7</span>
          Security and Key Management
        </h2>
        <div className="producer-security-layout">
          <div className="producer-security-panel producer-glass-card">
            <h3 className="producer-security-panel-title">Key management</h3>
            <div className="producer-security-keys">
              <div className="producer-security-key-row">
                <span className="producer-security-key-mask">sk_live_••••••••</span>
                <div className="producer-security-key-actions">
                  <button type="button" className="producer-btn producer-btn-ghost producer-btn-sm" aria-label="Rotate key">
                    Rotate
                  </button>
                  <button type="button" className="producer-btn producer-btn-ghost producer-btn-sm" aria-label="Revoke key">
                    Revoke
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="producer-security-visual" aria-hidden>
            <div className="producer-security-shield-wrap">
              <Icon icon="solar:shield-check-bold" width={56} height={56} />
            </div>
            <div className="producer-security-servers">
              <div className="producer-security-server" />
              <div className="producer-security-server" />
              <div className="producer-security-server" />
            </div>
          </div>
          <div className="producer-security-rbac producer-glass-card">
            <h3 className="producer-security-panel-title">Role-based access</h3>
            <div className="producer-security-roles">
              <span className="producer-security-role">Admin</span>
              <span className="producer-security-role">Operator</span>
              <span className="producer-security-role">Viewer</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
