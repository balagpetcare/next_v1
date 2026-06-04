"use client";

export function FulfillmentRequestEmptyState(props: { filtered: boolean; branchId: string }) {
  const { filtered, branchId } = props;
  if (filtered) {
    return (
      <div className="card radius-12 border">
        <div className="card-body text-center py-5 px-3">
          <i className="ri-filter-off-line fs-1 text-muted d-block mb-3" />
          <h6 className="fw-semibold mb-2">No requests match these filters</h6>
          <p className="text-muted small mb-0">Try clearing filters or widening the date range.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="card radius-12 border border-success border-opacity-50 bg-success-subtle">
      <div className="card-body text-center py-5 px-3">
        <i className="ri-checkbox-circle-line fs-1 text-success d-block mb-3" />
        <h6 className="fw-semibold mb-2">Queue is clear</h6>
        <p className="text-muted small mb-0">
          There are no fulfillment requests in this warehouse work queue right now. New requests will appear here when branches submit
          internal transfers or when approvals move forward.
        </p>
        <a className="btn btn-sm btn-outline-dark mt-3" href={`/staff/branch/${branchId}/warehouse`}>
          Back to warehouse
        </a>
      </div>
    </div>
  );
}
