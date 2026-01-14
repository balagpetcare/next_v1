import SiteShell from "@/components/SiteShell";

export default function MotherLayout({ children }) {
  return (
    <SiteShell site="mother" title="bangladeshpetassociation.com">
      {children}
    </SiteShell>
  );
}
