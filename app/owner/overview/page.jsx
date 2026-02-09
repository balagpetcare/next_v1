"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ownerGet } from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

export default function OwnerOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("delegations");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [overviewRes, logsRes] = await Promise.all([
        ownerGet("/api/v1/owner/overview"),
        ownerGet("/api/v1/owner/overview/logs?limit=50"),
      ]);
      const o = overviewRes?.data ?? overviewRes ?? {};
      const l = logsRes?.data ?? logsRes ?? [];
      setOverview(o);
      setLogs(Array.isArray(l) ? l : []);
    } catch (e) {
      setError(e?.message || "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const teams = overview?.teams ?? [];
  const delegations = overview?.delegations ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Delegation Overview"
        breadcrumbs={[
          { label: "Owner", href: "/owner" },
          { label: "Overview", href: "/owner/overview" },
        ]}
      />

      <p className="text-base-content/70">
        Who is responsible for what. Read-only dashboard of teams and delegations.
      </p>

      {error && (
        <div className="alert alert-error">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : (
        <>
          <div className="tabs tabs-boxed">
            <button
              type="button"
              className={`tab ${activeTab === "delegations" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("delegations")}
            >
              Delegations
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "teams" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("teams")}
            >
              Teams
            </button>
            <button
              type="button"
              className={`tab ${activeTab === "logs" ? "tab-active" : ""}`}
              onClick={() => setActiveTab("logs")}
            >
              Audit Logs
            </button>
          </div>

          {activeTab === "delegations" && (
            <div className="card bg-base-200">
              <div className="card-body">
                <h4 className="font-medium">Delegations</h4>
                {delegations.length === 0 ? (
                  <p className="text-sm text-base-content/60 mt-2">No delegations yet.</p>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>User</th>
                          <th>Scope</th>
                          <th>Org</th>
                          <th>Branch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {delegations.map((d) => (
                          <tr key={d.id}>
                            <td>
                              {d.delegatedUser?.profile?.displayName ??
                                d.delegatedUser?.auth?.email ??
                                `User #${d.delegatedUserId}`}
                            </td>
                            <td><span className="badge badge-outline badge-sm">{d.scopeKey}</span></td>
                            <td>{d.org?.name ?? "—"}</td>
                            <td>{d.branch?.name ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "teams" && (
            <div className="card bg-base-200">
              <div className="card-body">
                <h4 className="font-medium">Teams</h4>
                {teams.length === 0 ? (
                  <p className="text-sm text-base-content/60 mt-2">No teams yet.</p>
                ) : (
                  <div className="space-y-2 mt-2">
                    {teams.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-base-300 last:border-0">
                        <div>
                          <span className="font-medium">{t.name}</span>
                          <span className="text-sm text-base-content/60 ml-2">
                            ({t.members?.length ?? 0} members)
                          </span>
                        </div>
                        <Link href={`/owner/teams/${t.id}`} className="btn btn-ghost btn-xs">
                          Manage
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="card bg-base-200">
              <div className="card-body">
                <h4 className="font-medium">Audit Logs</h4>
                {logs.length === 0 ? (
                  <p className="text-sm text-base-content/60 mt-2">No logs yet.</p>
                ) : (
                  <div className="overflow-x-auto mt-2">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Action</th>
                          <th>Actor</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {logs.map((log) => (
                          <tr key={log.id}>
                            <td><code className="text-xs">{log.action}</code></td>
                            <td>{log.actor?.profile?.displayName ?? "—"}</td>
                            <td className="text-xs text-base-content/60">
                              {log.createdAt ? new Date(log.createdAt).toLocaleString() : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          <Link href="/owner/teams" className="btn btn-ghost btn-sm">
            Manage Teams
          </Link>
        </>
      )}
    </div>
  );
}
