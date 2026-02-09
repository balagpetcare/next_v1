import { redirect } from "next/navigation";

/**
 * Root "/" redirect: depends on SITE_MODE so mother/shop/clinic etc.
 * don't bounce to /owner and cause redirect loops.
 */
export default function Page() {
  const siteMode = process.env.SITE_MODE || "owner";
  const defaultPaths = {
    mother: "/mother",
    shop: "/shop",
    clinic: "/clinic",
    admin: "/admin",
    owner: "/owner",
    producer: "/producer",
    country: "/country",
  };
  const path = defaultPaths[siteMode] ?? "/owner";
  redirect(path);
}
