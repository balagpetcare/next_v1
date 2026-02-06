"use client";

export default function SubmitBar({ loading, primaryText, onSubmit, secondary }) {
  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-12 mt-24">
      <div>{secondary}</div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="btn btn-primary px-20 py-12 radius-8"
      >
        {loading ? "Saving..." : primaryText}
      </button>
    </div>
  );
}
