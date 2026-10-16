"use client";

// The search box (the Next.js Learn course's <Search>). It doesn't fetch anything itself:
// it writes the search into the URL, and SearchView reads it from there.

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce";

export default function SearchBox({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  // Wait 300 ms after the last keystroke, then put the search in the URL.
  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", "search");
    params.set("page", "1"); // a new search starts on page 1
    if (term) params.set("query", term);
    else params.delete("query");
    replace(`${pathname}?${params.toString()}`);
  }, 300);

  return (
    <label className="search-box">
      <span className="sr-only">Search colleges</span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="6.5" />
        <path d="M15.8 15.8 20 20" />
      </svg>
      <input
        type="search"
        className="search-box__input"
        placeholder={placeholder}
        defaultValue={searchParams.get("query") ?? ""}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </label>
  );
}
