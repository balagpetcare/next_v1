"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import LkFormGroup from "@larkon-ui/components/LkFormGroup";
import LkInput from "@larkon-ui/components/LkInput";
import { ownerGet, ownerPost, ownerPatch } from "@/app/owner/_lib/ownerApi";

const API_W = "/api/v1/workspace";
const TASK_STATUSES = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE"];

export default function StaffWorkspacePage() {
  const [workspaceMe, setWorkspaceMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [commentBody, setCommentBody] = useState("");
  const [saving, setSaving] = useState(false);

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
      if (res?.success && Array.isArray(res.data)) setTasks(res.data);
      else setTasks([]);
    } catch (e) {
      setError(e?.message || "Failed to load tasks");
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      await loadWorkspaceMe();
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [loadWorkspaceMe]);

  useEffect(() => {
    if (!workspaceMe) return;
    loadTasks();
  }, [workspaceMe, loadTasks]);

  useEffect(() => {
    if (!selectedTask) {
      setTaskComments([]);
      return;
    }
    ownerGet(`${API_W}/tasks/${selectedTask.id}/comments`)
      .then((res) => setTaskComments(res?.data ?? []))
      .catch(() => setTaskComments([]));
  }, [selectedTask?.id]);

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
      setTaskComments((prev) => [...prev, res?.data ?? { body: commentBody, createdAt: new Date().toISOString() }]);
      setCommentBody("");
    } catch (e) {
      setError(e?.message || "Comment failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status" />
        </div>
      </div>
    );
  }

  if (!workspaceMe) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-warning">
          No workspace access. You need branch access to see your tasks.
        </div>
        <Link href="/staff/branches" className="btn btn-outline-primary">← Branches</Link>
      </div>
    );
  }

  const tasksByStatus = TASK_STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter((t) => t.status === s);
    return acc;
  }, {});

  return (
    <div className="container-fluid py-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h4 className="mb-0">My Workspace</h4>
          <p className="text-muted small mb-0">Tasks assigned to you. Update status and add work notes.</p>
        </div>
        <Link href="/staff/branches" className="btn btn-outline-secondary btn-sm">← Branches</Link>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible fade show">
          {error}
          <button type="button" className="btn-close" onClick={() => setError("")} aria-label="Close" />
        </div>
      )}

      <div className="row g-3">
        {TASK_STATUSES.map((status) => (
          <div key={status} className="col-12 col-md-6 col-xl-3">
            <div className="card border radius-12 h-100">
              <div className="card-header py-2">
                <h6 className="mb-0">{status.replace("_", " ")}</h6>
              </div>
              <div className="card-body p-2">
                {(tasksByStatus[status] || []).map((t) => (
                  <div
                    key={t.id}
                    className="border rounded p-2 mb-2"
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedTask(t)}
                  >
                    <div className="fw-semibold small text-truncate">{t.title}</div>
                    <span className="badge bg-secondary small">{t.type}</span>
                    <span className="badge bg-dark small ms-1">{t.priority}</span>
                    {t.deadline && (
                      <div className="small text-danger mt-1">Due {new Date(t.deadline).toLocaleDateString()}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

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
                </div>
                <LkFormGroup label="Update status" className="small">
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
                </LkFormGroup>
                <hr />
                <h6>Comments / work notes</h6>
                <div className="mb-3">
                  {taskComments.map((c) => (
                    <div key={c.id} className="border-start border-3 ps-2 mb-2 small">
                      <strong>{c.actor?.profile?.displayName ?? "User"}</strong>
                      <span className="text-muted ms-1"> · {new Date(c.createdAt).toLocaleString()}</span>
                      <div>{c.body}</div>
                    </div>
                  ))}
                </div>
                <div className="d-flex gap-2">
                  <LkInput
                    type="text"
                    size="sm"
                    className="radius-12"
                    placeholder="Add work note…"
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
    </div>
  );
}
