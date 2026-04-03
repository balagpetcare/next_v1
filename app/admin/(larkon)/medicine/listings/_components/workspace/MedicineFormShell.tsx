"use client";

import type { ReactNode } from "react";
import Link from "next/link";

type Props = {
  title: string;
  backHref: string;
  backLabel: string;
  intro?: ReactNode;
  error?: string;
  actions: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
};

export default function MedicineFormShell({ title, backHref, backLabel, intro, error, actions, sidebar, children }: Props) {
  return (
    <div className="dashboard-main-body">
      <Link href={backHref} className="text-muted small d-inline-block mb-2">
        ← {backLabel}
      </Link>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <h1 className="h4 mb-0">{title}</h1>
        <div className="d-flex flex-wrap gap-2">{actions}</div>
      </div>
      {intro ? <p className="text-muted small mb-3">{intro}</p> : null}
      {error ? <div className="alert alert-danger radius-12 mb-3">{error}</div> : null}
      <div className="row g-3">
        <div className="col-lg-8 col-xl-9">{children}</div>
        <div className="col-lg-4 col-xl-3">{sidebar}</div>
      </div>
    </div>
  );
}
