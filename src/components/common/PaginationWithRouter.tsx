"use client";

import { usePathname, useRouter } from "next/navigation";
import { Pagination, type PaginationAlign } from "./Pagination";

type Props = {
  currentPage: number;
  totalPages: number;
  align?: PaginationAlign;
  /** Query param name for page number (default: "page") */
  param?: string;
  ariaLabel?: string;
  className?: string;
};

/**
 * Pagination that updates URL query (e.g. ?page=2) via router.push.
 * Use in server-component pages when you don't have local state.
 */
export function PaginationWithRouter({
  currentPage,
  totalPages,
  align = "end",
  param = "page",
  ariaLabel = "Page navigation example",
  className = "",
}: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const onPageChange = (page: number) => {
    const url = new URL(pathname, window.location.origin);
    url.searchParams.set(param, String(page));
    router.push(url.pathname + url.search);
  };

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      align={align}
      ariaLabel={ariaLabel}
      className={className}
    />
  );
}
