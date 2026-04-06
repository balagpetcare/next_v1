"use client";

import { useEffect, useState } from "react";
import { ownerGet } from "@/app/owner/_lib/ownerApi";

/** Shape expected by owner inventory pages that read `user?.ownedOrg?.id`. */
export type AuthUser = {
  ownedOrg?: { id: number } | null;
};

type MeEnvelope = {
  organizations?: { id: number }[];
  data?: { organizations?: { id: number }[] };
};

async function resolveOwnerOrgId(): Promise<number | undefined> {
  const me = await ownerGet<MeEnvelope>("/api/v1/owner/me").catch(() => null);
  if (!me) return undefined;
  const fromMe = me.organizations ?? me.data?.organizations ?? [];
  if (fromMe[0]?.id) return fromMe[0].id;

  const listed = await ownerGet<{ data?: { id: number }[] }>("/api/v1/owner/organizations").catch(() => null);
  const rows = listed?.data;
  if (Array.isArray(rows) && rows[0]?.id) return rows[0].id;
  return undefined;
}

/**
 * Resolves the current owner org for client pages (same idea as `ownerGet("/api/v1/owner/me")` + first org).
 * Named `useAuthStore` for historical imports; implementation is hook + fetch, not Zustand.
 */
export function useAuthStore(): { user: AuthUser | null } {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const id = await resolveOwnerOrgId();
      if (cancelled) return;
      setUser(id ? { ownedOrg: { id } } : {});
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { user };
}
