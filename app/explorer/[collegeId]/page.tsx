"use client";

// College Explorer (PRD Epic 6) — PLACEHOLDER. Reads the clicked college from the
// stored result and lays out the points each section will cover (mostly the scoring
// factors). The Extracurricular-fit section lists the student's own activities.
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

type Section = { title: string; points?: { label: string; note: string }[]; dynamic?: "ec" };

// The points each section will fill in (mostly the scoring factors).
const SECTIONS: Section[] = [
  {
    title: "Why this fits you",
    points: [
      { label: "Overall match", note: "why this college landed in reach, match, or safety" },
      { label: "Admission odds", note: "your estimated chance of getting in here" },
      { label: "Academic standing", note: "how your profile compares to this college's bar" },
      { label: "Preference match", note: "the things you said you care about, scored for this college" },
    ],
  },
  {
    title: "Admissions",
    points: [
      { label: "Overall acceptance rate", note: "the school's published rate" },
      { label: "Acceptance rate for your major", note: "program-specific rate, where published" },
      { label: "In-state vs out-of-state", note: "residency-adjusted odds" },
      { label: "GPA", note: "yours against the admitted range" },
      { label: "Course rigor", note: "how your advanced-course load reads" },
      { label: "Test scores", note: "yours against the college's 25th–75th percentiles" },
      { label: "Class rank", note: "where you sit in your class" },
    ],
  },
  {
    title: "Cost",
    points: [
      { label: "Net price for your income band", note: "what families like yours actually pay" },
      { label: "Budget fit", note: "whether it clears the max you set" },
      { label: "Merit aid", note: "non-need scholarships on offer" },
    ],
  },
  {
    title: "Student life",
    points: [
      { label: "School size", note: "undergraduate enrollment" },
      { label: "Class size", note: "share of small classes" },
      { label: "Housing", note: "how residential the campus is" },
      { label: "Greek life", note: "presence and scale" },
      { label: "Athletics", note: "division and sports culture" },
      { label: "Setting", note: "urban, suburban, or rural" },
      { label: "Social scene", note: "how lively campus feels" },
    ],
  },
  { title: "Extracurricular fit", dynamic: "ec" },
  {
    title: "Things to consider",
    points: [
      { label: "Data confidence", note: "where a figure is estimated rather than published" },
      { label: "Tight filters", note: "any of your must-haves this college barely clears" },
      { label: "Trade-offs", note: "honest concerns worth weighing" },
    ],
  },
  {
    title: "Sources",
    points: [
      { label: "Admissions data", note: "admit rate and rank provenance" },
      { label: "Cost data", note: "College Scorecard" },
      { label: "Campus data", note: "IPEDS and the Common Data Set" },
    ],
  },
];

export default function ExplorerPage() {
  const { collegeId } = useParams<{ collegeId: string }>();
  const router = useRouter();
  const [college, setCollege] = useState<College | null>(null);
  const [activities, setActivities] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("uniseek.result.v1");
      if (raw) {
        const result = JSON.parse(raw) as { list?: College[] };
        setCollege(result.list?.find((c) => c.collegeId === collegeId) ?? null);
      }
      const rawProfile = localStorage.getItem("uniseek.profile.v1");
      if (rawProfile) {
        const profile = JSON.parse(rawProfile) as { activities?: { description: string }[] };
        setActivities((profile.activities ?? []).map((a) => a.description).filter((d) => d && d.trim() !== ""));
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
          Placeholder — a preview of what this page will cover. Real figures coming soon.
        </div>

        <div className="explorer__sections">
          {SECTIONS.map((s) => (
            <section key={s.title} className="ex-section">
              <h2 className="ex-section__title">{s.title}</h2>

              {s.dynamic === "ec" ? (
                activities.length ? (
                  <ul className="ex-points">
                    {activities.map((a, i) => (
                      <li key={i} className="ex-point">
                        <span className="ex-point__label">{a}</span>
                        <span className="ex-point__note"> — how this activity could strengthen your case here</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="ex-section__body">
                    Add activities to your profile and we'll cover how each one might help you here.
                  </p>
                )
              ) : (
                <ul className="ex-points">
                  {s.points!.map((p) => (
                    <li key={p.label} className="ex-point">
                      <span className="ex-point__label">{p.label}</span>
                      <span className="ex-point__note"> — {p.note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
