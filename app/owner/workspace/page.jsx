"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageHeader from "@/app/owner/_components/shared/PageHeader";
import { ownerGet, ownerPost, ownerPatch } from "@/app/owner/_lib/ownerApi";

const API_W = "/api/v1/workspace";

const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];
const TASK_TYPES = ["INVENTORY", "STAFF", "ORDER", "COMPLIANCE", "SYSTEM"];
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`card border radius-12 ${className}`}>
      <div className="card-header d-flex align-items-center justify-content-between">
        <div>
          <h6 className="mb-0">{title}</h6>
          {subtitle ? <div className="text-muted small">{subtitle}</div> : null}
        </div>
      </div>
      <div className="card-body p-24">{children}</div>
    </div>
  );
}

export default function OwnerWorkspacePage() {
  const [me, setMe] = useState(null);
  const [workspaceMe, setWorkspaceMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [alertsTotal, setAlertsTotal] = useState(0);
  const [approvals, setApprovals] = useState([]);
  const [approvalsTotal, setApprovalsTotal] = useState(0);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: "" });
  const [createTaskForm, setCreateTaskForm] = useState({
    title: "",
    description: "",
    type: "SYSTEM",
    priority: "MEDIUM",
    branchId: "",
    assignedToUserId: "",
    deadline: "",
  });
  const [commentBody, setCommentBody] = useState("");
  const [saving, setSaving] = useState(false);

  const loadMe = useCallback(async () => {
    try {
      const res = await ownerGet("/api/v1/auth/me");
      setMe(res);
    } catch {
      setMe(null);
    }
  }, []);

  const loadWorkspaceMe = useCallback(async () => {
    try {
      const res = await ownerGet(`${API_W}/me`);
      if (res?.success && res.data) setWorkspaceMe(res.data);
      else setWorkspaceMe(null);
    } catch {
      setWorkspaceMe(null);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const res = await ownerGet(`${API_W}/tasks?limit=200`);
      if (res?.success && Array.isArray(res.data)) {
        setTasks(res.data);
        setTasksTotal(res.total ?? res.data.length);
      } else {
        setTasks([]);
        setTasksTotal(0);
      }
    } catch (e) {
      setError(e?.message || "Failed to load tasks");
      setTasks([]);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      const res = await ownerGet(`${API_W}/alerts?limit=100`);
      if (res?.success && Array.isArray(res.data)) {
        setAlerts(res.data);
        setAlertsTotal(res.total ?? res.data.length);
      } else {
        setAlerts([]);
        setAlertsTotal(0);
      }
    } catch (e) {
      setAlerts([]);
    }
  }, []);

  const loadApprovals = useCallback(async () => {
    try {
      const res = await ownerGet(`${API_W}/approvals?status=PENDING&limit=100`);
      if (res?.success && Array.isArray(res.data)) {
        setApprovals(res.data);
        setApprovalsTotal(res.total ?? res.data.length);
      } else {
        setApprovals([]);
        setApprovalsTotal(0);
      }
    } catch (e) {
      setApprovals([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError("");
      await loadMe();
      await loadWorkspaceMe();
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [loadMe, loadWorkspaceMe]);

  useEffect(() => {
    if (!workspaceMe) return;
    if (activeTab === "tasks") loadTasks();
    else if (activeTab === "alerts") loadAlerts();
    else if (activeTab === "approvals") loadApprovals();
  }, [workspaceMe, activeTab, loadTasks, loadAlerts, loadApprovals]);

  useEffect(() => {
    if (!selectedTask) {
      setTaskComments([]);
      return;
    }
    ownerGet(`${API_W}/tasks/${selectedTask.id}/comments`)
      .then((res) => setTaskComments(res?.data ?? []))
      .catch(() => setTaskComments([]));
  }, [selectedTask?.id]);

  async function createTask() {
    if (!createTaskForm.title.trim()) return;
    setSaving(true);
    setError("");
    try {
      await ownerPost(`${API_W}/tasks`, {
        title: createTaskForm.title.trim(),
        description: createTaskForm.description.trim() || undefined,
        type: createTaskForm.type,
        priority: createTaskForm.priority,
        branchId: createTaskForm.branchId ? Number(createTaskForm.branchId) : null,
        assignedToUserId: createTaskForm.assignedToUserId ? Number(createTaskForm.assignedToUserId) : null,
        deadline: createTaskForm.deadline || null,
      });
      setShowCreateTask(false);
      setCreateTaskForm({ title: "", description: "", type: "SYSTEM", priority: "MEDIUM", branchId: "", assignedToUserId: "", deadline: "" });
      loadTasks();
    } catch (e) {
      setError(e?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function updateTaskStatus(taskId, status) {
    setError("");
    try {
      await ownerPatch(`${API_W}/tasks/${taskId}`, { status });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
      if (selectedTask?.id === taskId) setSelectedTask((t) => (t ? { ...t, status } : null));
    } catch (e) {
      setError(e?.message || "Update failed");
    }
  }

  async function addComment() {
    if (!selectedTask || !commentBody.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await ownerPost(`${API_W}/tasks/${selectedTask.id}/comments`, { body: commentBody.trim() });
      setTaskComments((prev) => [...prev, res?.data ?? { body: commentBody, actor: me, createdAt: new Date().toISOString() }]);
      setCommentBody("");
    } catch (e) {
      setError(e?.message || "Comment failed");
    } finally {
      setSaving(false);
    }
  }

  async function acknowledgeAlert(id) {
    setError("");
    try {
      await ownerPatch(`${API_W}/alerts/${id}/acknowledge`, {});
      loadAlerts();
    } catch (e) {
      setError(e?.message || "Acknowledge failed");
    }
  }

  async function convertAlertToTask(id) {
    setError("");
    try {
      await ownerPost(`${API_W}/alerts/${id}/convert-to-task`, {});
      loadAlerts();
      setActiveTab("tasks");
      loadTasks();
    } catch (e) {
      setError(e?.message || "Convert failed");
    }
  }

  async function approveRequest(id) {
    setError("");
    try {
      await ownerPost(`${API_W}/approvals/${id}/approve`, {});
      loadApprovals();
    } catch (e) {
      setError(e?.message || "Approve failed");
    }
  }

  async function rejectRequest() {
    if (!rejectModal.id || !rejectModal.reason.trim()) return;
    setSaving(true);
    setError("");
    try {
      await ownerPost(`${API_W}/approvals/${rejectModal.id}/reject`, { reason: rejectModal.reason.trim() });
      setRejectModal({ open: false, id: null, reason: "" });
      loadApprovals();
    } catch (e) {
      setError(e?.message || "Reject failed");
    } finally {
      setSaving(false);
    }
  }

  const tasksByStatus = TASK_STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="d-flex flex-column gap-4">
        <PageHeader title="Workspace" breadcrumbs={[{ label: "Owner", href: "/owner" }, { label: "Workspace", href: "/owner/workspace" }]} />
        <div className="card border radius-12">
          <div className="card-body p-24 d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status" />
          </div>
        </div>
      </div>
    );
  }

  const teamName = me?.defaultContext?.team?.name ?? "your team";
  const isOwner = workspaceMe?.role === "OWNER";
  const canCreateTask = workspaceMe?.canCreateTask ?? false;

  return (
    <div className="d-flex flex-column gap-4">
      <PageHeader
        title="Workspace"
        subtitle="Tasks, alerts, and approvals"
        breadcrumbs={[{ label: "Owner", href: "/owner" }, { label: "Workspace", href: "/owner/workspace" }]}
      />

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button type="button" className="btn-close" onClick={() => setError("")} aria-label="Close" />
        </div>
      )}

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "tasks" ? "active" : ""}`} onClick={() => setActiveTab("tasks")}>
            Tasks
            {tasksTotal > 0 && <span className="badge bg-primary ms-1">{tasksTotal}</span>}
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "alerts" ? "active" : ""}`} onClick={() => setActiveTab("alerts")}>
            Alerts
            {alertsTotal > 0 && <span className="badge bg-warning ms-1">{alertsTotal}</span>}
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === "approvals" ? "active" : ""}`} onClick={() => setActiveTab("approvals")}>
            Approvals
            {approvalsTotal > 0 && <span className="badge bg-info ms-1">{approvalsTotal}</span>}
          </button>
        </li>
      </ul>

      {activeTab === "tasks" && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <p className="text-muted small mb-0">
              {workspaceMe?.role === "OWNER" ? "All branches" : workspaceMe?.role === "MANAGER" ? "Your branch(es)" : "My tasks only"}
            </p>
            {canCreateTask && (
              <button type="button" className="btn btn-primary" onClick={() => setShowCreateTask(true)}>
                + New task
              </button>
            )}
          </div>
          <div className="row g-3" style={{ minHeight: "320px" }}>
            {TASK_STATUSES.map((status) => (
              <div key={status} className="col-12 col-md-6 col-xl-3">
                <Card title={status.replace("_", " ")} subtitle={`${(tasksByStatus[status] || []).length} tasks`}>
                  <div className="d-flex flex-column gap-2">
                    {(tasksByStatus[status] || []).map((t) => (
                      <div
                        key={t.id}
                        className="border rounded p-2 cursor-pointer bg-light-hover"
                        style={{ cursor: "pointer" }}
                        onClick={() => setSelectedTask(t)}
                      >
                        <div className="fw-semibold small text-truncate">{t.title}</div>
                        <div className="d-flex justify-content-between align-items-center mt-1">
                          <span className="badge bg-secondary small">{t.type}</span>
                          <span className="badge bg-dark small">{t.priority}</span>
                        </div>
                        {t.assignedTo && (
                          <div className="text-muted small mt-1">
                            → {t.assignedTo?.profile?.displayName || t.assignedTo?.profile?.username || "Unassigned"}
                          </div>
                        )}
                        {t.deadline && (
                          <div className="small text-danger">Due {new Date(t.deadline).toLocaleDateString()}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === "alerts" && (
        <Card title="Alerts" subtitle={workspaceMe?.canSeeAllAlerts ? "Acknowledge or convert to task" : "Read-only"}>
          {alerts.length === 0 ? (
            <p className="text-muted mb-0">No alerts.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Branch</th>
                    <th>Acknowledged</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr key={a.id}>
                      <td><span className="badge bg-warning">{a.type}</span></td>
                      <td>{a.title}</td>
                      <td>{a.branch?.name ?? "—"}</td>
                      <td>{a.acknowledgedAt ? new Date(a.acknowledgedAt).toLocaleString() : "—"}</td>
                      <td>
                        {!a.acknowledgedAt && (
                          <button type="button" className="btn btn-outline-secondary btn-sm me-1" onClick={() => acknowledgeAlert(a.id)}>Acknowledge</button>
                        )}
                        {!a.convertedToTaskId && (
                          <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => convertAlertToTask(a.id)}>Convert to task</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === "approvals" && (
        <Card title="Approval queue" subtitle="Approve or reject with reason">
          {approvals.length === 0 ? (
            <p className="text-muted mb-0">No pending approvals.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Requester</th>
                    <th>Branch</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((a) => (
                    <tr key={a.id}>
                      <td><span className="badge bg-info">{a.type}</span></td>
                      <td>{a.requester?.profile?.displayName ?? a.requester?.id ?? "—"}</td>
                      <td>{a.branch?.name ?? "—"}</td>
                      <td>{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</td>
                      <td>
                        <button type="button" className="btn btn-success btn-sm me-1" onClick={() => approveRequest(a.id)}>Approve</button>
                        <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setRejectModal({ open: true, id: a.id, reason: "" })}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Create task modal */}
      {showCreateTask && (
        <div className="modal d-block bg-dark bg-opacity-25" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">New task</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateTask(false)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Title *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={createTaskForm.title}
                    onChange={(e) => setCreateTaskForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Task title"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={createTaskForm.description}
                    onChange={(e) => setCreateTaskForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="row g-2">
                  <div className="col-6">
                    <label className="form-label">Type</label>
                    <select
                      className="form-select form-select-sm"
                      value={createTaskForm.type}
                      onChange={(e) => setCreateTaskForm((f) => ({ ...f, type: e.target.value }))}
                    >
                      {TASK_TYPES.map((ty) => (
                        <option key={ty} value={ty}>{ty}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-6">
                    <label className="form-label">Priority</label>
                    <select
                      className="form-select form-select-sm"
                      value={createTaskForm.priority}
                      onChange={(e) => setCreateTaskForm((f) => ({ ...f, priority: e.target.value }))}
                    >
                      {TASK_PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mb-3 mt-2">
                  <label className="form-label">Deadline (optional)</label>
                  <input
                    type="date"
                    className="form-control form-control-sm"
                    value={createTaskForm.deadline}
                    onChange={(e) => setCreateTaskForm((f) => ({ ...f, deadline: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateTask(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" disabled={saving || !createTaskForm.title.trim()} onClick={createTask}>
                  {saving ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task detail & comments modal */}
      {selectedTask && (
        <div className="modal d-block bg-dark bg-opacity-25" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedTask.title}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedTask(null)} aria-label="Close" />
              </div>
              <div className="modal-body">
                <p className="text-muted small">{selectedTask.description || "No description."}</p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <span className="badge bg-secondary">{selectedTask.type}</span>
                  <span className="badge bg-dark">{selectedTask.priority}</span>
                  <span className="badge bg-info">{selectedTask.status}</span>
                  {selectedTask.branch && <span className="badge bg-light text-dark">{selectedTask.branch.name}</span>}
                </div>
                {canCreateTask && (
                  <div className="mb-3">
                    <label className="form-label small">Change status</label>
                    <div className="d-flex gap-1 flex-wrap">
                      {TASK_STATUSES.map((s) => (
                        <button
                          key={s}
                          type="button"
                          className={`btn btn-sm ${selectedTask.status === s ? "btn-primary" : "btn-outline-secondary"}`}
                          onClick={() => updateTaskStatus(selectedTask.id, s)}
                        >
                          {s.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <hr />
                <h6>Comments</h6>
                <div className="mb-3">
                  {taskComments.map((c) => (
                    <div key={c.id} className="border-start border-3 ps-2 mb-2 small">
                      <strong>{c.actor?.profile?.displayName ?? "User"}</strong>
                      <span className="text-muted ms-1">({c.actorRole}) · {new Date(c.createdAt).toLocaleString()}</span>
                      <div>{c.body}</div>
                    </div>
                  ))}
                </div>
                <div className="d-flex gap-2">
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    placeholder="Add a comment…"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addComment()}
                  />
                  <button type="button" className="btn btn-primary btn-sm" disabled={saving || !commentBody.trim()} onClick={addComment}>
                    {saving ? "…" : "Post"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject reason modal */}
      {rejectModal.open && (
        <div className="modal d-block bg-dark bg-opacity-25" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reject approval</h5>
                <button type="button" className="btn-close" onClick={() => setRejectModal({ open: false, id: null, reason: "" })} aria-label="Close" />
              </div>
              <div className="modal-body">
                <label className="form-label">Reason (required)</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal((m) => ({ ...m, reason: e.target.value }))}
                  placeholder="Provide a reason for rejection"
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setRejectModal({ open: false, id: null, reason: "" })}>Cancel</button>
                <button type="button" className="btn btn-danger" disabled={saving || !rejectModal.reason.trim()} onClick={rejectRequest}>
                  {saving ? "Rejecting…" : "Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border radius-12 shadow-sm">
        <div className="card-body p-24">
          <p className="text-secondary small mb-0">
            You are working as part of <strong>{teamName}</strong>. Workspace role: <strong>{workspaceMe?.role ?? "—"}</strong>.
            {workspaceMe?.role === "OWNER" && " You have full access to all tasks, alerts, and approvals."}
            {workspaceMe?.role === "MANAGER" && " You see branch-scoped tasks and can create/assign within your branch(es)."}
            {workspaceMe?.role === "STAFF" && " You see only tasks assigned to you and can update status and add notes."}
          </p>
        </div>
      </div>
    </div>
  );
}
