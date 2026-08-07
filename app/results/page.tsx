"use client";

// Results — reads the scored list from sessionStorage (anonymous-first) and renders
// the reach/target/safety list. No account needed; "Save" (OAuth) comes later.

import { useEffect, useState } from "react";

interface CollegeScore {
  collegeId: string;
  name: string;
  band: "reach" | "target" | "safety";
  odds: number;
  quality: number;
  finalScore: number;
  effectiveAdmitRate: number;
  flags: string[];
  filterNotes: string[];
}

interface ScoreResult {
  majorRun: boolean;
  scoredCount: number;
  empty: boolean;
  blockingFilter: string | null;
  list: CollegeScore[];
  removedCount: number;
}

const BANDS: { key: CollegeScore["band"]; label: string; blurb: string }[] = [
  { key: "reach", label: "Reach", blurb: "Ambitious — worth a shot" },
  { key: "target", label: "Target", blurb: "Realistic matches" },
  { key: "safety", label: "Safety", blurb: "Very likely admits" },
];

const pct = (x: number) => `${Math.round(x * 100)}%`;

function CollegeCard({ c }: { c: CollegeScore }) {
  const notes = [...new Set([...c.filterNotes, ...c.flags])];
  return (
    <div className={`rs-card rs-card--${c.band}`}>
      <div className="rs-card__main">
        <span className="rs-card__name">{c.name}</span>
        <span className="rs-card__odds">{pct(c.odds)} <em>chance</em></span>
      </div>
      <div className="rs-card__meta">
        <span>Admit rate used {pct(c.effectiveAdmitRate)}</span>
        <span>Program quality {c.quality.toFixed(2)}</span>
      </div>
      {notes.length > 0 && (
        <ul className="rs-card__notes">
          {notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loaded, setLoaded] = useState(false);

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
          <p className="results__sub">
            {result.majorRun ? "Scored for your intended major" : "General run"} · {result.scoredCount} colleges considered
          </p>
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
                    <CollegeCard key={c.collegeId} c={c} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}
