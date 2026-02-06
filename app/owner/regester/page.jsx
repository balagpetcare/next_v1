"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Redirect page for common typo: /owner/regester -> /owner/register
 */
export default function OwnerRegesterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/owner/register");
  }, [router]);

  return (
    <div className="d-flex align-items-center justify-content-center min-vh-100">
      <div className="text-center">
        <p className="text-muted">Redirecting to registration page...</p>
      </div>
    </div>
  );
}
