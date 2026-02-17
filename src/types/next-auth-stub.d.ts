/** Stub for next-auth/react so Larkon AppProvidersWrapper type-checks. Admin uses cookie auth, not next-auth. */
declare module "next-auth/react" {
  import type { ReactNode } from "react";
  export function SessionProvider(props: { children: ReactNode }): JSX.Element;
  export function useSession(): { data: unknown; status: string };
}
