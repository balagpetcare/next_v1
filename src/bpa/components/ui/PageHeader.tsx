"use client";

import Link from "next/link";

type Props = {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
};

export default function PageHeader({ title, subtitle, actionHref, actionLabel }: Props) {
  return (
    <div className="mb-6 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
      </div>

      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
