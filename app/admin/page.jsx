export default function Page() {
  return (
    <div>
      <h2>Admin Panel (Hidden) — Home</h2>
      <p>Admin skeleton: staff-only dashboards, support, finance (later).</p>

      <ul>
        <li><a href="/health">Health check page</a></li>
        <li><a href="/debug">Debug info</a></li>
      </ul>

      <div
        
      >
        <strong>Next steps:</strong>
        <ol>
          <li>
            Create your real pages inside <code>app</code> for this site
          </li>
          <li>
            Connect API later using <code>lib/api</code>
          </li>
          <li>
            Add auth later (tokens/cookies) for protected areas
          </li>
        </ol>
      </div>
    </div>
  );
}
