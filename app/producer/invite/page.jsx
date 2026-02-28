"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * /producer/invite?token=... — redirects to accept page so both URLs work.
 * Link format: /producer/invite?token=... or /producer/invites/accept?token=...
 */
export default function ProducerInviteRedirectPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token || !token.trim()) {
      router.replace("/producer/invites/accept?error=missing");
      return;
    }
    router.replace(`/producer/invites/accept?token=${encodeURIComponent(token.trim())}`);
  }, [token, router]);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="text-center">
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
        <p className="text-secondary mb-0">Taking you to the invitation…</p>
      </div>
    </div>
  );
}
