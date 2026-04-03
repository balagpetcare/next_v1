import NetworkCommandNav from "./_components/NetworkCommandNav";

export default function NetworkCommandLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-fluid py-4">
      <NetworkCommandNav />
      {children}
    </div>
  );
}
