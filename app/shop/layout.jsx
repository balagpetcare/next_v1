import SiteShell from "@/components/SiteShell";

export default function ShopLayout({ children }: { children }) {
  return (
    <SiteShell site="shop" title="communitypetshop.com">
      {children}
    </SiteShell>
  );
}
