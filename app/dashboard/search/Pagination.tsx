"use client";

// Page links under the search results (the Next.js Learn course's <Pagination>). Each
// link is the current URL with a different `page`, so the browser's back button works.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { pageList } from "@/lib/search";

// currentPage comes from the API rather than the URL: the API clamps a page that's out
// of range (?page=99 on a 3-page search shows page 3), and the links should match.
export default function Pagination({ totalPages, currentPage }: { totalPages: number; currentPage: number }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The same URL, with `page` set to pageNumber.
  const createPageURL = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", pageNumber.toString());
    return `${pathname}?${params.toString()}`;
  };

  if (totalPages <= 1) return null;

  return (
    <nav className="pagination" aria-label="Search result pages">
      {currentPage <= 1 ? (
        <span className="pagination__arrow is-disabled">‹ Prev</span>
      ) : (
        <Link className="pagination__arrow" href={createPageURL(currentPage - 1)}>
          ‹ Prev
        </Link>
      )}

      {pageList(currentPage, totalPages).map((p, i) =>
        p === "..." ? (
          <span key={`gap-${i}`} className="pagination__gap">
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={createPageURL(p)}
            className={`pagination__num ${p === currentPage ? "is-active" : ""}`}
            aria-current={p === currentPage ? "page" : undefined}
          >
            {p}
          </Link>
        ),
      )}

      {currentPage >= totalPages ? (
        <span className="pagination__arrow is-disabled">Next ›</span>
      ) : (
        <Link className="pagination__arrow" href={createPageURL(currentPage + 1)}>
          Next ›
        </Link>
      )}
    </nav>
  );
}
