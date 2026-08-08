"use client";

// College Explorer (PRD Epic 6). Personalized insight is generated ON DEMAND for the
// college the student chose to explore (via /api/explore), only after they confirmed —
// never precomputed for the whole list. Result is cached per college in sessionStorage
// so re-visits don't re-spend. Falls back to the section outline while loading or if
// generation is unavailable.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toPayload } from "@/app/build/toPayload";
import type { WizardData } from "@/app/build/model";
import type { CollegeInsight } from "@/lib/collegeInsight";

interface College {
  collegeId: string;
  name: string;
  band: "reach" | "target" | "safety";
  overallAdmitRate: number | null;
}

const BAND_LABEL: Record<College["band"], string> = { reach: "Reach", target: "Match", safety: "Safety" };
const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);

type TextField = "whyFits" | "admissions" | "cost" | "studentLife" | "thingsToConsider";
type Section = { title: string; field?: TextField; dynamic?: "ec"; points?: { label: string; note: string }[] };

// Section outline (points ≈ the scoring factors) shown before/without personalization.
const SECTIONS: Section[] = [
  {
    title: "Why this fits you",
    field: "whyFits",
    points: [
      { label: "Overall match", note: "why this college landed in reach, match, or safety" },
      { label: "Admission odds", note: "your estimated chance of getting in here" },
      { label: "Academic standing", note: "how your profile compares to this college's bar" },
      { label: "Preference match", note: "the things you said you care about, scored for this college" },
    ],
  },
  {
    title: "Admissions",
    field: "admissions",
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
    field: "cost",
    points: [
      { label: "Net price for your income band", note: "what families like yours actually pay" },
      { label: "Budget fit", note: "whether it clears the max you set" },
      { label: "Merit aid", note: "non-need scholarships on offer" },
    ],
  },
  {
    title: "Student life",
    field: "studentLife",
    points: [
      { label: "School size", note: "undergraduate enrollment" },
      { label: "Class size", note: "share of small classes" },
      { label: "Housing", note: "how residential the campus is" },
      { label: "Greek life", note: "presence and scale" },
      { label: "Athletics", note: "division and sports culture" },
      { label: "Setting", note: "urban, suburban, or rural" },
    ],
  },
  { title: "Extracurricular fit", dynamic: "ec" },
  {
    title: "Things to consider",
    field: "thingsToConsider",
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

type InsightState = "idle" | "loading" | "ready" | "error";

export default function ExplorerPage() {
  const { collegeId } = useParams<{ collegeId: string }>();
  const router = useRouter();
  const [college, setCollege] = useState<College | null>(null);
  const [activities, setActivities] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [insight, setInsight] = useState<CollegeInsight | null>(null);
  const [insightState, setInsightState] = useState<InsightState>("idle");

  useEffect(() => {
    let active = true;
    let col: College | null = null;
    let profileData: WizardData | null = null;
    try {
      const raw = sessionStorage.getItem("uniseek.result.v1");
      if (raw) {
        const result = JSON.parse(raw) as { list?: College[] };
        col = result.list?.find((c) => c.collegeId === collegeId) ?? null;
      }
      const rawProfile = localStorage.getItem("uniseek.profile.v1");
      if (rawProfile) {
        profileData = JSON.parse(rawProfile) as WizardData;
        setActivities((profileData.activities ?? []).map((a) => a.description).filter((d) => d && d.trim() !== ""));
      }
    } catch {
      /* ignore */
    }
    setCollege(col);
    setLoaded(true);
    if (!col) return;

    const cacheKey = `uniseek.insight.${collegeId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setInsight(JSON.parse(cached));
        setInsightState("ready");
        return;
      } catch {
        /* fall through to refetch */
      }
    }
    if (!profileData) {
      setInsightState("idle");
      return;
    }

    setInsightState("loading");
    fetch("/api/explore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collegeId, band: col.band, profile: toPayload(profileData) }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (d.insight) {
          setInsight(d.insight);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify(d.insight));
          } catch {
            /* ignore quota */
          }
          setInsightState("ready");
        } else {
          setInsightState("error");
        }
      })
      .catch(() => active && setInsightState("error"));

    return () => {
      active = false;
    };
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

  const banner =
    insightState === "loading"
      ? "Analyzing this college against your profile…"
      : insightState === "ready"
        ? "Personalized for you, based on your profile."
        : insightState === "error"
          ? "Couldn't generate personalized insights right now — here's an outline of what this page covers."
          : "Build your profile to get personalized insights.";

  const outline = (points: { label: string; note: string }[]) => (
    <ul className="ex-points">
      {points.map((p) => (
        <li key={p.label} className="ex-point">
          <span className="ex-point__label">{p.label}</span>
          <span className="ex-point__note"> — {p.note}</span>
        </li>
      ))}
    </ul>
  );

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

        <div className={`explorer__note ${insightState === "loading" ? "is-loading" : ""}`}>{banner}</div>

        <div className="explorer__sections">
          {SECTIONS.map((s) => (
            <section key={s.title} className="ex-section">
              <h2 className="ex-section__title">{s.title}</h2>

              {s.dynamic === "ec" ? (
                insight ? (
                  insight.extracurriculars.length ? (
                    <ul className="ex-points">
                      {insight.extracurriculars.map((e, i) => (
                        <li key={i} className="ex-point">
                          <span className="ex-point__label">{e.activity}</span>
                          <span className="ex-point__note"> — {e.note}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="ex-section__body">No activities to analyze.</p>
                  )
                ) : activities.length ? (
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
              ) : s.field && insightState === "ready" && insight ? (
                <p className="ex-section__body">{insight[s.field]}</p>
              ) : (
                outline(s.points ?? [])
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
