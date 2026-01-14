import SiteShell from "@/components/SiteShell";

export default function ClinicLayout({ children }) {
  return (
    <SiteShell site="clinic" title="communitypetclinic.com">
      {children}
    </SiteShell>
  );
}

