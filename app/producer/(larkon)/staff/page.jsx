"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { OverlayTrigger, Tooltip, Offcanvas, Modal, Button } from "react-bootstrap";
import { useToast } from "@/src/hooks/useToast";
import {
  producerStaffInviteCreate,
  producerStaffList,
  producerStaffInvitesList,
  producerStaffInviteCancel,
  producerStaffInviteResend,
  producerStaffRemove,
  producerStaffUpdateRole,
  producerStaffUpdateStatus,
  producerMe,
  producerPendingInvites,
  producerStaffInvitesAccept,
  producerStaffInvitesDecline,
  producerAuditLogsList,
  getProducerErrorMessage,
  canProducerStaff,
  PRODUCER_STAFF_PERMISSIONS,
} from "../../_lib/producerApi";
import { normalizeApiError, useApiErrorPopup } from "../../_lib/apiErrorPopup";
import { getPermissionsForRole } from "../../_lib/producerPermissions";
import ProducerPageShell from "../../_components/ProducerPageShell";
import ProducerSectionCard from "../../_components/ProducerSectionCard";
import InviteStaffModal from "./components/InviteStaffModal";
import ConfirmRoleModal from "./components/ConfirmRoleModal";
import ConfirmStatusModal from "./components/ConfirmStatusModal";
import ConfirmRemoveModal from "./components/ConfirmRemoveModal";
import PermissionsModal from "./components/PermissionsModal";
import styles from "../../_styles/producer.module.css";

const ROLES = [
  { key: "PRODUCER_OWNER", label: "Owner", description: "Full access" },
  { key: "PRODUCER_MANAGER", label: "Manager", description: "Manage products, batches, codes" },
  { key: "PRODUCER_STAFF", label: "Staff", description: "Generate and export codes" },
  { key: "PRODUCER_AUDITOR", label: "Auditor", description: "View-only with analytics" },
  { key: "PRODUCER_VIEWER", label: "Viewer", description: "Basic view access" },
];

function getStatusBadgeClass(status) {
  if (!status) return "bg-secondary";
  switch (status) {
    case "ACTIVE":
      return "bg-success text-white";
    case "SUSPENDED":
      return "bg-warning text-dark";
    case "DISABLED":
      return "bg-danger text-white";
    case "INVITED":
      return "bg-info text-white";
    case "REMOVED":
      return "bg-secondary text-white";
    default:
      return "bg-secondary";
  }
}

function getInitials(member) {
  const name = member?.user?.profile?.displayName || member?.user?.displayName || "";
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const email = member?.user?.auth?.email || member?.user?.email || "";
  if (email) return email.slice(0, 2).toUpperCase();
  return "—";
}

function parseAuditEntityId(entityId) {
  if (entityId == null || entityId === "") return null;
  if (typeof entityId === "object") return entityId;
  const s = String(entityId);
  try {
    const parsed = JSON.parse(s);
    if (parsed && (parsed.old !== undefined || parsed.new !== undefined || parsed.oldValue !== undefined)) return parsed;
  } catch (_) {}
  if (s.includes("→") || s.includes("->")) {
    const [oldVal, newVal] = s.split(/→|->/).map((x) => x.trim());
    if (oldVal || newVal) return { old: oldVal, new: newVal };
  }
  return null;
}

const STAFF_AUDIT_ACTIONS = /staff|role|status|invite|remove|suspend|disable|enable/i;

