"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ownerClinicItemCategoryTree,
  ownerClinicItemCategoryCreate,
  ownerClinicItemCategoryUpdate,
  ownerClinicItemCategoryDelete,
} from "@/app/owner/_lib/ownerApi";
import PageHeader from "@/app/owner/_components/shared/PageHeader";

type CategoryNode = {
  id: number;
  name: string;
  parentId: number | null;
  domainType: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { items: number };
  children: CategoryNode[];
};

const DOMAIN_OPTIONS = [
  { value: "", label: "Any" },
  { value: "MEDICINE", label: "Medicine" },
  { value: "SURGICAL_CONSUMABLE", label: "Surgical consumable" },
  { value: "DRESSING_SUPPLY", label: "Dressing supply" },
  { value: "CLINIC_SUPPLY", label: "Clinic supply" },
  { value: "INSTRUMENT", label: "Instrument" },
  { value: "IMPLANT", label: "Implant" },
  { value: "SERVICE_SUPPORT", label: "Service support" },
  { value: "PACKAGE_ONLY", label: "Package only" },
];

function flattenTree(nodes: CategoryNode[], acc: CategoryNode[] = []): CategoryNode[] {
  for (const n of nodes) {
    acc.push(n);
    if (n.children?.length) flattenTree(n.children, acc);
  }
  return acc;
}

