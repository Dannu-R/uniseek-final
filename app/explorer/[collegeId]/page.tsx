"use client";

// College Explorer (PRD Epic 6) — PLACEHOLDER. Reads the clicked college from the
// stored result and shows a skeleton of the sections the real Explorer will hold.
// No data fetching yet. Exit returns to the results list.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface College {
  collegeId: string;
  name: string;
  band: "reach" | "target" | "safety";
  overallAdmitRate: number | null;
}

const BAND_LABEL: Record<College["band"], string> = { reach: "Reach", target: "Match", safety: "Safety" };
const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

// The sections the real Explorer will fill in (PRD Epic 6).
const SECTIONS = [
  { title: "Why this fits you", body: "A personalized explanation tying this college to your profile." },
  { title: "Admissions", body: "Admit rates, test ranges, and how your profile compares." },
  { title: "Cost", body: "Net price for your income band, aid outlook, and merit potential." },
  { title: "Student life", body: "Size, housing, Greek life, athletics, and campus setting." },
  { title: "Extracurricular fit", body: "How your activities line up with this college." },
  { title: "Things to consider", body: "Honest trade-offs and concerns worth knowing." },
  { title: "Sources", body: "Where every figure on this page comes from." },
];

export default function ExplorerPage() {
  const { collegeId } = useParams<{ collegeId: string }>();
  const router = useRouter();
  const [college, setCollege] = useState<College | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("uniseek.result.v1");
      if (raw) {
        const result = JSON.parse(raw) as { list?: College[] };
        setCollege(result.list?.find((c) => c.collegeId === collegeId) ?? null);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [collegeId]);

  if (!loaded) return <div className="explorer" />;

  if (!college) {
    return (
      <div className="explorer">
        <div className="explorer__inner explorer__missing">
          <h1>College not found</h1>
          <p>We couldn't find that college in your list.</p>
          <a className="btn btn--primary" href="/results">Back to your list</a>
        </div>
      </div>
    );
  }

  return (
    <div className="explorer">
      <div className="explorer__inner">
        <div className="explorer__bar">
          <button type="button" className="btn btn--ghost" onClick={() => router.push("/results")}>
            ← Back to list
          </button>
        </div>

        <header className="explorer__head">
          <span className={`explorer__band explorer__band--${college.band}`}>{BAND_LABEL[college.band]}</span>
          <h1 className="explorer__title">{college.name}</h1>
          <p className="explorer__rate">{pct(college.overallAdmitRate)} acceptance rate</p>
        </header>

        <div className="explorer__note">
          Placeholder — the full College Explorer is coming soon.
        </div>

        <div className="explorer__sections">
          {SECTIONS.map((s) => (
            <section key={s.title} className="ex-section">
              <h2 className="ex-section__title">
                {s.title}
                <span className="ex-section__soon">Coming soon</span>
              </h2>
              <p className="ex-section__body">{s.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
