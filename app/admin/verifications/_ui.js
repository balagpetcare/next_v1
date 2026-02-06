export function Pill({ text }) {
  return (
    <span
      style={{
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#fafafa",
      }}
    >
      {text}
    </span>
  );
}

export function Card({ children }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
      }}
    >
      {children}
    </div>
  );
}