function CategoryRow({
  node,
  branchId,
  level,
  siblings,
  index,
  onRefresh,
}: {
  node: CategoryNode;
  branchId: string;
  level: number;
  siblings: CategoryNode[];
  index: number;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const hasChildren = node.children?.length > 0;
  const itemCount = node._count?.items ?? 0;

  const handleDelete = async () => {
    setSubmitting(true);
    setError("");
    try {
      await ownerClinicItemCategoryDelete(branchId, String(node.id));
      setDeleteConfirm(false);
      onRefresh();
    } catch (e) {
      setError((e as Error)?.message ?? "Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="d-flex align-items-center py-2 border-bottom border-light"
        style={{ paddingLeft: `${level * 20}px` }}
      >
        <button
          type="button"
          className="btn btn-link btn-sm p-0 me-2 text-secondary"
          style={{ width: 24, visibility: hasChildren ? "visible" : "hidden" }}
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <i className={`ri-arrow-${expanded ? "down" : "right"}-s-line`} />
        </button>
        <span className="flex-grow-1">
          <span className="fw-medium">{node.name}</span>
          {node.domainType && (
            <span className="badge bg-secondary-subtle text-secondary-emphasis ms-2 radius-8">{node.domainType}</span>
          )}
          {itemCount > 0 && <span className="text-muted small ms-2">({itemCount} items)</span>}
        </span>
        <div className="btn-group btn-group-sm">
          <button type="button" className="btn btn-outline-primary radius-8" onClick={() => setEditModal(true)}>
            <i className="ri-edit-line" />
          </button>
          <button
            type="button"
            className="btn btn-outline-danger radius-8"
            onClick={() => setDeleteConfirm(true)}
            disabled={itemCount > 0 || hasChildren}
            title={itemCount > 0 || hasChildren ? "Remove items or subcategories first" : "Delete"}
          >
            <i className="ri-delete-bin-line" />
          </button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children!.map((child, i) => (
            <CategoryRow
              key={child.id}
              node={child}
              branchId={branchId}
              level={level + 1}
              siblings={node.children!}
              index={i}
              onRefresh={onRefresh}
            />
          ))}
        </div>
      )}

      {editModal && (
        <CategoryEditModal
          branchId={branchId}
          category={node}
          tree={[]}
          onClose={() => setEditModal(false)}
          onSaved={() => {
            setEditModal(false);
            onRefresh();
          }}
        />
      )}
      {deleteConfirm && (
        <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content radius-12">
              <div className="modal-header">
                <h5 className="modal-title">Delete category</h5>
                <button type="button" className="btn-close" onClick={() => setDeleteConfirm(false)} />
              </div>
              <div className="modal-body">
                <p>Delete &quot;{node.name}&quot;? This cannot be undone.</p>
                {error && <div className="alert alert-danger radius-8">{error}</div>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary radius-8" onClick={() => setDeleteConfirm(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger radius-8" onClick={handleDelete} disabled={submitting}>
                  {submitting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function CategoryEditModal({
  branchId,
  category,
  tree,
  onClose,
  onSaved,
}: {
  branchId: string;
  category: CategoryNode;
  tree: CategoryNode[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category.name);
  const [parentId, setParentId] = useState<number | null>(category.parentId);
  const [domainType, setDomainType] = useState(category.domainType ?? "");
  const [sortOrder, setSortOrder] = useState(category.sortOrder);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const parentOptions = flattenTree(JSON.parse(JSON.stringify(tree))).filter((n) => n.id !== category.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await ownerClinicItemCategoryUpdate(branchId, String(category.id), {
        name: name.trim(),
        parentId: parentId ?? undefined,
        domainType: domainType || undefined,
        sortOrder,
      });
      onSaved();
    } catch (e) {
      setError((e as Error)?.message ?? "Update failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content radius-12">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Edit category</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger radius-8">{error}</div>}
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-control radius-8"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Parent</label>
                <select
                  className="form-select radius-8"
                  value={parentId ?? ""}
                  onChange={(e) => setParentId(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                >
                  <option value="">None (root)</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Domain type</label>
                <select className="form-select radius-8" value={domainType} onChange={(e) => setDomainType(e.target.value)}>
                  {DOMAIN_OPTIONS.map((o) => (
                    <option key={o.value || "any"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Sort order</label>
                <input
                  type="number"
                  className="form-control radius-8"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary radius-8" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary radius-8" disabled={submitting || !name.trim()}>
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function CategoryCreateModal({
  branchId,
  tree,
  onClose,
  onSaved,
}: {
  branchId: string;
  tree: CategoryNode[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  const [domainType, setDomainType] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const parentOptions = flattenTree(JSON.parse(JSON.stringify(tree)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await ownerClinicItemCategoryCreate(branchId, {
        name: name.trim(),
        parentId: parentId ?? undefined,
        domainType: domainType || undefined,
        sortOrder,
      });
      onSaved();
    } catch (e) {
      setError((e as Error)?.message ?? "Create failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal d-block bg-dark bg-opacity-50" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content radius-12">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">New category</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger radius-8">{error}</div>}
              <div className="mb-3">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-control radius-8"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Parent</label>
                <select
                  className="form-select radius-8"
                  value={parentId ?? ""}
                  onChange={(e) => setParentId(e.target.value === "" ? null : parseInt(e.target.value, 10))}
                >
                  <option value="">None (root)</option>
                  {parentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Domain type</label>
                <select className="form-select radius-8" value={domainType} onChange={(e) => setDomainType(e.target.value)}>
                  {DOMAIN_OPTIONS.map((o) => (
                    <option key={o.value || "any"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Sort order</label>
                <input
                  type="number"
                  className="form-control radius-8"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary radius-8" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary radius-8" disabled={submitting || !name.trim()}>
                {submitting ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CatalogCategoriesPage() {
  const params = useParams();
  const branchId = params?.branchId as string | undefined;
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError("");
      const data = await ownerClinicItemCategoryTree(branchId);
      setTree((data ?? []) as CategoryNode[]);
    } catch (e) {
      setError((e as Error)?.message ?? "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!branchId) {
    return (
      <div className="dashboard-main-body">
        <div className="alert alert-warning radius-12">Invalid branch.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-body">
      <PageHeader
        title="Catalog categories"
        subtitle="Hierarchical categories for clinical items"
        breadcrumbs={[
          { label: "Home", href: "/owner" },
          { label: "Clinic", href: "/owner/clinic" },
          { label: "Branch", href: `/owner/clinic/${branchId}` },
          { label: "Catalog", href: `/owner/clinic/${branchId}/catalog` },
          { label: "Categories", href: `/owner/clinic/${branchId}/catalog/categories` },
        ]}
        actions={[
          <Link key="items" href={`/owner/clinic/${branchId}/catalog`} className="btn btn-outline-primary radius-12">
            <i className="ri-archive-line me-1" /> All items
          </Link>,
          <button key="new" type="button" className="btn btn-primary radius-12" onClick={() => setShowCreate(true)}>
            <i className="ri-add-line me-1" /> New category
          </button>,
        ]}
      />

      <div className="card radius-12">
        <div className="card-body p-24">
          {error && <div className="alert alert-danger radius-12 mb-3">{error}</div>}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" />
              <p className="text-muted mt-2 mb-0">Loading categories…</p>
            </div>
          ) : tree.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-muted mb-3">No categories yet. Create a root category to get started.</p>
              <button type="button" className="btn btn-primary radius-12" onClick={() => setShowCreate(true)}>
                <i className="ri-add-line me-1" /> New category
              </button>
            </div>
          ) : (
            <div>
              {tree.map((node, index) => (
                <CategoryRow
                  key={node.id}
                  node={node}
                  branchId={branchId}
                  level={0}
                  siblings={tree}
                  index={index}
                  onRefresh={load}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CategoryCreateModal
          branchId={branchId}
          tree={tree}
          onClose={() => setShowCreate(false)}
          onSaved={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}
    </div>
  );
}
