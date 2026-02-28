"use client";
/**
 * Reusable styled radio for Producer panel (Larkon-consistent).
 * Larger click target, aligned label, consistent font and spacing.
 */
export default function PrettyRadio({ name, value, checked, onChange, label, id }) {
  const inputId = id || `pretty-radio-${name}-${value}`;
  return (
    <label
      className="form-check d-flex align-items-center gap-2 py-1 px-2 rounded cursor-pointer"
      htmlFor={inputId}
      style={{ minHeight: "2rem", cursor: "pointer" }}
    >
      <input
        type="radio"
        name={name}
        id={inputId}
        className="form-check-input mt-0"
        value={value}
        checked={checked}
        onChange={onChange}
        style={{ width: "1.1rem", height: "1.1rem", cursor: "pointer" }}
      />
      <span className="form-check-label" style={{ fontSize: "0.95rem", cursor: "pointer" }}>
        {label}
      </span>
    </label>
  );
}