export default function ProducerStaffPage() {
  const searchParams = useSearchParams();
  const toast = useToast();
  const { showApiErrorPopup, ApiErrorModal } = useApiErrorPopup();
  const [me, setMe] = useState(null);
  const [meLoading, setMeLoading] = useState(true);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", phone: "", roleKey: "PRODUCER_VIEWER", message: "" });
  const [roleTarget, setRoleTarget] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [permissionsTarget, setPermissionsTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("members");
  const [inviteResult, setInviteResult] = useState(null);
  const [invites, setInvites] = useState([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [pendingInvites, setPendingInvites] = useState([]);
  const [pendingAccepting, setPendingAccepting] = useState(null);
  const [pendingDeclining, setPendingDeclining] = useState(null);
  const [resendingInviteId, setResendingInviteId] = useState(null);
  const [resendLink, setResendLink] = useState(null);
  const [inviteLinkByInviteId, setInviteLinkByInviteId] = useState({});
  const [includeRemoved, setIncludeRemoved] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [inviteStatusFilter, setInviteStatusFilter] = useState("");
  const [drawerMember, setDrawerMember] = useState(null);
  const [drawerAuditLogs, setDrawerAuditLogs] = useState([]);
  const [drawerAuditLoading, setDrawerAuditLoading] = useState(false);
  const [drawerAuditOnlyStaff, setDrawerAuditOnlyStaff] = useState(false);
  const [cancelInviteTarget, setCancelInviteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);

  const canRead = useMemo(() => canProducerStaff(me, PRODUCER_STAFF_PERMISSIONS.READ), [me]);
  const canInvite = useMemo(() => canProducerStaff(me, PRODUCER_STAFF_PERMISSIONS.INVITE), [me]);
  const canInviteResend = useMemo(() => canProducerStaff(me, PRODUCER_STAFF_PERMISSIONS.INVITE_RESEND), [me]);
  const canUpdateRole = useMemo(() => canProducerStaff(me, PRODUCER_STAFF_PERMISSIONS.UPDATE_ROLE), [me]);
  const canUpdateStatus = useMemo(() => canProducerStaff(me, PRODUCER_STAFF_PERMISSIONS.UPDATE_STATUS), [me]);

  function handleApiError(err) {
    if (typeof window !== "undefined" && err?.status === 401) {
      window.location.href = "/producer/login";
      return true;
    }
    if (err?.status === 403) {
      showApiErrorPopup(normalizeApiError(err));
      return true;
    }
    return false;
  }

  useEffect(() => {
    producerMe(true)
      .then((data) => {
        setMe(data || null);
        if (data?.user?.id) setCurrentUserId(data.user.id);
        else if (data?.id) setCurrentUserId(data.id);
      })
      .catch(() => setMe(null))
      .finally(() => setMeLoading(false));
  }, []);

  const loadStaff = useCallback(async (includeRemovedOverride) => {
    try {
      setLoading(true);
      const inc = includeRemovedOverride !== undefined ? includeRemovedOverride : includeRemoved;
      const res = await producerStaffList({ includeRemoved: inc });
      setStaff(Array.isArray(res) ? res : []);
    } catch (err) {
      if (handleApiError(err)) return;
      showApiErrorPopup(normalizeApiError(err));
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [includeRemoved]);

  useEffect(() => {
    if (!meLoading && canRead) loadStaff();
    else if (!meLoading) setLoading(false);
  }, [meLoading, canRead, loadStaff]);

  useEffect(() => {
    if (activeTab === "invites") loadInvites();
  }, [activeTab]);

  useEffect(() => {
    producerPendingInvites()
      .then((list) => setPendingInvites(Array.isArray(list) ? list : []))
      .catch(() => setPendingInvites([]));
  }, [staff]);

  async function loadInvites() {
    try {
      setInvitesLoading(true);
      const res = await producerStaffInvitesList();
      setInvites(Array.isArray(res) ? res : []);
    } catch (err) {
      if (handleApiError(err)) return;
      showApiErrorPopup(normalizeApiError(err));
      setInvites([]);
    } finally {
      setInvitesLoading(false);
    }
  }

  async function handleResendInvite(inv) {
    try {
      setResendingInviteId(inv.id);
      setResendLink(null);
      const data = await producerStaffInviteResend(inv.id);
      toast.success("Invite email sent.");
      if (data?.inviteLink) {
        setInviteLinkByInviteId((prev) => ({ ...prev, [inv.id]: data.inviteLink }));
        setResendLink({ inviteId: inv.id, link: data.inviteLink, expiresAt: data.invite?.expiresAt ?? data.expiresAt });
      }
      loadInvites();
    } catch (err) {
      if (handleApiError(err)) return;
      showApiErrorPopup(normalizeApiError(err));
    } finally {
      setResendingInviteId(null);
    }
  }

  const loadDrawerAudit = useCallback(async (userId) => {
    if (!userId) return;
    setDrawerAuditLoading(true);
    try {
      const res = await producerAuditLogsList({ actorId: String(userId), limit: 20 });
      setDrawerAuditLogs(Array.isArray(res) ? res : []);
    } catch {
      setDrawerAuditLogs([]);
    } finally {
      setDrawerAuditLoading(false);
    }
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = [...staff];
    const q = (search || "").trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const name = (m.user?.profile?.displayName || m.user?.displayName || "").toLowerCase();
        const email = (m.user?.auth?.email || m.user?.email || "").toLowerCase();
        const phone = (m.user?.auth?.phone || m.user?.phone || "").toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      });
    }
    if (filterStatus) list = list.filter((m) => (m.status || "ACTIVE") === filterStatus);
    if (filterRole) list = list.filter((m) => m.role?.key === filterRole);
    list.sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime();
      const tb = new Date(b.createdAt || 0).getTime();
      return sortNewestFirst ? tb - ta : ta - tb;
    });
    return list;
  }, [staff, search, filterStatus, filterRole, sortNewestFirst]);

  const highlightParam = searchParams.get("highlight");
  useEffect(() => {
    if (!highlightParam || !staff.length) return;
    const id = String(highlightParam).trim();
    if (!id) return;
    const el = document.querySelector(`[data-user-id="${id}"]`) || document.querySelector(`[data-member-id="${id}"]`) || document.querySelector(`[data-invite-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      el.classList.add("notification-highlight-row");
      const t = setTimeout(() => el.classList.remove("notification-highlight-row"), 2500);
      return () => clearTimeout(t);
    }
  }, [highlightParam, staff.length]);

  const stats = useMemo(() => {
    const total = staff.length;
    const active = staff.filter((m) => (m.status || "ACTIVE") === "ACTIVE").length;
    const disabled = staff.filter((m) => m.status === "DISABLED" || m.status === "REMOVED").length;
    const pendingInvitesCount = invites.filter((inv) => (inv.status === "PENDING" || inv.status === "SENT") && (!inv.expiresAt || new Date(inv.expiresAt) > new Date())).length;
    return { total, active, disabled, pendingInvitesCount };
  }, [staff, invites]);

  async function handleInvite() {
    if (!(formData.email || "").trim() && !(formData.phone || "").trim()) {
      toast.error("Email or phone is required");
      return;
    }
    try {
      setInviteLoading(true);
      setInviteResult(null);
      const data = await producerStaffInviteCreate(formData);
      if (data?.mode === "REGISTERED") {
        toast.success("Invitation sent to their notifications.");
        setShowInviteModal(false);
        setFormData({ email: "", phone: "", roleKey: "PRODUCER_VIEWER", message: "" });
      } else {
        setInviteResult(data || {});
        if (data?.inviteId && data?.inviteLink) {
          setInviteLinkByInviteId((prev) => ({ ...prev, [data.inviteId]: data.inviteLink }));
        }
        toast.success("Invitation created. Share the link with the invitee if they don't have an account yet.");
      }
      await loadStaff();
      if (activeTab === "invites") loadInvites();
    } catch (err) {
      if (handleApiError(err)) return;
      showApiErrorPopup(normalizeApiError(err));
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleCancelInvite(inviteId) {
    try {
      setActionLoading(true);
      await producerStaffInviteCancel(inviteId);
      toast.success("Invitation cancelled");
      setCancelInviteTarget(null);
      loadInvites();
    } catch (err) {
      if (handleApiError(err)) return;
      showApiErrorPopup(normalizeApiError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAcceptPending(invite) {
    try {
      setPendingAccepting(invite.id);
      await producerStaffInvitesAccept({ inviteId: invite.id });
      toast.success(`You joined ${invite.producerOrg?.name || "the producer"} as staff.`);
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
      await loadStaff();
    } catch (err) {
      if (handleApiError(err)) return;
      showApiErrorPopup(normalizeApiError(err));
    } finally {
      setPendingAccepting(null);
    }
  }

  async function handleDeclinePending(invite) {
    try {
      setPendingDeclining(invite.id);
      await producerStaffInvitesDecline({ inviteId: invite.id });
      toast.success("Invitation declined.");
      setPendingInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } catch (err) {
      if (handleApiError(err)) return;
      showApiErrorPopup(normalizeApiError(err));
    } finally {
      setPendingDeclining(null);
    }
  }

  async function handleConfirmRole() {
    if (!roleTarget || !roleTarget.newRoleKey) return;
    try {
      setActionLoading(true);
      await producerStaffUpdateRole(roleTarget.id, { roleKey: roleTarget.newRoleKey });
      toast.success("Role updated");
      setRoleTarget(null);
      if (drawerMember?.id === roleTarget?.id) setDrawerMember(null);
      await loadStaff();
    } catch (err) {
      if (handleApiError(err)) return;
      showApiErrorPopup(normalizeApiError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmStatus() {
    if (!statusTarget || !statusTarget.status) return;
    try {
      setActionLoading(true);
      await producerStaffUpdateStatus(statusTarget.id, { status: statusTarget.status });
      const statusMsg = statusTarget.status === "SUSPENDED" ? "Staff suspended" : statusTarget.status === "DISABLED" ? "Staff disabled" : "Staff activated";
      toast.success(statusMsg);
      setStatusTarget(null);
      if (drawerMember?.id === statusTarget?.id) setDrawerMember(null);
      await loadStaff();
    } catch (err) {
      if (handleApiError(err)) return;
      showApiErrorPopup(normalizeApiError(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleConfirmRemove() {
    if (!removeTarget || removeTarget.userId === currentUserId) return;
    try {
      setActionLoading(true);
      await producerStaffRemove(removeTarget.id);
      toast.success("Staff member removed");
      setRemoveTarget(null);
      if (drawerMember?.id === removeTarget?.id) setDrawerMember(null);
      await loadStaff();
    } catch (err) {
      if (handleApiError(err)) return;
      showApiErrorPopup(normalizeApiError(err));
    } finally {
      setActionLoading(false);
    }
  }

  const bulkSelectedMembers = useMemo(() => filteredAndSorted.filter((m) => selectedIds.has(m.id)), [filteredAndSorted, selectedIds]);
  const bulkSelectedExcludingSelf = useMemo(() => bulkSelectedMembers.filter((m) => m.userId !== currentUserId && m.user?.id !== currentUserId), [bulkSelectedMembers, currentUserId]);

  async function handleBulkConfirm() {
    if (!bulkAction || bulkAction.count === 0) return;
    const list = bulkAction.type === "remove" || bulkAction.type === "disable" ? bulkSelectedExcludingSelf : bulkSelectedMembers;
    if (list.length === 0) {
      setBulkAction(null);
      toast.warning("No eligible members selected (e.g. you cannot disable or remove yourself).");
      return;
    }
    setActionLoading(true);
    const failures = [];
    let success = 0;
    for (const m of list) {
      try {
        if (bulkAction.type === "disable") await producerStaffUpdateStatus(m.id, { status: "DISABLED" });
        else if (bulkAction.type === "enable") await producerStaffUpdateStatus(m.id, { status: "ACTIVE" });
        else if (bulkAction.type === "remove") await producerStaffRemove(m.id);
        success++;
      } catch (err) {
        const name = m.user?.profile?.displayName || m.user?.displayName || m.user?.auth?.email || m.id;
        failures.push({ id: m.id, name: String(name), error: getProducerErrorMessage(err) || err?.message || "Failed" });
      }
    }
    setActionLoading(false);
    setBulkAction(null);
    setBulkResult({ success, failures });
    setSelectedIds(new Set());
    if (drawerMember && list.some((m) => m.id === drawerMember.id)) setDrawerMember(null);
    await loadStaff();
    if (success) toast.success(`${success} member(s) updated.`);
    if (failures.length) showApiErrorPopup({ message: `${failures.length} action(s) failed. Check the list below for details.` });
  }

  function openRoleConfirm(member, newRoleKey) {
    if (newRoleKey && newRoleKey !== member.role?.key) {
      setRoleTarget({ ...member, newRoleKey });
    }
  }

  // Access Restricted: no producer.staff.read (and no producer.org.read fallback)
  if (!meLoading && !canRead) {
    return (
      <ProducerPageShell
        title="Staff & Access Control"
        breadcrumbs={[{ label: "Producer", href: "/producer" }, { label: "Staff" }]}
      >
        <div className="card border-0 shadow-sm radius-12">
          <div className="card-body text-center py-5">
            <Icon icon="solar:lock-keyhole-minimalistic-outline" className="text-muted" style={{ fontSize: "3rem" }} />
            <h3 className="h5 mt-3">Access Restricted</h3>
            <p className="text-muted mb-0">You don&apos;t have permission to view this page. Ask the owner to grant Staff permissions.</p>
          </div>
        </div>
      </ProducerPageShell>
    );
  }

  // Loading skeleton
  if (meLoading || (loading && staff.length === 0)) {
    return (
      <ProducerPageShell title="Staff & Access Control" breadcrumbs={[{ label: "Producer", href: "/producer" }, { label: "Staff" }]}>
        <div className="row g-3 mb-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="col-sm-6 col-md-3">
              <div className="card radius-12">
                <div className="card-body py-3">
                  <div className="placeholder-glow">
                    <span className="placeholder col-6" /> <span className="placeholder col-4" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="card radius-12">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-bordered table-sm align-middle">
                <thead><tr><th>Staff</th><th>Contact</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i}><td colSpan={5}><span className="placeholder col-12" /></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ProducerPageShell>
    );
  }

  return (
    <>
      <ApiErrorModal />
      <ProducerPageShell
        title="Staff & Access Control"
        breadcrumbs={[{ label: "Producer", href: "/producer" }, { label: "Staff" }]}
        actions={
          canInvite ? (
            <Button variant="primary" size="sm" className="radius-12" onClick={() => setShowInviteModal(true)}>
              <Icon icon="solar:user-plus-outline" className="me-1" />
              Invite Staff
            </Button>
          ) : null
        }
      >
        <p className="text-muted small mb-3">Manage team members and invitations. Role and status changes require owner or Staff permissions.</p>

      {/* KPI cards */}
      <div className="row g-2 mb-4">
        <div className="col-6 col-md-3">
          <div className="card radius-12 h-100 border">
            <div className="card-body py-3">
              <div className="text-muted small">Total</div>
              <div className="h4 mb-0">{stats.total}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card radius-12 h-100 border">
            <div className="card-body py-3">
              <div className="text-muted small">Active</div>
              <div className="h4 mb-0 text-success">{stats.active}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card radius-12 h-100 border">
            <div className="card-body py-3">
              <div className="text-muted small">Pending Invites</div>
              <div className="h4 mb-0 text-info">{stats.pendingInvitesCount}</div>
            </div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="card radius-12 h-100 border">
            <div className="card-body py-3">
              <div className="text-muted small">Disabled</div>
              <div className="h4 mb-0 text-secondary">{stats.disabled}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending invites banner (invitee view) */}
      {pendingInvites.length > 0 && (
        <div className="alert alert-info mb-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
          <span>You have been invited as staff to {pendingInvites.length === 1 ? pendingInvites[0].producerOrg?.name : "producer organizations"}.</span>
          <div className="d-flex flex-wrap gap-2">
            {pendingInvites.map((inv) => (
              <span key={inv.id} className="d-inline-flex align-items-center gap-2">
                <strong>{inv.producerOrg?.name}</strong> ({inv.role?.label})
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  disabled={pendingAccepting !== null}
                  onClick={() => handleAcceptPending(inv)}
                >
                  {pendingAccepting === inv.id ? "Accepting…" : "Accept"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  disabled={pendingDeclining !== null}
                  onClick={() => handleDeclinePending(inv)}
                >
                  {pendingDeclining === inv.id ? "Declining…" : "Decline"}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Members | Invites */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === "members" ? "active" : ""}`}
            onClick={() => setActiveTab("members")}
          >
            Members
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            className={`nav-link ${activeTab === "invites" ? "active" : ""}`}
            onClick={() => setActiveTab("invites")}
          >
            Invites
          </button>
        </li>
      </ul>

      {activeTab === "invites" && (
        <>
          {!canInvite && (
            <div className="alert alert-info mb-3 radius-12">
              You have read-only access to invitations. You can view but not send, resend, or revoke.
            </div>
          )}
          <ProducerSectionCard
          title="Invitations"
          right={
            invites.length > 0 && (
              <select
                className="form-select form-select-sm radius-12"
                style={{ width: "auto" }}
                value={inviteStatusFilter}
                onChange={(e) => setInviteStatusFilter(e.target.value)}
              >
                <option value="">All statuses</option>
                <option value="PENDING">Pending</option>
                <option value="SENT">Sent</option>
                <option value="ACCEPTED">Accepted</option>
                <option value="EXPIRED">Expired</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            )
          }
          className="mb-4"
        >
          {invitesLoading ? (
            <div className="text-center py-4"><span className="spinner-border spinner-border-sm" /> Loading…</div>
          ) : invites.length === 0 ? (
            <div className="text-center py-4 text-muted">No invitations yet. Use &quot;Invite Staff&quot; to send invitations.</div>
          ) : (
            <>
              {resendLink && (
                <div className="alert alert-info mb-3 radius-12">
                  <strong>New invite link (copy and share):</strong>
                  {resendLink.expiresAt && (
                    <p className="small text-muted mb-1 mt-1">Expires in {Math.max(0, Math.ceil((new Date(resendLink.expiresAt) - new Date()) / (24 * 60 * 60 * 1000)))} days.</p>
                  )}
                  <div className="input-group mt-1">
                    <input type="text" className="form-control form-control-sm" readOnly value={resendLink.link} />
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => { navigator.clipboard?.writeText(resendLink.link); toast.success("Link copied"); }}
                    >
                      Copy link
                    </button>
                  </div>
                  <button type="button" className="btn btn-sm btn-link p-0 mt-1" onClick={() => setResendLink(null)}>Dismiss</button>
                </div>
              )}
              <div className="table-responsive">
                <table className="table table-bordered table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Invitee</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th className="text-nowrap">Delivery</th>
                      <th>Sent</th>
                      <th>Expires</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invites
                      .filter((inv) => {
                        if (!inviteStatusFilter) return true;
                        const isExpired = inv.status === "EXPIRED" || (inv.expiresAt && new Date(inv.expiresAt) < new Date());
                        const status = isExpired ? "EXPIRED" : inv.status;
                        return status === inviteStatusFilter;
                      })
                      .map((inv) => (
                      <tr key={inv.id} data-invite-id={inv.id}>
                        <td>{inv.email || inv.phone || "—"}</td>
                        <td>{inv.role?.label || inv.role?.key || "—"}</td>
                        <td>
                          {(() => {
                            const isExpired = inv.status === "EXPIRED" || (inv.expiresAt && new Date(inv.expiresAt) < new Date());
                            const badgeClass = isExpired ? "bg-warning text-dark" :
                              inv.status === "PENDING" || inv.status === "SENT" ? "bg-info" :
                              inv.status === "ACCEPTED" ? "bg-success" :
                              inv.status === "DECLINED" || inv.status === "CANCELLED" ? "bg-secondary" : "bg-secondary";
                            return (
                              <span className={`badge ${badgeClass} radius-12`}>
                                {isExpired ? "Expired" : inv.status}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="small">
                          {(() => {
                            const delivery = inv.deliveries?.[0];
                            const status = delivery?.status;
                            if (!status) return "—";
                            const cls = status === "SENT" ? "bg-success" : status === "FAILED" || status === "SKIPPED" ? "bg-warning text-dark" : "bg-secondary";
                            const label = status === "QUEUED" ? "Pending" : status;
                            return (
                              <OverlayTrigger
                                placement="top"
                                overlay={
                                  <Tooltip>
                                    {label}
                                    {delivery?.lastError ? ` — ${delivery.lastError}` : ""}
                                  </Tooltip>
                                }
                              >
                                <span className={`badge ${cls} radius-12`}>{label}</span>
                              </OverlayTrigger>
                            );
                          })()}
                        </td>
                        <td className="small text-nowrap">{inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—"}</td>
                        <td className="small text-nowrap">{inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString() : "—"}</td>
                        <td>
                          {(() => {
                            const isPendingOrSent = inv.status === "PENDING" || inv.status === "SENT";
                            const isExpired = inv.status === "EXPIRED" || (inv.expiresAt && new Date(inv.expiresAt) < new Date());
                            const notExpired = !inv.expiresAt || new Date(inv.expiresAt) > new Date();
                            const canResend = (isPendingOrSent && notExpired) || isExpired;
                            const canCancel = isPendingOrSent && notExpired;
                            if (!canResend && !canCancel) return null;
                            const resendBtn = canResend && (
                              canInviteResend ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-primary me-1"
                                  disabled={actionLoading || resendingInviteId !== null}
                                  onClick={() => handleResendInvite(inv)}
                                >
                                  {resendingInviteId === inv.id ? "Sending…" : "Resend"}
                                </button>
                              ) : (
                                <OverlayTrigger placement="top" overlay={<Tooltip>You don&apos;t have permission to resend invites.</Tooltip>}>
                                  <span className="d-inline-block">
                                    <button type="button" className="btn btn-sm btn-outline-secondary me-1" disabled>Resend</button>
                                  </span>
                                </OverlayTrigger>
                              )
                            );
                            const linkToCopy = inviteLinkByInviteId[inv.id] ?? (resendLink?.inviteId === inv.id ? resendLink?.link : null);
                            const copyLinkBtn = canResend && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary me-1"
                                onClick={() => {
                                  if (linkToCopy) {
                                    navigator.clipboard?.writeText(linkToCopy);
                                    toast.success("Invite link copied");
                                  } else {
                                    toast.info("Resend the invite to get a copyable link.");
                                  }
                                }}
                                title={linkToCopy ? "Copy invite link" : "Resend to get link"}
                              >
                                Copy link
                              </button>
                            );
                            const cancelBtn = canCancel && (
                              canInvite ? (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  disabled={actionLoading}
                                  onClick={() => setCancelInviteTarget(inv)}
                                >
                                  Revoke
                                </button>
                              ) : (
                                <OverlayTrigger placement="top" overlay={<Tooltip>You don&apos;t have permission to revoke invites.</Tooltip>}>
                                  <span className="d-inline-block">
                                    <button type="button" className="btn btn-sm btn-outline-secondary" disabled>Revoke</button>
                                  </span>
                                </OverlayTrigger>
                              )
                            );
                            return <>{resendBtn}{copyLinkBtn}{cancelBtn}</>;
                          })()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </ProducerSectionCard>
        </>
      )}

      {activeTab === "members" && (
        <>
          <ProducerSectionCard
            title="Filters"
            right={
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary radius-12"
                onClick={() => setFilterOpen((o) => !o)}
                aria-expanded={filterOpen}
              >
                <Icon icon={filterOpen ? "solar:alt-arrow-up-outline" : "solar:filter-outline"} className="me-1" />
                {filterOpen ? "Hide" : "Show"}
              </button>
            }
            className="mb-3"
          >
            {filterOpen && (
              <div className="row g-2 mb-2">
                <div className="col-md-2">
                  <label className="form-label small mb-0">Search</label>
                  <input
                    type="search"
                    className="form-control form-control-sm radius-12"
                    placeholder="Name, email, phone"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label small mb-0">Status</label>
                  <select
                    className="form-select form-select-sm radius-12"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="DISABLED">Disabled</option>
                    <option value="INVITED">Invited</option>
                    <option value="REMOVED">Removed</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label small mb-0">Role</label>
                  <select
                    className="form-select form-select-sm radius-12"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <option value="">All roles</option>
                    {ROLES.map((r) => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary radius-12"
                    onClick={() => setSortNewestFirst(!sortNewestFirst)}
                  >
                    {sortNewestFirst ? "Newest first" : "Oldest first"}
                  </button>
                </div>
                <div className="col-md-2 d-flex align-items-end">
                  <label className="d-flex align-items-center gap-1">
                    <input
                      type="checkbox"
                      checked={includeRemoved}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setIncludeRemoved(v);
                        loadStaff(v);
                      }}
                    />
                    <span className="small">Include removed</span>
                  </label>
                </div>
              </div>
            )}
          </ProducerSectionCard>

          <div className="card radius-12">
            <div className="card-body">
              {filteredAndSorted.length === 0 ? (
                <div className="text-center py-5">
                  <p className="text-secondary mb-3">{staff.length === 0 ? "No staff yet." : "No staff match your filters."}</p>
                  {staff.length === 0 && canInvite && (
                    <Button variant="primary" className="radius-12" onClick={() => setShowInviteModal(true)}>Invite Staff</Button>
                  )}
                </div>
              ) : (
                <>
                  {selectedIds.size > 0 && (
                    <div className="d-flex align-items-center flex-wrap gap-2 mb-3 p-2 rounded bg-light radius-12">
                      <span className="small fw-semibold">{selectedIds.size} selected</span>
                      {canUpdateStatus && (
                        <>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-warning"
                            onClick={() => setBulkAction({ type: "disable", count: bulkSelectedExcludingSelf.length })}
                          >
                            Disable
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-success"
                            onClick={() => setBulkAction({ type: "enable", count: bulkSelectedMembers.length })}
                          >
                            Enable
                          </button>
                        </>
                      )}
                      {!canUpdateStatus && (
                        <OverlayTrigger placement="top" overlay={<Tooltip>{PERMISSION_DENIED_MESSAGE}</Tooltip>}>
                          <span className="d-inline-block">
                            <button type="button" className="btn btn-sm btn-outline-secondary" disabled>Disable / Enable</button>
                          </span>
                        </OverlayTrigger>
                      )}
                      {canInvite ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => setBulkAction({ type: "remove", count: bulkSelectedExcludingSelf.length })}
                        >
                          Remove
                        </button>
                      ) : (
                        <OverlayTrigger placement="top" overlay={<Tooltip>{PERMISSION_DENIED_MESSAGE}</Tooltip>}>
                          <span className="d-inline-block">
                            <button type="button" className="btn btn-sm btn-outline-secondary" disabled>Remove</button>
                          </span>
                        </OverlayTrigger>
                      )}
                      <button type="button" className="btn btn-sm btn-link" onClick={() => setSelectedIds(new Set())}>
                        Clear selection
                      </button>
                    </div>
                  )}
                  <div className="table-responsive">
                  <table className="table table-bordered table-sm align-middle">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>
                          <input
                            type="checkbox"
                            checked={filteredAndSorted.length > 0 && filteredAndSorted.every((m) => selectedIds.has(m.id))}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedIds(new Set(filteredAndSorted.map((m) => m.id)));
                              else setSelectedIds(new Set());
                            }}
                            onClick={(ev) => ev.stopPropagation()}
                            aria-label="Select all"
                          />
                        </th>
                        <th>Staff</th>
                        <th>Email / Phone</th>
                        <th className={styles.w220}>Role</th>
                        <th>Status</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSorted.map((member) => (
                        <tr
                          key={member.id}
                          data-member-id={member.id}
                          data-user-id={member.userId ?? member.user?.id}
                          role="button"
                          tabIndex={0}
                          className={drawerMember?.id === member.id ? "table-active" : ""}
                          onClick={() => {
                            setDrawerMember(member);
                            loadDrawerAudit(member.userId);
                          }}
                          onKeyDown={(e) => e.key === "Enter" && (setDrawerMember(member), loadDrawerAudit(member.userId))}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(member.id)}
                              onChange={(e) => {
                                e.stopPropagation();
                                setSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(member.id)) next.delete(member.id);
                                  else next.add(member.id);
                                  return next;
                                });
                              }}
                              aria-label={`Select ${member.user?.profile?.displayName || member.id}`}
                            />
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <span className="rounded-circle bg-light d-inline-flex align-items-center justify-content-center text-muted" style={{ width: 32, height: 32, fontSize: "0.75rem" }}>
                                {getInitials(member)}
                              </span>
                              <span>{member.user?.profile?.displayName || member.user?.displayName || "N/A"}</span>
                            </div>
                          </td>
                          <td>{member.user?.auth?.email || member.user?.auth?.phone || member.user?.email || member.user?.phone || "—"}</td>
                          <td onClick={(e) => e.stopPropagation()}>
                            {canUpdateRole ? (
                              <select
                                className="form-select form-select-sm"
                                value={member.role?.key}
                                onChange={(e) => openRoleConfirm(member, e.target.value)}
                              >
                                {ROLES.map((role) => (
                                  <option key={role.key} value={role.key}>{role.label}</option>
                                ))}
                              </select>
                            ) : (
                              <span className="small">{member.role?.label || member.role?.key || "—"}</span>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadgeClass(member.status)} radius-12`}>
                              {member.status || "ACTIVE"}
                            </span>
                          </td>
                          <td className="small text-nowrap">
                            {member.createdAt ? new Date(member.createdAt).toLocaleDateString() : "—"}
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <div className="d-flex flex-wrap gap-1">
                              <button type="button" className="btn btn-sm btn-outline-secondary radius-12" onClick={(e) => { e.stopPropagation(); setPermissionsTarget(member); }}>
                                View permissions
                              </button>
                              {(() => {
                              const isSelf = member.userId === currentUserId || member.user?.id === currentUserId;
                              return (
                                <>
                                  {(member.status === "ACTIVE" || member.status === "SUSPENDED") && (
                                    canUpdateStatus && !isSelf ? (
                                      <>
                                        <button type="button" className="btn btn-sm btn-outline-warning radius-12" onClick={(e) => { e.stopPropagation(); setStatusTarget({ ...member, status: member.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }); }}>
                                          {member.status === "ACTIVE" ? "Suspend" : "Activate"}
                                        </button>
                                        <button type="button" className="btn btn-sm btn-outline-danger radius-12" onClick={(e) => { e.stopPropagation(); setStatusTarget({ ...member, status: "DISABLED" }); }}>
                                          Disable
                                        </button>
                                      </>
                                    ) : canUpdateStatus && isSelf ? (
                                      <OverlayTrigger placement="top" overlay={<Tooltip>You cannot suspend or disable yourself.</Tooltip>}>
                                        <span className="d-inline-block">
                                          <button type="button" className="btn btn-sm btn-outline-secondary radius-12" disabled>Suspend / Disable</button>
                                        </span>
                                      </OverlayTrigger>
                                    ) : (
                                      <OverlayTrigger placement="top" overlay={<Tooltip>{PERMISSION_DENIED_MESSAGE}</Tooltip>}>
                                        <span className="d-inline-block">
                                          <button type="button" className="btn btn-sm btn-outline-secondary radius-12" disabled>Suspend / Disable</button>
                                        </span>
                                      </OverlayTrigger>
                                    )
                                  )}
                                  {member.status === "DISABLED" && (
                                    canUpdateStatus ? (
                                      <button type="button" className="btn btn-sm btn-outline-success radius-12" onClick={(e) => { e.stopPropagation(); setStatusTarget({ ...member, status: "ACTIVE" }); }}>
                                        Enable
                                      </button>
                                    ) : (
                                      <OverlayTrigger placement="top" overlay={<Tooltip>{PERMISSION_DENIED_MESSAGE}</Tooltip>}>
                                        <span className="d-inline-block">
                                          <button type="button" className="btn btn-sm btn-outline-secondary radius-12" disabled>Enable</button>
                                        </span>
                                      </OverlayTrigger>
                                    )
                                  )}
                                  {!isSelf && canInvite ? (
                                    <button type="button" className="btn btn-sm btn-outline-danger radius-12" onClick={(e) => { e.stopPropagation(); setRemoveTarget(member); }}>
                                      Remove
                                    </button>
                                  ) : isSelf ? (
                                    <OverlayTrigger placement="top" overlay={<Tooltip>You cannot remove yourself.</Tooltip>}>
                                      <span className="d-inline-block">
                                        <button type="button" className="btn btn-sm btn-outline-secondary radius-12" disabled>Remove</button>
                                      </span>
                                    </OverlayTrigger>
                                  ) : (
                                    <OverlayTrigger placement="top" overlay={<Tooltip>{PERMISSION_DENIED_MESSAGE}</Tooltip>}>
                                      <span className="d-inline-block">
                                        <button type="button" className="btn btn-sm btn-outline-secondary radius-12" disabled>Remove</button>
                                      </span>
                                    </OverlayTrigger>
                                  )}
                                </>
                              );
                            })()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </>
              )}
            </div>
          </div>

          <Offcanvas show={!!drawerMember} onHide={() => setDrawerMember(null)} placement="end" className="border-0 shadow" style={{ width: "min(400px, 100vw)" }}>
            <Offcanvas.Header closeButton>
              <Offcanvas.Title>
                {drawerMember ? (drawerMember.user?.profile?.displayName || drawerMember.user?.displayName || "Staff") : ""}
              </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>
              {drawerMember && (
                <>
                  <div className="mb-3">
                    <div className="small text-muted">Contact</div>
                    <div>{drawerMember.user?.auth?.email || drawerMember.user?.auth?.phone || "—"}</div>
                  </div>
                  <div className="mb-3">
                    <div className="small text-muted">Role</div>
                    {canUpdateRole ? (
                      <select
                        className="form-select form-select-sm"
                        value={drawerMember.role?.key}
                        onChange={(e) => { const v = e.target.value; if (v !== drawerMember.role?.key) setRoleTarget({ ...drawerMember, newRoleKey: v }); }}
                      >
                        {ROLES.map((r) => (
                          <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <div>{drawerMember.role?.label || drawerMember.role?.key || "—"}</div>
                    )}
                  </div>
                  {(() => {
                    const rolePerms = getPermissionsForRole(drawerMember.role);
                    if (rolePerms.length === 0) return null;
                    return (
                      <div className="mb-3">
                        <div className="small text-muted fw-semibold">Role capabilities (Preview)</div>
                        <p className="text-muted mb-1 mt-0" style={{ fontSize: "0.7rem" }}>Frontend-derived.</p>
                        <ul className="list-unstyled small mb-0 ps-2 border-start border-2 border-light">
                          {rolePerms.slice(0, 12).map((p) => (
                            <li key={p} className="py-0">{p}</li>
                          ))}
                          {rolePerms.length > 12 && <li className="py-0 text-muted">+{rolePerms.length - 12} more</li>}
                        </ul>
                      </div>
                    );
                  })()}
                  <div className="mb-3">
                    <div className="small text-muted">Status</div>
                    <span className={`badge ${getStatusBadgeClass(drawerMember.status)} radius-12`}>{drawerMember.status || "ACTIVE"}</span>
                  </div>
                  <div className="mb-3">
                    <div className="small text-muted">Joined</div>
                    <div>{drawerMember.createdAt ? new Date(drawerMember.createdAt).toLocaleDateString() : "—"}</div>
                  </div>
                  <hr />
                  <div className="mb-2 fw-semibold small">Quick actions</div>
                  <div className="d-flex flex-wrap gap-1 mb-3">
                    <Button variant="outline-secondary" size="sm" className="radius-12" onClick={() => setPermissionsTarget(drawerMember)}>View permissions</Button>
                    {(drawerMember.status === "ACTIVE" || drawerMember.status === "SUSPENDED") && canUpdateStatus && (drawerMember.userId !== currentUserId && drawerMember.user?.id !== currentUserId) && (
                      <Button variant="outline-warning" size="sm" className="radius-12" onClick={() => { setStatusTarget({ ...drawerMember, status: drawerMember.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" }); setDrawerMember(null); }}>{drawerMember.status === "ACTIVE" ? "Suspend" : "Activate"}</Button>
                    )}
                    {(drawerMember.status === "ACTIVE" || drawerMember.status === "SUSPENDED") && canUpdateStatus && (drawerMember.userId === currentUserId || drawerMember.user?.id === currentUserId) && (
                      <OverlayTrigger placement="top" overlay={<Tooltip>You cannot suspend or disable yourself.</Tooltip>}>
                        <span className="d-inline-block">
                          <Button variant="outline-secondary" size="sm" className="radius-12" disabled>Suspend / Disable</Button>
                        </span>
                      </OverlayTrigger>
                    )}
                    {drawerMember.status === "DISABLED" && canUpdateStatus && (
                      <Button variant="outline-success" size="sm" className="radius-12" onClick={() => { setStatusTarget({ ...drawerMember, status: "ACTIVE" }); setDrawerMember(null); }}>Enable</Button>
                    )}
                    {canInvite && (drawerMember.userId !== currentUserId && drawerMember.user?.id !== currentUserId) && (
                      <Button variant="outline-danger" size="sm" className="radius-12" onClick={() => { setRemoveTarget(drawerMember); setDrawerMember(null); }}>Remove</Button>
                    )}
                    {canInvite && (drawerMember.userId === currentUserId || drawerMember.user?.id === currentUserId) && (
                      <OverlayTrigger placement="top" overlay={<Tooltip>You cannot remove yourself.</Tooltip>}>
                        <span className="d-inline-block">
                          <Button variant="outline-secondary" size="sm" className="radius-12" disabled>Remove</Button>
                        </span>
                      </OverlayTrigger>
                    )}
                  </div>
                  <hr />
                  <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
                    <span className="fw-semibold small">Recent activity</span>
                    <label className="d-flex align-items-center gap-1 small mb-0">
                      <input
                        type="checkbox"
                        checked={drawerAuditOnlyStaff}
                        onChange={(e) => setDrawerAuditOnlyStaff(e.target.checked)}
                      />
                      Only staff events
                    </label>
                  </div>
                  {drawerAuditLoading ? (
                    <div className="small text-muted">Loading…</div>
                  ) : (() => {
                    const list = drawerAuditOnlyStaff
                      ? drawerAuditLogs.filter((l) => STAFF_AUDIT_ACTIONS.test(l.action || ""))
                      : drawerAuditLogs;
                    if (list.length === 0) return <div className="small text-muted">No recent activity.</div>;
                    return (
                      <ul className="list-unstyled small mb-0">
                        {list.slice(0, 15).map((l) => {
                          const parsed = parseAuditEntityId(l.entityId);
                          const actor = l.actor?.name || l.actor?.displayName || (l.actorId ? `User #${l.actorId}` : null);
                          return (
                            <li key={l.id} className="py-1 border-bottom border-light">
                              <span className="text-muted">{l.createdAt ? new Date(l.createdAt).toLocaleString() : ""}</span>
                              {actor && <> — <span className="text-secondary">{actor}</span></>}
                              <> — {l.action}</>
                              {parsed && (parsed.old != null || parsed.new != null) && (
                                <> <span className="text-muted">({String(parsed.old ?? parsed.oldValue ?? "—")} → {String(parsed.new ?? parsed.newValue ?? "—")})</span></>
                              )}
                              {!parsed && l.entityId && typeof l.entityId === "string" && <span className="text-muted"> #{l.entityId}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}
                </>
              )}
            </Offcanvas.Body>
          </Offcanvas>
        </>
      )}

      <InviteStaffModal
        show={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleInvite}
        loading={inviteLoading}
        roles={ROLES}
        inviteResult={inviteResult}
        onClearInviteResult={() => setInviteResult(null)}
      />
      <ConfirmRoleModal
        show={!!roleTarget}
        member={roleTarget}
        newRoleKey={roleTarget?.newRoleKey}
        roles={ROLES}
        onConfirm={handleConfirmRole}
        onCancel={() => setRoleTarget(null)}
        loading={actionLoading}
      />
      <ConfirmStatusModal
        show={!!statusTarget}
        member={statusTarget}
        status={statusTarget?.status}
        onConfirm={handleConfirmStatus}
        onCancel={() => setStatusTarget(null)}
        loading={actionLoading}
        isSelf={statusTarget && (statusTarget.userId === currentUserId || statusTarget.user?.id === currentUserId)}
      />
      <ConfirmRemoveModal
        show={!!removeTarget}
        member={removeTarget}
        onConfirm={handleConfirmRemove}
        onCancel={() => setRemoveTarget(null)}
        loading={actionLoading}
        isSelf={removeTarget && (removeTarget.userId === currentUserId || removeTarget.user?.id === currentUserId)}
      />
      <PermissionsModal
        show={!!permissionsTarget}
        member={permissionsTarget}
        roles={ROLES}
        onClose={() => setPermissionsTarget(null)}
      />

      <Modal show={!!cancelInviteTarget} onHide={() => setCancelInviteTarget(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Revoke invitation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Cancel the invitation for <strong>{cancelInviteTarget?.email || cancelInviteTarget?.phone || "this invitee"}</strong>? They will no longer be able to join using this link.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setCancelInviteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => cancelInviteTarget && handleCancelInvite(cancelInviteTarget.id)} disabled={actionLoading}>
            {actionLoading ? "Revoking…" : "Revoke"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!bulkAction} onHide={() => setBulkAction(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {bulkAction?.type === "disable" && "Disable members"}
            {bulkAction?.type === "enable" && "Enable members"}
            {bulkAction?.type === "remove" && "Remove members"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bulkAction?.type === "remove" || bulkAction?.type === "disable" ? (
            bulkSelectedExcludingSelf.length === 0 ? (
              <p className="text-warning mb-0">No eligible members selected. You cannot disable or remove yourself.</p>
            ) : (
              <>
                <p className="mb-2">
                  {bulkAction.type === "remove" ? "Remove" : "Disable"} <strong>{bulkSelectedExcludingSelf.length}</strong> member(s)? You cannot remove/disable yourself.
                </p>
                <ul className="small mb-0 ps-3">
                  {bulkSelectedExcludingSelf.slice(0, 5).map((m) => (
                    <li key={m.id}>{m.user?.profile?.displayName || m.user?.displayName || m.user?.auth?.email || m.id}</li>
                  ))}
                  {bulkSelectedExcludingSelf.length > 5 && <li className="text-muted">+{bulkSelectedExcludingSelf.length - 5} more</li>}
                </ul>
              </>
            )
          ) : (
            <>
              <p className="mb-2">Enable <strong>{bulkSelectedMembers.length}</strong> member(s)?</p>
              <ul className="small mb-0 ps-3">
                {bulkSelectedMembers.slice(0, 5).map((m) => (
                  <li key={m.id}>{m.user?.profile?.displayName || m.user?.displayName || m.user?.auth?.email || m.id}</li>
                ))}
                {bulkSelectedMembers.length > 5 && <li className="text-muted">+{bulkSelectedMembers.length - 5} more</li>}
              </ul>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setBulkAction(null)}>Cancel</Button>
          <Button
            variant={bulkAction?.type === "remove" ? "danger" : bulkAction?.type === "disable" ? "warning" : "success"}
            onClick={handleBulkConfirm}
            disabled={actionLoading || ((bulkAction?.type === "remove" || bulkAction?.type === "disable") && bulkSelectedExcludingSelf.length === 0)}
          >
            {actionLoading ? "Updating…" : "Confirm"}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={!!bulkResult} onHide={() => setBulkResult(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Bulk action result</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {bulkResult && (
            <>
              {bulkResult.success > 0 && <p className="text-success mb-2">{bulkResult.success} member(s) updated successfully.</p>}
              {bulkResult.failures?.length > 0 && (
                <>
                  <p className="text-danger mb-1">{bulkResult.failures.length} failed:</p>
                  <ul className="small mb-0 ps-3">
                    {bulkResult.failures.map((f) => (
                      <li key={f.id}><strong>{f.name}</strong>: {f.error}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => setBulkResult(null)}>Done</Button>
        </Modal.Footer>
      </Modal>
    </ProducerPageShell>
    </>
  );
}
