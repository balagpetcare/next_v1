export default function AuthFooter() {
  return (
    <div className="text-center mt-4">
      <div className="text-secondary-light" style={{ fontSize: 12 }}>
        © {new Date().getFullYear()} BPA — Powered by WowDash UI
      </div>
    </div>
  );
}
