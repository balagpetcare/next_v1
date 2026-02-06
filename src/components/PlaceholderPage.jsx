import PageHeader from "../bpa/components/ui/PageHeader";
import Card from "../bpa/components/ui/Card";

export default function PlaceholderPage({ title = "Coming soon", subtitle = "This page will be implemented next." }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <p className="text-secondary-light mb-0">UI scaffolding is ready. Connect API + table actions next.</p>
      </Card>
    </div>
  );
}
