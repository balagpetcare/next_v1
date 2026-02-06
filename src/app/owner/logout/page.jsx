import React from "react";


export default function OwnerLogoutPage() {
  return (
    <div style={{ padding: 24 }}>
      <h3>Logging out...</h3>
      <p>If you are not redirected, go to <a href="/owner/login">login</a>.</p>
      <LogoutRunner />
    </div>
  );
}

function LogoutRunner() {
  React.useEffect(() => {
    (async () => {
      try {
        const base =
          process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

        await fetch(new URL("/api/v1/auth/logout", base), {
          method: "POST",
          credentials: "include",
        });
      } catch (e) {
        // ignore
      } finally {
        window.location.href = "/owner/login";
      }
    })();
  }, []);

  return null;
}
