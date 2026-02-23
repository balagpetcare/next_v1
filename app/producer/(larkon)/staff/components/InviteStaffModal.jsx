"use client";

export default function InviteStaffModal({ show, onClose, formData, setFormData, onSubmit, loading, roles }) {
  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.email?.trim() && !formData.phone?.trim()) return;
    onSubmit();
  };

  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="inviteStaffTitle">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title" id="inviteStaffTitle">Invite Staff Member</h5>
                <button type="button" className="btn-close" onClick={onClose} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="text-secondary small mb-3">User must already be registered. Enter email or phone to add them as staff.</p>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={formData.email || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="staff@example.com"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Phone (optional if email provided)</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={formData.phone || ""}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                <div className="mb-0">
                  <label className="form-label">Role</label>
                  <select
                    className="form-select"
                    value={formData.roleKey || "PRODUCER_VIEWER"}
                    onChange={(e) => setFormData((prev) => ({ ...prev, roleKey: e.target.value }))}
                  >
                    {roles.map((role) => (
                      <option key={role.key} value={role.key}>
                        {role.label} — {role.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading || (!(formData.email || "").trim() && !(formData.phone || "").trim())}
                >
                  {loading ? "Sending…" : "Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  );
}
