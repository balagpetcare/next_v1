"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../../../lib/api";

const ENTITY_TYPES = [
  { value: "", label: "All" },
  { value: "OWNER", label: "Owner" },
  { value: "ORGANIZATION", label: "Organization" },
  { value: "BRANCH", label: "Branch" },
];

function qs(params) {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null || v === "") continue;
    u.set(k, String(v));
  }
  const s = u.toString();
  return s ? `?${s}` : "";
}

function StatCard({ title, value, subtitle }) {
  return (
    <div style={statCardStyle}>
      <div style={{ fontSize: 12, color: "#6b7280" }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>{value ?? "—"}</div>
      {subtitle ? (
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{subtitle}</div>
      ) : null}
    </div>
  );
}

export default function Page() {
  const [days, setDays] = useState(7);
  const [entityType, setEntityType] = useState("");
  const [entityId, setEntityId] = useState("");
  const [limit, setLimit] = useState(50);
  const attemptsRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [summary, setSummary] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [topEntities, setTopEntities] = useState([]);
  const [attempts, setAttempts] = useState([]);

  const query = useMemo(() => ({ days, entityType, entityId }), [days, entityType, entityId]);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const [s, ts, top, at] = await Promise.all([
        apiGet(`/api/v1/admin/verification-metrics/summary${qs({ ...query, top: 10 })}`),
        apiGet(`/api/v1/admin/verification-metrics/timeseries${qs(query)}`),
        apiGet(`/api/v1/admin/verification-metrics/top-entities${qs({ ...query, limit: 10 })}`),
        apiGet(`/api/v1/admin/verification-metrics/locked-update-attempts${qs({ ...query, limit })}`),
      ]);

      setSummary(s?.data || s);
      setTimeseries(ts?.data?.series || ts?.series || []);
      setTopEntities(top?.data?.rows || top?.rows || []);
      setAttempts(at?.data || at || []);
    } catch (e) {
      setErr(e?.message || "Failed to load metrics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, entityType, entityId]);

  const maxTs = useMemo(() => {
    const m = Math.max(0, ...(timeseries || []).map((x) => Number(x.count || 0)));
    return m || 1;
  }, [timeseries]);

  function drillTo(et, eid) {
    if (et) setEntityType(et);
    if (eid !== undefined && eid !== null) setEntityId(String(eid));
    setTimeout(() => {
      try { attemptsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } catch {}
    }, 50);
  }

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 6 }}>Verification Monitoring</h2>
          <p style={{ margin: 0, color: "#6b7280" }}>
            Reads V3.5 metrics endpoints. Use this while you keep <code>VERIFICATION_HARD_LOCK=false</code>.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={labelStyle}>
            Days
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={selectStyle}
            >
              {[7, 14, 30, 60, 90].map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Entity
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              style={selectStyle}
            >
              {ENTITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          <label style={labelStyle}>
            Entity ID
            <input
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="(optional)"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Attempts
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={selectStyle}>
              {[50, 100, 200].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>

          <button onClick={load} style={btnStyle} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={() => downloadCsv('verification-metrics-timeseries.csv', timeseries || [], ['day','count'])}
            style={btnGhostStyle}
            disabled={loading || !(timeseries || []).length}
          >
            Export Timeseries CSV
          </button>

          <button
            onClick={() => downloadCsv('verification-metrics-top-entities.csv', topEntities || [], ['entityType','entityId','count'])}
            style={btnGhostStyle}
            disabled={loading || !(topEntities || []).length}
          >
            Export Top Entities CSV
          </button>

          <button
            onClick={() => downloadCsv('verification-metrics-attempts.csv', attempts || [], ['createdAt','entityType','entityId','userId','reason'])}
            style={btnGhostStyle}
            disabled={loading || !(attempts || []).length}
          >
            Export Attempts CSV
          </button>
        </div>
      </div>

      {err ? (
        <div style={errBoxStyle}>{err}</div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginTop: 14 }}>
        <StatCard title="Total locked attempts" value={summary?.total ?? summary?.totalAttempts} />
        <StatCard title="Unique entities" value={summary?.uniqueEntities} />
        <StatCard
          title="Entity type breakdown"
          value={formatEntityBreakdown(summary?.byEntityType)}
          subtitle="Counts within selected window"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12, marginTop: 14 }}>
        <section style={panelStyle}>
          <h3 style={panelTitleStyle}>Timeseries</h3>
          <p style={panelHintStyle}>Daily locked-update attempt counts</p>

          <div style={{ marginTop: 10 }}>
            {(timeseries || []).length === 0 ? (
              <div style={{ color: "#6b7280" }}>No data</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {(timeseries || []).slice().reverse().map((row) => {
                  const c = Number(row.count || 0);
                  const w = Math.round((c / maxTs) * 100);
                  return (
                    <div key={row.day} style={{ display: "grid", gridTemplateColumns: "110px 1fr 50px", gap: 10, alignItems: "center" }}>
                      <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>{row.day}</div>
                      <div style={{ height: 10, borderRadius: 999, background: "#f3f4f6", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${w}%`, background: "#111827" }} />
                      </div>
                      <div style={{ textAlign: "right", fontWeight: 700 }}>{c}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section style={panelStyle}>
          <h3 style={panelTitleStyle}>Top entities</h3>
          <p style={panelHintStyle}>Entities with repeated locked attempts</p>

          <div style={{ marginTop: 10, overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Entity</th>
                  <th style={thStyle}>ID</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {(topEntities || []).length === 0 ? (
                  <tr><td colSpan={3} style={tdStyleMuted}>No data</td></tr>
                ) : (
                  (topEntities || []).map((r, idx) => (
                    <tr key={`${r.entityType}-${r.entityId}-${idx}`} style={{ cursor: "pointer" }} onClick={() => { setEntityType(r.entityType); setEntityId(String(r.entityId)); setTimeout(() => attemptsRef.current?.scrollIntoView({ behavior: "smooth" }), 50); }}>
                      <td style={tdStyle}>{r.entityType}</td>
                      <td style={tdStyle}><a href={entityLink(r.entityType, r.entityId)} style={linkInlineStyle}>{r.entityId}</a></td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700 }}>{r.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section ref={attemptsRef} style={{ ...panelStyle, marginTop: 14 }}>
        <h3 style={panelTitleStyle}>Recent locked update attempts</h3>
        <p style={panelHintStyle}>Last 50 attempts (newest first)</p>

        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>When</th>
                <th style={thStyle}>Entity</th>
                <th style={thStyle}>Entity ID</th>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {(attempts || []).length === 0 ? (
                <tr><td colSpan={5} style={tdStyleMuted}>No data</td></tr>
              ) : (
                (attempts || []).map((a) => (
                  <tr key={a.id}>
                    <td style={tdStyleMono}>{fmtWhen(a.createdAt)}</td>
                    <td style={tdStyle}>{a.entityType}</td>
                    <td style={tdStyle}><a href={entityLink(a.entityType, a.entityId)} style={linkInlineStyle}>{a.entityId}</a></td>
                    <td style={tdStyle}>{a.userId ?? "—"}</td>
                    <td style={tdStyle}>{a.reason || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <a href="/admin/verifications" style={linkStyle}>Back to Verifications</a>
        <a href="/admin/dashboard" style={linkStyle}>Dashboard</a>
      </div>
    </div>
  );
}


function formatEntityBreakdown(byEntityType) {
  if (!byEntityType) return "—";
  const parts = Object.entries(byEntityType)
    .filter(([, v]) => Number(v) > 0)
    .map(([k, v]) => `${k}: ${v}`);
  return parts.length ? parts.join(" · ") : "—";
}

function fmtWhen(s) {
  if (!s) return "—";
  try {
    const d = new Date(s);
    return d.toLocaleString();
  } catch {
    return String(s);
  }
}

function downloadCsv(filename, rows, columns) {
  try {
    const cols = (columns && columns.length) ? columns : Object.keys((rows && rows[0]) || {});
    const escape = (v) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
      return s;
    };

    const lines = [];
    lines.push(cols.join(','));
    for (const r of (rows || [])) {
      lines.push(cols.map((c) => escape(r?.[c])).join(','));
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    // eslint-disable-next-line no-alert
    alert(e?.message || 'Failed to export CSV');
  }
}

function entityLink(entityType, entityId) {
  if (!entityType || entityId === undefined || entityId === null) return "#";
  if (entityType === "ORGANIZATION") return `/admin/organizations/${entityId}`;
  if (entityType === "BRANCH") return `/admin/branches/${entityId}`;
  if (entityType === "OWNER") return `/admin/users`;
  return "#";
}

const labelStyle = {
  display: "grid",
  gap: 6,
  fontSize: 12,
  color: "#6b7280",
};

const inputStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "8px 10px",
  background: "#fff",
  minWidth: 140,
};

const selectStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "8px 10px",
  background: "#fff",
};

const btnGhostStyle = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "9px 12px",
  background: "#fff",
  color: "#111827",
  cursor: "pointer",
};

const btnStyle = {
  border: "1px solid #111827",
  borderRadius: 10,
  padding: "9px 12px",
  background: "#111827",
  color: "#fff",
  cursor: "pointer",
};

const errBoxStyle = {
  marginTop: 12,
  padding: 10,
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#fef2f2",
  color: "#991b1b",
};

const statCardStyle = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 12,
  padding: 12,
};

const panelStyle = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 12,
  padding: 12,
};

const panelTitleStyle = {
  margin: 0,
  fontSize: 16,
};

const panelHintStyle = {
  margin: "6px 0 0",
  color: "#6b7280",
  fontSize: 12,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle = {
  textAlign: "left",
  padding: "10px 8px",
  fontSize: 12,
  color: "#6b7280",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "10px 8px",
  borderBottom: "1px solid #f3f4f6",
  verticalAlign: "top",
};

const tdStyleMono = {
  ...tdStyle,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  fontSize: 12,
  whiteSpace: "nowrap",
};

const tdStyleMuted = {
  ...tdStyle,
  color: "#6b7280",
};

const linkStyle = {
  display: "inline-block",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  textDecoration: "none",
};

const linkInlineStyle = {
  color: "#111827",
  textDecoration: "underline",
};
