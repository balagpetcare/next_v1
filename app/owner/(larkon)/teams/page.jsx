"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ownerGet, ownerPost } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

const DELEGATION_SCOPE_KEYS = [
  "products",
  "clinics",
  "inventory",
  "staff",
  "branches",
  "finance_read",
];
const DELEGATION_SCOPE_LABELS = {
  products: "Products",
  clinics: "Clinics",
  inventory: "Inventory",
  staff: "Staff",
  branches: "Branches",
  finance_read: "Finance (Read Only)",
};

export default function OwnerTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [scopeOptions, setScopeOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [selectedScopes, setSelectedScopes] = useState([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [teamsRes, scopesRes] = await Promise.all([
        ownerGet("/api/v1/owner/teams"),
        ownerGet("/api/v1/owner/delegations/scopes"),
      ]);
      const t = teamsRes?.data ?? teamsRes ?? [];
      const s = scopesRes?.data ?? scopesRes ?? [];
      setTeams(Array.isArray(t) ? t : []);
      setScopeOptions(Array.isArray(s) ? s : []);
    } catch (e) {
      setError(e?.response?.error || e?.message || "Failed to load teams");
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

  function toggleScope(key) {
    setSelectedScopes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function createTeam(e) {
    e?.preventDefault();
    setValidationError("");
    setError("");
    const name = newTeamName.trim();
    if (!name) {
      setValidationError("Team name is required");
      return;
    }
    setCreating(true);
    try {
      // Payload: { name, description?, scopes? }. Owner is set server-side from auth; do not send owner_id.
      await ownerPost("/api/v1/owner/teams", {
        name,
        description: newTeamDesc.trim() || undefined,
        scopes: selectedScopes.length > 0 ? selectedScopes : undefined,
      });
      setNewTeamName("");
      setNewTeamDesc("");
      setSelectedScopes([]);
      setSuccessMessage("Team created successfully.");
      await load();
    } catch (e) {
      const msg = e?.response?.error || e?.message || "Failed to create team";
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  const scopesToShow = scopeOptions.length > 0
    ? scopeOptions
    : DELEGATION_SCOPE_KEYS.map((key) => ({
        key,
        label: DELEGATION_SCOPE_LABELS[key] || key,
        isReadOnly: key === "finance_read",
      }));

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader
        title="Teams & Delegation"
        breadcrumbs={[
          { label: "Owner", href: "/owner" },
          { label: "Teams", href: "/owner/teams" },
        ]}
        actions={[
          <Link key="overview" href="/owner/overview" className="btn btn-ghost btn-sm">
            Overview
          </Link>,
        ]}
      />

      {/* Toast / Alert messages */}
      {successMessage && (
        <div
          className="alert alert-success d-flex align-items-center justify-content-between radius-12 mb-0"
          role="alert"
        >
          <span>{successMessage}</span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setSuccessMessage("")}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
      {error && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between radius-12 mb-0"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => setError("")}
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create Team form – BPA Design System */}
      <div className="card border radius-12 shadow-sm">
        <div className="card-body p-24">
          <h6 className="fw-semibold mb-4">Create Team</h6>
          <form onSubmit={createTeam} className="d-flex flex-column gap-4">
            <div className="row g-3">
              <div className="col-12 col-md-6 col-lg-4">
                <label htmlFor="team-name" className="form-label fw-medium">
                  Team name <span className="text-danger">*</span>
                </label>
                <input
                  id="team-name"
                  type="text"
                  value={newTeamName}
                  onChange={(e) => {
                    setNewTeamName(e.target.value);
                    setValidationError("");
                  }}
                  placeholder="e.g. Operations Team"
                  className={`form-control form-control-sm radius-12 ${validationError ? "is-invalid" : ""}`}
                  aria-invalid={!!validationError}
                  aria-describedby={validationError ? "name-error" : undefined}
                  disabled={creating}
                />
                {validationError && (
                  <p id="name-error" className="text-danger small mt-1 mb-0">
                    {validationError}
                  </p>
                )}
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <label htmlFor="team-desc" className="form-label fw-medium text-secondary">
                  Description (optional)
                </label>
                <input
                  id="team-desc"
                  type="text"
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  placeholder="Optional"
                  className="form-control form-control-sm radius-12"
                  disabled={creating}
                />
              </div>
            </div>

            <div>
              <label className="form-label fw-medium text-secondary d-block mb-2">
                Delegation scopes (optional)
              </label>
              <div className="row g-2 row-cols-2 row-cols-md-3 row-cols-lg-6">
                {scopesToShow.map((s) => (
                  <div key={s.key} className="col">
                    <div className="form-check">
                      <input
                        id={`scope-${s.key}`}
                        type="checkbox"
                        className="form-check-input radius-8"
                        checked={selectedScopes.includes(s.key)}
                        onChange={() => toggleScope(s.key)}
                        disabled={creating}
                        aria-label={s.label}
                      />
                      <label
                        htmlFor={`scope-${s.key}`}
                        className="form-check-label small text-break"
                        title={s.isReadOnly ? "Read-only" : undefined}
                      >
                        {s.label}
                        {s.isReadOnly && (
                          <span className="text-muted"> (read)</span>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="d-flex align-items-center gap-3 flex-wrap">
              <button
                type="submit"
                className="btn btn-primary radius-12"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                    Creating...
                  </>
                ) : (
                  "Create Team"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Teams list */}
      {loading ? (
        <div className="card border radius-12">
          <div className="card-body p-24 d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      ) : teams.length === 0 ? (
        <div className="card border radius-12 bg-light">
          <div className="card-body p-24 text-center py-5">
            <p className="text-secondary mb-1">No teams yet.</p>
            <p className="small text-muted mb-0">
              Create a team to delegate responsibilities and assign scopes (products, inventory, staff, etc.) to members.
            </p>
          </div>
        </div>
      ) : (
        <div className="row g-3 row-cols-1 row-cols-md-2 row-cols-lg-3">
          {teams.map((team) => (
            <div key={team.id} className="col">
              <div className="card border radius-12 shadow-sm h-100">
                <div className="card-body p-24">
                  <h6 className="card-title fw-semibold mb-2">{team.name}</h6>
                  {team.description && (
                    <p className="small text-secondary mb-2">{team.description}</p>
                  )}
                  {Array.isArray(team.scopes) && team.scopes.length > 0 && (
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {team.scopes.map((key) => (
                        <span
                          key={key}
                          className="badge bg-primary-50 text-primary-600 radius-8 px-8 py-4 small"
                        >
                          {DELEGATION_SCOPE_LABELS[key] || key}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="small text-muted mb-3">
                    {team.members?.length ?? 0} member{(team.members?.length ?? 0) !== 1 ? "s" : ""}
                  </p>
                  <Link
                    href={`/owner/teams/${team.id}`}
                    className="btn btn-ghost btn-sm radius-12"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scope reference */}
      {scopesToShow.length > 0 && (
        <div className="card border radius-12 bg-light">
          <div className="card-body p-24">
            <h6 className="fw-semibold mb-2">Available delegation scopes</h6>
            <div className="d-flex flex-wrap gap-2">
              {scopesToShow.map((s) => (
                <span
                  key={s.key}
                  className="badge bg-secondary bg-opacity-25 radius-8 px-10 py-4"
                  title={s.isReadOnly ? "Read-only" : undefined}
                >
                  {s.label}
                  {s.isReadOnly && " (read)"}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
