/**
 * You should not normally see this page because middleware rewrites /
 * to the active site home (mother/shop/clinic/admin).
 */
export default function RootPage() {
  return (
    <div style={{ padding: 18, fontFamily: "system-ui" }}>
      <h1>BPA Multi-Site Starter</h1>
      <p>
        If you see this page, middleware rewrite did not run. Try visiting one of:
        <br />
        http://localhost:3100 (mother), http://localhost:3101 (shop), http://localhost:3102 (clinic), http://localhost:3103 (admin)
      </p>
    </div>
  );
}
