"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ownerGet, ownerPost, ownerDelete } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const DELEGATION_SCOPE_LABELS = {
  products: "Products",
  clinics: "Clinics",
  inventory: "Inventory",
  staff: "Staff",
  branches: "Branches",
  finance_read: "Finance (Read Only)",
};

function getInviteAcceptUrl(token) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/invite/accept?token=${encodeURIComponent(token)}`;
}

export default function OwnerTeamDetailPage() {
  const params = useParams();
  const teamId = params?.id ? parseInt(String(params.id), 10) : null;
  const [team, setTeam] = useState(null);
  const [scopes, setScopes] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [removingUserId, setRemovingUserId] = useState(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteScopes, setInviteScopes] = useState([]);
  const [inviteBranchIds, setInviteBranchIds] = useState("");
  const [inviting, setInviting] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState(null);

  const load = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    setError("");
    try {
      const [teamsRes, scopesRes, invitationsRes] = await Promise.all([
        ownerGet("/api/v1/owner/teams"),
        ownerGet("/api/v1/owner/delegations/scopes"),
        ownerGet(`/api/v1/owner/teams/${teamId}/invitations`).catch(() => ({ data: [] })),
      ]);
      const tList = teamsRes?.data ?? teamsRes ?? [];
      const list = Array.isArray(tList) ? tList : [];
      const found = list.find((x) => x.id === teamId) ?? null;
      setTeam(found);
      setScopes(scopesRes?.data ?? scopesRes ?? []);
      const invList = invitationsRes?.data ?? invitationsRes ?? [];
      setPendingInvitations(Array.isArray(invList) ? invList : []);
    } catch (e) {
      setError(e?.response?.error || e?.response?.message || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

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
    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setError("Email is required.");
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
      if (token) {
        setLastInviteLink(getInviteAcceptUrl(token));
      }
      await load();
    } catch (e) {
      setError(e?.response?.error || e?.response?.message || e?.message || "Failed to send invitation");
    } finally {
      setInviting(false);
    }
  }

  function toggleInviteScope(key) {
    setInviteScopes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function removeMember(userId) {
    setError("");
    setRemovingUserId(userId);
    try {
      await ownerDelete(`/api/v1/owner/teams/${teamId}/members/${userId}`);
      setSuccessMessage("Member removed.");
      await load();
    } catch (e) {
      setError(e?.response?.error || e?.response?.message || e?.message || "Failed to remove member");
    } finally {
      setRemovingUserId(null);
    }
  }

  function copyInviteLink(url) {
    if (typeof navigator?.clipboard?.writeText === "function") {
      navigator.clipboard.writeText(url);
      setSuccessMessage("Link copied to clipboard.");
    }
  }

  if (!teamId) {
    return (
      <div className="d-flex flex-column gap-4">
        <PageHeader title="Invalid team" breadcrumbs={[{ label: "Owner", href: "/owner" }, { label: "Teams", href: "/owner/teams" }]} />
        <Link href="/owner/teams" className="btn btn-ghost btn-sm align-self-start">Back to Teams</Link>
      </div>
    );
  }

  if (team === null && !loading) {
    return (
      <div className="d-flex flex-column gap-4">
        <PageHeader title="Team not found" breadcrumbs={[{ label: "Owner", href: "/owner" }, { label: "Teams", href: "/owner/teams" }]} />
        <Link href="/owner/teams" className="btn btn-ghost btn-sm align-self-start">Back to Teams</Link>
      </div>
    );
  }

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader
        title={team?.name ?? "Team"}
        breadcrumbs={[
          { label: "Owner", href: "/owner" },
          { label: "Teams", href: "/owner/teams" },
          { label: team?.name ?? String(teamId), href: `/owner/teams/${teamId}` },
        ]}
        actions={[
          <Link key="back" href="/owner/teams" className="btn btn-ghost btn-sm">← Back to Teams</Link>,
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

      {loading ? (
        <div className="card border radius-12">
          <div className="card-body p-24 d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Team info */}
          <div className="card border radius-12 shadow-sm">
            <div className="card-body p-24">
              <h6 className="fw-semibold mb-2">{team?.name}</h6>
              {team?.description && (
                <p className="small text-secondary mb-2">{team.description}</p>
              )}
              {Array.isArray(team?.scopes) && team.scopes.length > 0 && (
                <div className="d-flex flex-wrap gap-1 mb-0">
                  {team.scopes.map((key) => (
                    <span key={key} className="badge bg-primary-50 text-primary-600 radius-8 px-8 py-4 small">
                      {DELEGATION_SCOPE_LABELS[key] || key}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Invite member by email */}
          <div className="card border radius-12 shadow-sm">
            <div className="card-body p-24">
              <h6 className="fw-semibold mb-3">Invite member by email</h6>
              <form onSubmit={inviteByEmail} className="row g-3">
                <div className="col-12 col-md-4">
                  <label htmlFor="invite-email" className="form-label small fw-medium mb-1">Email <span className="text-danger">*</span></label>
                  <input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@example.com"
                    className="form-control form-control-sm radius-12"
                    disabled={inviting}
                  />
                </div>
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-medium mb-1">Scopes (optional)</label>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    {scopes.map((s) => (
                      <label key={s.key} className="d-inline-flex align-items-center gap-1 small mb-0">
                        <input
                          type="checkbox"
                          checked={inviteScopes.includes(s.key)}
                          onChange={() => toggleInviteScope(s.key)}
                          disabled={inviting}
                          className="form-check-input"
                        />
                        <span>{DELEGATION_SCOPE_LABELS[s.key] || s.key}</span>
                      </label>
                    ))}
                  </div>
                  {scopes.length > 0 && (
                    <p className="small text-muted mb-0 mt-1">Leave unchecked to use team default scopes.</p>
                  )}
                </div>
                <div className="col-12 col-md-3">
                  <label htmlFor="invite-branch-ids" className="form-label small fw-medium mb-1">Branch IDs (optional)</label>
                  <input
                    id="invite-branch-ids"
                    type="text"
                    value={inviteBranchIds}
                    onChange={(e) => setInviteBranchIds(e.target.value)}
                    placeholder="e.g. 1, 2"
                    className="form-control form-control-sm radius-12"
                    disabled={inviting}
                  />
                </div>
                <div className="col-12 col-md-1 d-flex align-items-end">
                  <button type="submit" className="btn btn-primary btn-sm radius-12 w-100" disabled={inviting || !inviteEmail.trim()}>
                    {inviting ? (
                      <span className="spinner-border spinner-border-sm" role="status" />
                    ) : (
                      "Invite"
                    )}
                  </button>
                </div>
              </form>
              {lastInviteLink && (
                <div className="mt-3 p-3 bg-light radius-8">
                  <label className="form-label small fw-medium mb-1">Invite link (share with invitee)</label>
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    <input
                      type="text"
                      readOnly
                      value={lastInviteLink}
                      className="form-control form-control-sm radius-8 flex-grow-1"
                      style={{ minWidth: 200 }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm radius-8"
                      onClick={() => copyInviteLink(lastInviteLink)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pending invitations */}
          <div className="card border radius-12 shadow-sm">
            <div className="card-body p-24">
              <h6 className="fw-semibold mb-3">Pending invitations</h6>
              {pendingInvitations.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {pendingInvitations.map((inv) => (
                    <li
                      key={inv.id}
                      className="d-flex align-items-center justify-content-between py-2 border-bottom border-light"
                    >
                      <span className="text-break">{inv.email}</span>
                      <span className="d-flex align-items-center gap-2">
                        <span className={`badge radius-8 small ${inv.status === "PENDING" ? "bg-warning text-dark" : inv.status === "ACCEPTED" ? "bg-success" : "bg-secondary"}`}>
                          {inv.status}
                        </span>
                        {inv.invitedAt && (
                          <span className="small text-muted">
                            {new Date(inv.invitedAt).toLocaleDateString()}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small text-muted mb-0">No pending invitations.</p>
              )}
            </div>
          </div>

          {/* Active members */}
          <div className="card border radius-12 shadow-sm">
            <div className="card-body p-24">
              <h6 className="fw-semibold mb-3">Active members</h6>
              {team?.members?.length > 0 ? (
                <ul className="list-unstyled mb-0">
                  {team.members.map((m) => (
                    <li
                      key={m.userId}
                      className="d-flex align-items-center justify-content-between py-2 border-bottom border-light"
                    >
                      <span className="text-break">
                        {m.user?.profile?.displayName ?? m.user?.auth?.email ?? m.user?.auth?.phone ?? `User #${m.userId}`}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-danger"
                        onClick={() => removeMember(m.userId)}
                        disabled={removingUserId === m.userId}
                        aria-label={`Remove ${m.user?.profile?.displayName ?? m.userId}`}
                      >
                        {removingUserId === m.userId ? (
                          <span className="spinner-border spinner-border-sm" role="status" />
                        ) : (
                          "Remove"
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="small text-muted mb-0">No members yet. Invite by email above.</p>
              )}
            </div>
          </div>
        </>
      )}

      {!loading && (
        <Link href="/owner/teams" className="btn btn-ghost btn-sm align-self-start">← Back to Teams</Link>
      )}
    </div>
  );
}
