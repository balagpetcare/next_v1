"use client";

export default function CheckboxRow({ checked, label, hint, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "w-100 text-start border radius-8 p-16 d-flex align-items-start gap-12",
        checked
          ? "bg-primary-50 border-primary-200"
          : "bg-white border-gray-200 hover-bg-gray-50",
      ].join(" ")}
      style={{ cursor: "pointer" }}
    >
      <span
        className={[
          "d-inline-flex align-items-center justify-content-center border radius-4",
          checked ? "bg-primary border-primary" : "bg-white border-gray-300",
        ].join(" ")}
        style={{ width: 20, height: 20, marginTop: 2 }}
        aria-hidden="true"
      >
        {checked && (
          <span style={{ width: 10, height: 10, background: "white", borderRadius: 2 }} />
        )}
      </span>

      <span className="flex-grow-1">
        <span className="d-block fw-semibold text-black">{label}</span>
        {hint && (
          <span className="d-block text-sm text-secondary-light mt-4">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}
