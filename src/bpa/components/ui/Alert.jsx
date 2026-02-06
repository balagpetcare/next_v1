export default function Alert({ type = "danger", title, children }) {
  const cls =
    type === "danger"
      ? "alert alert-danger"
      : type === "success"
      ? "alert alert-success"
      : type === "warning"
      ? "alert alert-warning"
      : "alert alert-info";

  return (
    <div className={cls + " radius-8"} role="alert">
      {title ? <div className="fw-semibold mb-4">{title}</div> : null}
      <div className="text-sm">{children}</div>
    </div>
  );
}
