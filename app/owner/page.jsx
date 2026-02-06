import Card from "@/src/bpa/components/ui/Card";
import PageHeader from "@/src/bpa/components/ui/PageHeader";
import Link from "next/link";

export default function OwnerHome() {
  return (
    <div>
      <PageHeader 
        title="Owner Dashboard" 
        subtitle="Welcome to BPA Owner Panel"
        actions={[
          <Link
            key="staff-view"
            href="/staff/branches"
            className="btn btn-outline-primary"
          >
            <i className="ri-user-line me-8"></i>
            Switch to Staff View
          </Link>
        ]}
      />
      <Card title="Quick start" subtitle="Use the sidebar to manage organizations & branches">
        <p className="text-secondary-light mb-0">
          Start by completing onboarding, then create branches under your organization. All UI screens are styled with WowDash.
        </p>
        <div className="mt-20">
          <p className="text-secondary-light mb-12">
            <strong>Tip:</strong> You can switch to Staff View to access branch-specific interfaces for all your organization's branches.
          </p>
          <Link href="/staff/branches" className="btn btn-primary btn-sm">
            <i className="ri-user-line me-8"></i>
            View as Staff
          </Link>
        </div>
      </Card>
    </div>
  );
}
