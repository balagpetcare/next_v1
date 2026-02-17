"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ownerGet, ownerPost, ownerDelete } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const API_BASE = String(process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "") || "";

function getInviteAcceptUrl(token) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/invite/accept?token=${encodeURIComponent(token)}`;
}

const DELEGATION_SCOPE_LABELS = {
  products: "Products",
  clinics: "Clinics",
  inventory: "Inventory",
  staff: "Staff",
  branches: "Branches",
  finance_read: "Finance (Read Only)",
};

const TAB_KEYS = { MEMBERS: "members", PENDING: "pending", ROLES: "roles", ACTIVITY: "activity" };

export default function OwnerTeamDashboardPage() {
  const [overview, setOverview] = useState(null);
  const [teams, setTeams] = useState([]);
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [scopes, setScopes] = useState([]);
  const [logs, setLogs] = useState([]);
  const [activeTab, setActiveTab] = useState(TAB_KEYS.MEMBERS);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteScopes, setInviteScopes] = useState([]);
  const [inviteBranchIds, setInviteBranchIds] = useState("");
  const [inviting, setInviting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState(null);
  const [resendingId, setResendingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [removingMember, setRemovingMember] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setForbidden(false);
    try {
      const overviewR = await fetch(`${API_BASE}/api/v1/owner/team/overview`, { credentials: "include" });
      const overviewRes = await overviewR.json().catch(() => ({}));
      if (overviewR.status === 403) {
        setForbidden(true);
        setOverview(null);
        setTeams([]);
        setMembers([]);
        setInvitations([]);
        setScopes([]);
        setLogs([]);
        setLoading(false);
        return;
      }
      if (overviewRes?.success === true && overviewRes?.data) setOverview(overviewRes.data);

      const [teamsR, membersR, invR, scopesRes, logsR] = await Promise.all([
        fetch(`${API_BASE}/api/v1/owner/teams`, { credentials: "include" }),
        fetch(`${API_BASE}/api/v1/owner/team/members`, { credentials: "include" }),
        fetch(`${API_BASE}/api/v1/owner/team/invitations`, { credentials: "include" }),
        ownerGet("/api/v1/owner/delegations/scopes").catch(() => ({ data: [] })),
        fetch(`${API_BASE}/api/v1/owner/overview/logs?limit=50`, { credentials: "include" }),
      ]);

      if (teamsR.status === 403 || membersR.status === 403) setForbidden(true);
      const teamsRes = await teamsR.json().catch(() => ({}));
      const membersRes = await membersR.json().catch(() => ({}));
      const invitationsRes = await invR.json().catch(() => ({}));
      const logsRes = await logsR.json().catch(() => ({}));

      if (teamsRes?.success === true && Array.isArray(teamsRes?.data)) setTeams(teamsRes.data);
      else if (Array.isArray(teamsRes?.data)) setTeams(teamsRes.data);
      if (membersRes?.success === true && Array.isArray(membersRes?.data)) setMembers(membersRes.data);
      else if (Array.isArray(membersRes?.data)) setMembers(membersRes.data);
      if (invitationsRes?.success === true && Array.isArray(invitationsRes?.data)) setInvitations(invitationsRes.data);
      else if (Array.isArray(invitationsRes?.data)) setInvitations(invitationsRes.data);
      const s = scopesRes?.data ?? scopesRes ?? [];
      setScopes(Array.isArray(s) ? s : []);
      if (logsRes?.success === true && Array.isArray(logsRes?.data)) setLogs(logsRes.data);
      else if (Array.isArray(logsRes?.data)) setLogs(logsRes.data);
    } catch (e) {
      setError(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(""), 5000);
    return () => clearTimeout(t);
  }, [successMessage]);

  async function inviteByEmail(e) {
    e?.preventDefault();
    const teamId = selectedTeamId ? parseInt(selectedTeamId, 10) : NaN;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !Number.isFinite(teamId)) {
      setError("Select a team and enter email.");
      return;
    }
    setError("");
    setInviting(true);
    setLastInviteLink(null);
    try {
      const body = { email };
      if (inviteScopes.length > 0) body.scopes = inviteScopes;
      const raw = inviteBranchIds.trim().replace(/\s+/g, "");
      if (raw) {
        const ids = raw.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !Number.isNaN(n));
        if (ids.length > 0) body.branchIds = ids;
      }
      const res = await ownerPost(`/api/v1/owner/teams/${teamId}/invite`, body);
      const data = res?.data ?? res;
      const token = data?.rawToken;
      setInviteEmail("");
      setInviteScopes([]);
      setInviteBranchIds("");
      setSuccessMessage("Invitation created. Share the link below with the invitee.");
      if (token) setLastInviteLink(getInviteAcceptUrl(token));
      await load();
    } catch (e) {
      setError(e?.response?.error || e?.response?.message || e?.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  }

  async function resendInvitation(id) {
    setResendingId(id);
    setError("");
    try {
      const res = await ownerPost(`/api/v1/owner/team/invitations/${id}/resend`, {});
      const data = res?.data ?? res;
      const token = data?.rawToken;
      if (token) {
        setSuccessMessage("New invite link generated. Share: " + getInviteAcceptUrl(token));
        copyToClipboard(getInviteAcceptUrl(token));
      } else setSuccessMessage("Invitation resent.");
      await load();
    } catch (e) {
      setError(e?.response?.error || e?.message || "Failed to resend");
    } finally {
      setResendingId(null);
    }
  }

  async function cancelInvitation(id) {
    setCancellingId(id);
    setError("");
    try {
      await ownerPost(`/api/v1/owner/team/invitations/${id}/cancel`, {});
      setSuccessMessage("Invitation cancelled.");
      await load();
    } catch (e) {
      setError(e?.response?.error || e?.message || "Failed to cancel");
    } finally {
      setCancellingId(null);
    }
  }

  async function removeMember(member) {
    if (!member?.teamId || !member?.userId) return;
    setRemovingMember(member.userId);
    setError("");
    try {
      await ownerDelete(`/api/v1/owner/teams/${member.teamId}/members/${member.userId}`);
      setSuccessMessage("Member removed.");
      await load();
    } catch (e) {
      setError(e?.response?.error || e?.message || "Failed to remove member");
    } finally {
      setRemovingMember(null);
    }
  }

  function copyToClipboard(text) {
    if (typeof navigator?.clipboard?.writeText === "function") {
      navigator.clipboard.writeText(text);
    }
  }

  function toggleInviteScope(key) {
    setInviteScopes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  if (loading) {
    return (
      <div className="d-flex flex-column gap-4">
        <PageHeader
          title="Team Management"
          subtitle="Manage your team members, roles, and access"
          breadcrumbs={[{ label: "Owner", href: "/owner" }, { label: "Team", href: "/owner/team" }]}
        />
        <div className="card border radius-12">
          <div className="card-body p-24 d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="d-flex flex-column gap-4">
        <PageHeader
          title="Team Management"
          breadcrumbs={[{ label: "Owner", href: "/owner" }, { label: "Team", href: "/owner/team" }]}
        />
        <div className="card border radius-12 shadow-sm">
          <div className="card-body p-24 text-center">
            <p className="text-secondary mb-3">Team management is only available to team owners.</p>
            <Link href="/owner/dashboard" className="btn btn-primary btn-sm radius-8">Go to dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader
        title="Team Management"
        subtitle="Manage your team members, roles, and access"
        breadcrumbs={[{ label: "Owner", href: "/owner" }, { label: "Team", href: "/owner/team" }]}
        actions={[
          <button
            key="invite"
            type="button"
            className="btn btn-primary btn-sm radius-8"
            onClick={() => {
              setInviteModalOpen(true);
              setLastInviteLink(null);
              setSelectedTeamId(teams.length ? String(teams[0].id) : "");
              setInviteEmail("");
              setInviteScopes([]);
              setInviteBranchIds("");
            }}
          >
            Invite Team Member
          </button>,
        ]}
      />

      {successMessage && (
        <div className="alert alert-success d-flex align-items-center justify-content-between radius-12 mb-0" role="alert">
          <span>{successMessage}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSuccessMessage("")} aria-label="Dismiss">×</button>
        </div>
      )}
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between radius-12 mb-0" role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setError("")} aria-label="Dismiss">Dismiss</button>
        </div>
      )}

      {/* Overview cards */}
      <div className="row g-3">
        <div className="col-6 col-md-3">
          <div className="card border radius-12 shadow-sm h-100">
            <div className="card-body p-24">
              <div className="small text-secondary mb-1">Total Teams</div>
              <div className="h4 mb-0 text-primary-600">{overview?.teamsCount ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border radius-12 shadow-sm h-100">
            <div className="card-body p-24">
              <div className="small text-secondary mb-1">Active Members</div>
              <div className="h4 mb-0 text-primary-600">{overview?.membersCount ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border radius-12 shadow-sm h-100">
            <div className="card-body p-24">
              <div className="small text-secondary mb-1">Pending Invitations</div>
              <div className="h4 mb-0 text-primary-600">{overview?.pendingInvitesCount ?? 0}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card border radius-12 shadow-sm h-100">
            <div className="card-body p-24">
              <div className="small text-secondary mb-1">Active Contexts</div>
              <div className="h4 mb-0 text-primary-600">{overview?.activeContextsCount ?? 0}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-tabs border-0 gap-2">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link rounded radius-8 ${activeTab === TAB_KEYS.MEMBERS ? "active" : ""}`}
            onClick={() => setActiveTab(TAB_KEYS.MEMBERS)}
          >
            Members
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link rounded radius-8 ${activeTab === TAB_KEYS.PENDING ? "active" : ""}`}
            onClick={() => setActiveTab(TAB_KEYS.PENDING)}
          >
            Pending Invitations
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link rounded radius-8 ${activeTab === TAB_KEYS.ROLES ? "active" : ""}`}
            onClick={() => setActiveTab(TAB_KEYS.ROLES)}
          >
            Roles & Scopes
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link rounded radius-8 ${activeTab === TAB_KEYS.ACTIVITY ? "active" : ""}`}
            onClick={() => setActiveTab(TAB_KEYS.ACTIVITY)}
          >
            Activity
          </button>
        </li>
      </ul>

      {/* Tab content */}
      <div className="card border radius-12 shadow-sm">
        <div className="card-body p-24">
          {activeTab === TAB_KEYS.MEMBERS && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Team</th>
                    <th>Role</th>
                    <th>Scopes</th>
                    <th>Branch Access</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-muted text-center py-4">No members yet. Invite by email above.</td>
                    </tr>
                  ) : (
                    members.map((m) => (
                      <tr key={`${m.email}-${m.teamId}-${m.userId}`}>
                        <td>{m.name || "—"}</td>
                        <td>{m.email || "—"}</td>
                        <td>{m.teamName || "—"}</td>
                        <td><span className="badge bg-secondary radius-8">{m.role || "MEMBER"}</span></td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {(m.scopes || []).map((s) => (
                              <span key={s} className="badge bg-primary-50 text-primary-600 radius-8 small">
                                {DELEGATION_SCOPE_LABELS[s] || s}
                              </span>
                            ))}
                            {(!m.scopes || m.scopes.length === 0) && <span className="text-muted small">—</span>}
                          </div>
                        </td>
                        <td>{m.branchAccessCount != null ? (m.branchAccessCount === 0 ? "All" : String(m.branchAccessCount)) : "—"}</td>
                        <td><span className={`badge radius-8 ${m.status === "ACTIVE" ? "bg-success" : "bg-warning text-dark"}`}>{m.status || "ACTIVE"}</span></td>
                        <td className="text-end">
                          <Link href={`/owner/teams/${m.teamId}`} className="btn btn-ghost btn-sm me-1">Edit scopes</Link>
                          <Link href={`/owner/teams/${m.teamId}`} className="btn btn-ghost btn-sm me-1">Edit branch access</Link>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-danger"
                            disabled={removingMember === m.userId}
                            onClick={() => window.confirm("Remove this member from the team?") && removeMember(m)}
                          >
                            {removingMember === m.userId ? <span className="spinner-border spinner-border-sm" /> : "Remove"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === TAB_KEYS.PENDING && (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Team</th>
                    <th>Scopes</th>
                    <th>Invited At</th>
                    <th>Expires At</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-muted text-center py-4">No pending invitations.</td>
                    </tr>
                  ) : (
                    invitations.map((inv) => {
                      const isPending = inv.status === "PENDING";
                      const isExpired = inv.status === "EXPIRED" || (inv.expiresAt && new Date(inv.expiresAt) < new Date());
                      return (
                        <tr key={inv.id}>
                          <td>{inv.email}</td>
                          <td>{inv.teamName ?? "—"}</td>
                          <td>
                            <div className="d-flex flex-wrap gap-1">
                              {(inv.scopes || []).map((s) => (
                                <span key={s} className="badge bg-primary-50 text-primary-600 radius-8 small">{DELEGATION_SCOPE_LABELS[s] || s}</span>
                              ))}
                              {(!inv.scopes || inv.scopes.length === 0) && <span className="text-muted small">—</span>}
                            </div>
                          </td>
                          <td>{inv.invitedAt ? new Date(inv.invitedAt).toLocaleString() : "—"}</td>
                          <td>{inv.expiresAt ? new Date(inv.expiresAt).toLocaleString() : "—"}</td>
                          <td>
                            <span className={`badge radius-8 ${isExpired ? "bg-secondary" : isPending ? "bg-warning text-dark" : "bg-success"}`}>
                              {isExpired ? "EXPIRED" : inv.status}
                            </span>
                          </td>
                          <td className="text-end">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm me-1"
                                  disabled={resendingId === inv.id}
                                  onClick={() => resendInvitation(inv.id)}
                                >
                                  {resendingId === inv.id ? <span className="spinner-border spinner-border-sm" /> : "Resend"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm text-danger"
                                  disabled={cancellingId === inv.id}
                                  onClick={() => window.confirm("Cancel this invitation?") && cancelInvitation(inv.id)}
                                >
                                  {cancellingId === inv.id ? <span className="spinner-border spinner-border-sm" /> : "Cancel"}
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === TAB_KEYS.ROLES && (
            <div>
              <h6 className="fw-semibold mb-3">Available scopes</h6>
              <p className="small text-muted mb-3">These scopes can be assigned to team members when inviting or editing access. User assignment is done from the Members tab or team detail.</p>
              <ul className="list-unstyled mb-0">
                {scopes.map((s) => (
                  <li key={s.key} className="py-2 border-bottom border-light d-flex justify-content-between align-items-start">
                    <div>
                      <span className="fw-medium">{s.label || s.key}</span>
                      {s.isReadOnly && <span className="badge bg-secondary ms-2 small">Read-only</span>}
                    </div>
                    <span className="text-muted small">{s.key}</span>
                  </li>
                ))}
                {scopes.length === 0 && <li className="text-muted small">No scopes configured.</li>}
              </ul>
            </div>
          )}

          {activeTab === TAB_KEYS.ACTIVITY && (
            <div>
              <h6 className="fw-semibold mb-3">Activity log</h6>
              <p className="small text-muted mb-3">Recent team and delegation changes.</p>
              <ul className="list-unstyled mb-0">
                {logs.length === 0 ? (
                  <li className="text-muted small py-2">No activity yet.</li>
                ) : (
                  logs.map((log) => (
                    <li key={log.id} className="py-2 border-bottom border-light d-flex flex-wrap gap-2 align-items-center">
                      <span className="small fw-medium">{log.action}</span>
                      {log.actor?.profile?.displayName && <span className="small text-muted">by {log.actor.profile.displayName}</span>}
                      <span className="small text-muted">{log.createdAt ? new Date(log.createdAt).toLocaleString() : ""}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Invite modal */}
      {inviteModalOpen && (
        <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} aria-modal="true">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header border-0 pb-0">
                <h6 className="modal-title">Invite Team Member</h6>
                <button type="button" className="btn-close" onClick={() => { setInviteModalOpen(false); setLastInviteLink(null); }} aria-label="Close" />
              </div>
              <div className="modal-body pt-2">
                <form onSubmit={inviteByEmail}>
                  <div className="mb-3">
                    <label htmlFor="invite-email" className="form-label small fw-medium">Email <span className="text-danger">*</span></label>
                    <input
                      id="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="form-control form-control-sm radius-8"
                      disabled={inviting}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="invite-team" className="form-label small fw-medium">Team</label>
                    <select
                      id="invite-team"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="form-select form-select-sm radius-8"
                      disabled={inviting || teams.length === 0}
                    >
                      <option value="">Select team</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-medium">Scopes (multi-select)</label>
                    <div className="d-flex flex-wrap gap-2">
                      {scopes.map((s) => (
                        <label key={s.key} className="d-inline-flex align-items-center gap-1 small mb-0">
                          <input
                            type="checkbox"
                            checked={inviteScopes.includes(s.key)}
                            onChange={() => toggleInviteScope(s.key)}
                            disabled={inviting}
                            className="form-check-input"
                          />
                          <span>{s.label || DELEGATION_SCOPE_LABELS[s.key] || s.key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="invite-branch-ids" className="form-label small fw-medium">Branch access (optional, comma-separated IDs)</label>
                    <input
                      id="invite-branch-ids"
                      type="text"
                      value={inviteBranchIds}
                      onChange={(e) => setInviteBranchIds(e.target.value)}
                      placeholder="e.g. 1, 2"
                      className="form-control form-control-sm radius-8"
                      disabled={inviting}
                    />
                  </div>
                  {lastInviteLink && (
                    <div className="mb-3 p-3 bg-light radius-8">
                      <label className="form-label small fw-medium mb-1">Invite link (share with invitee)</label>
                      <div className="d-flex gap-2 align-items-center flex-wrap">
                        <input type="text" readOnly value={lastInviteLink} className="form-control form-control-sm radius-8 flex-grow-1" style={{ minWidth: 200 }} />
                        <button type="button" className="btn btn-outline-primary btn-sm radius-8" onClick={() => { copyToClipboard(lastInviteLink); setSuccessMessage("Link copied to clipboard."); }}>Copy</button>
                      </div>
                    </div>
                  )}
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setInviteModalOpen(false); setLastInviteLink(null); }}>Close</button>
                    <button type="submit" className="btn btn-primary btn-sm radius-8" disabled={inviting || !inviteEmail.trim() || !selectedTeamId}>
                      {inviting ? <span className="spinner-border spinner-border-sm" role="status" /> : "Send invite"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
