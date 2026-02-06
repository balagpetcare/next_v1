export default function Placeholder({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="card">
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p style={{ color: "var(--muted)", margin: "8px 0 0 0" }}>{hint || "Wire real module UI next."}</p>
    </div>
  );
}
