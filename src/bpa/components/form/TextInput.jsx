"use client";

export default function TextInput({
  label,
  required,
  value,
  onChange,
  placeholder,
  hint,
  error,
  type = "text",
  name,
}) {
  return (
    <div className="mb-16">
      {label ? (
        <label className="form-label fw-semibold text-black mb-8">
          {label} {required ? <span className="text-danger">*</span> : null}
        </label>
      ) : null}

      <input
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange?.(e.target.value, e)}
        placeholder={placeholder}
        className={"form-control radius-8 " + (error ? "border-danger" : "")}
      />

      {hint ? <div className="text-sm text-secondary-light mt-6">{hint}</div> : null}
      {error ? <div className="text-sm text-danger mt-6">{error}</div> : null}
    </div>
  );
}
