"use client";

// The search results. The search itself lives in the URL (?query=…&page=…), so this reads
// it from there and asks /api/colleges/search for that page. Colleges that are also in the
// student's last results run show their band and odds, and can be saved.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Pagination from "./Pagination";
import type { CollegeScore } from "../DashboardClient";

interface SearchCollege {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  admitRate: number | null;
  usNewsRank: number | null;
}

interface SearchResponse {
  colleges: SearchCollege[];
  total: number;
  totalPages: number;
  page: number;
}

const BAND_LABEL: Record<CollegeScore["band"], string> = {
  reach: "Reach",
  target: "Match",
  safety: "Safety",
};

export default function SearchView({
  ranked,
  isSaved,
  onSave,
}: {
  ranked: CollegeScore[] | null; // the last run's full ranked list; null = no run yet
  isSaved: (id: string) => boolean;
  onSave: (college: CollegeScore) => void;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const page = searchParams.get("page") ?? "1";

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch whenever the query or page in the URL changes.
  useEffect(() => {
    // If the student types again before this answer arrives, abort it, so an old
    // (slower) response can't overwrite the newer one.
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ query, page });
    fetch(`/api/colleges/search?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Search failed");
        setData(json as SearchResponse);
        setLoading(false);
      })
      .catch((err: Error) => {
        if (err.name === "AbortError") return; // a newer search took over
        setError(`Couldn't load colleges (${err.message}).`);
        setLoading(false);
      });

    return () => controller.abort();
  }, [query, page]);

  if (loading) {
    return (
      <div className="search-results" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="search-row">
            <div className="search-row__main">
              <span className="ex-skel ex-skel--label" />
              <span className="ex-skel ex-skel--line ex-skel--short" />
            </div>
            <span className="ex-skel ex-skel--pill" />
          </div>
        ))}
      </div>
    );
  }

  if (error) return <p className="search-message">{error}</p>;
  if (!data) return null;

  if (data.colleges.length === 0) {
    return (
      <p className="search-message">
        No colleges match &ldquo;{query}&rdquo;. Try a name, a state like TX, or a major.
      </p>
    );
  }

  return (
    <>
      <p className="search-count">
        {data.total} {data.total === 1 ? "college" : "colleges"}
      </p>

      <div className="search-results">
        {data.colleges.map((college) => {
          // Is this college in the student's last run? Then we know its band and odds.
          const rankedEntry = ranked?.find((r) => r.collegeId === college.id);
          const saved = isSaved(college.id);

          return (
            <div key={college.id} className="search-row">
              <div className="search-row__main">
                <span className="search-row__name">{college.name}</span>
                <span className="search-row__facts">
                  {college.city && college.state ? `${college.city}, ${college.state}` : college.state ?? ""}
                  {college.admitRate != null && <> · {Math.round(college.admitRate * 100)}% acceptance rate</>}
                  {college.usNewsRank != null && <> · #{college.usNewsRank} US News</>}
                </span>
              </div>

              {rankedEntry ? (
                <div className="search-row__fit">
                  <span className={`cmp__chip cmp__chip--${rankedEntry.band}`}>{BAND_LABEL[rankedEntry.band]}</span>
                  {rankedEntry.odds != null && (
                    <span className="search-row__odds">{Math.round(rankedEntry.odds * 100)}% odds</span>
                  )}
                  <button
                    type="button"
                    className={`btn btn--ghost search-row__save ${saved ? "is-saved" : ""}`}
                    onClick={() => onSave(rankedEntry)}
                    disabled={saved}
                  >
                    {saved ? "Saved" : "Save"}
                  </button>
                </div>
              ) : ranked ? (
                <p className="search-row__note">
                  Not in your results. Your filters (budget, major, location) left it out.
                </p>
              ) : (
                <p className="search-row__note">Run your college match to see how you compare.</p>
              )}
            </div>
          );
        })}
      </div>

      <Pagination totalPages={data.totalPages} currentPage={data.page} />
    </>
  );
}
