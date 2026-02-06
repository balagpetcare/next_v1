"use client";

import Sidebar from "@/src/components/Sidebar";
import TopProfileMenu from "@/src/components/TopProfileMenu";
import { buildNav } from "@/src/lib/nav";
import { useMe } from "@/src/lib/useMe";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const { me } = useMe("/owner");
  const nav = buildNav("owner", Array.isArray(me?.permissions) ? (me!.permissions as any) : []);

  return (
    <div className="container">
      <Sidebar nav={nav} />
      <main className="main">
        <div className="topbar">
          <h1 className="h1">Owner Panel</h1>
          <TopProfileMenu />
        </div>
        {children}
      </main>
    </div>
  );
}
