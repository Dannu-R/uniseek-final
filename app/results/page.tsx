"use client";

// Results — reads the scored list from sessionStorage (anonymous-first) and renders
// a reach/match/safety list. Clicking a college confirms, then opens the (placeholder)
// College Explorer for it (PRD Epic 6).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface CollegeScore {
  collegeId: string;
  name: string;
  band: "reach" | "target" | "safety";
  overallAdmitRate: number | null;
}

interface ScoreResult {
  majorRun: boolean;
  scoredCount: number;
  empty: boolean;
  blockingFilter: string | null;
  list: CollegeScore[];
}

const BANDS: { key: CollegeScore["band"]; label: string; blurb: string }[] = [
  { key: "reach", label: "Reach", blurb: "Ambitious — worth a shot" },
  { key: "target", label: "Match", blurb: "Realistic matches" },
  { key: "safety", label: "Safety", blurb: "Very likely admits" },
];

const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

export default function ResultsPage() {
  const router = useRouter();
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<CollegeScore | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("uniseek.result.v1");
      if (raw) setResult(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  if (!loaded) return <div className="results" />;

  if (!result) {
    return (
      <div className="results">
        <div className="results__inner results__empty">
          <h1 className="results__title">No list yet</h1>
          <p>Build your profile to see colleges that fit you.</p>
          <a className="btn btn--primary" href="/build">Build my list</a>
        </div>
      </div>
    );
  }

  return (
    <div className="results">
      <div className="results__inner">
        <header className="results__head">
          <a className="wizard__brand" href="/">Uniseek</a>
          <h1 className="results__title">Your college list</h1>
          <p className="results__sub">Select a college to explore it in depth.</p>
          <div className="results__actions">
            <a className="btn btn--ghost" href="/build">Edit answers</a>
          </div>
        </header>

        {result.empty ? (
          <div className="results__blocked">
            <h2>No colleges matched your filters</h2>
            <p>
              {result.blockingFilter
                ? `Your ${result.blockingFilter} filter is the tightest constraint — loosening it would bring colleges back.`
                : "Try loosening your filters."}
            </p>
            <a className="btn btn--primary" href="/build">Adjust filters</a>
          </div>
        ) : (
          BANDS.map(({ key, label, blurb }) => {
            const cols = result.list.filter((c) => c.band === key);
            if (cols.length === 0) return null;
            return (
              <section key={key} className="rs-band">
                <div className="rs-band__head">
                  <h2 className={`rs-band__title rs-band__title--${key}`}>{label}</h2>
                  <span className="rs-band__blurb">{blurb}</span>
                </div>
                <div className="rs-band__list">
                  {cols.map((c) => (
                    <button
                      key={c.collegeId}
                      type="button"
                      className={`rs-card rs-card--${c.band}`}
                      onClick={() => setSelected(c)}
                    >
                      <span className="rs-card__name">{c.name}</span>
                      <span className="rs-card__rate">
                        {pct(c.overallAdmitRate)} <em>acceptance rate</em>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>

      {selected && (
        <div className="rs-modal" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <div className="rs-modal__card" onClick={(e) => e.stopPropagation()}>
            <h3 className="rs-modal__title">Open {selected.name}?</h3>
            <p className="rs-modal__body">Take a closer look at this college in the College Explorer.</p>
            <div className="rs-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setSelected(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => router.push(`/explorer/${selected.collegeId}`)}
              >
                Open Explorer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
