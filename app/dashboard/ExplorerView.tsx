"use client";

// College Explorer, rendered INLINE inside a dashboard tab (expands to fill the content
// area). Modern layout: a hero with a campus-photo placeholder, a quick-stats strip, and
// a card grid of sections. Personalized insight is generated on demand via /api/explore,
// which serves a stored copy from the DB if one exists — so re-opening doesn't regenerate.
// In placeholder mode it shows the section outline only (no API call, nothing stored).

import { useEffect, useState, type ReactNode } from "react";
import { toPayload } from "@/app/build/toPayload";
import { USE_PLACEHOLDER_RESULTS } from "@/app/build/placeholderResult";
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
type IconKey = "fit" | "admissions" | "cost" | "life" | "ec" | "consider";
type Section = {
  title: string;
  icon: IconKey;
  field?: TextField;
  dynamic?: "ec";
  points?: { label: string; note: string }[];
};

// Minimalist line icons per section.
const ICON: Record<IconKey, ReactNode> = {
  fit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  admissions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1" />
      <path d="M8.5 11l2 2 4-4" />
      <path d="M9 17h6" />
    </svg>
  ),
  cost: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14" r="1.2" />
    </svg>
  ),
  life: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" />
      <circle cx="17.5" cy="9.5" r="2.2" />
      <path d="M16 15c2.4.2 4.5 2.2 4.5 5" />
    </svg>
  ),
  ec: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="12" x2="12" y2="4" />
      <line x1="12" y1="12" x2="19" y2="8" />
      <line x1="12" y1="12" x2="18" y2="17" />
      <line x1="12" y1="12" x2="6" y2="18" />
      <line x1="12" y1="12" x2="5" y2="8" />
      <circle cx="12" cy="12" r="2.4" />
      <circle cx="12" cy="4" r="1.6" />
      <circle cx="19" cy="8" r="1.6" />
      <circle cx="18" cy="17" r="1.6" />
      <circle cx="6" cy="18" r="1.6" />
      <circle cx="5" cy="8" r="1.6" />
    </svg>
  ),
  consider: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  ),
};

const SECTIONS: Section[] = [
  {
    title: "Why this fits you",
    icon: "fit",
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
    icon: "admissions",
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
    icon: "cost",
    field: "cost",
    points: [
      { label: "Net price for your income band", note: "what families like yours actually pay" },
      { label: "Budget fit", note: "whether it clears the max you set" },
      { label: "Merit aid", note: "non-need scholarships on offer" },
    ],
  },
  {
    title: "Student life",
    icon: "life",
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
  { title: "Extracurricular fit", icon: "ec", dynamic: "ec" },
  {
    title: "Things to consider",
    icon: "consider",
    field: "thingsToConsider",
    points: [
      { label: "Data confidence", note: "where a figure is estimated rather than published" },
      { label: "Tight filters", note: "any of your must-haves this college barely clears" },
      { label: "Trade-offs", note: "honest concerns worth weighing" },
    ],
  },
];

// A small inline image-placeholder tile.
function PhotoTile({ label }: { label: string }) {
  return (
    <div className="ex2-photo" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="8.5" cy="9.5" r="1.6" />
        <path d="M21 16l-5-5-6 6-3-3-4 4" />
      </svg>
      <span>{label}</span>
    </div>
  );
}

type InsightState = "idle" | "loading" | "ready" | "error";

export default function ExplorerView({ college, onBack }: { college: College; onBack: () => void }) {
  const [activities, setActivities] = useState<string[]>([]);
  const [insight, setInsight] = useState<CollegeInsight | null>(null);
  const [insightState, setInsightState] = useState<InsightState>("idle");

  useEffect(() => {
    let active = true;
    let profileData: WizardData | null = null;
    try {
      const rawProfile = localStorage.getItem("uniseek.profile.v1");
      if (rawProfile) {
        profileData = JSON.parse(rawProfile) as WizardData;
        setActivities((profileData.activities ?? []).map((a) => a.description).filter((d) => d && d.trim() !== ""));
      }
    } catch {
      /* ignore */
    }

    if (USE_PLACEHOLDER_RESULTS) {
      setInsightState("idle");
      return;
    }

    const cacheKey = `uniseek.insight.${college.collegeId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        setInsight(JSON.parse(cached));
        setInsightState("ready");
        return;
      } catch {
        /* refetch */
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
      body: JSON.stringify({ collegeId: college.collegeId, band: college.band, profile: toPayload(profileData) }),
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
  }, [college.collegeId, college.band]);

  const banner = USE_PLACEHOLDER_RESULTS
    ? "Preview mode — an outline of what this page covers. Personalized insights are turned off."
    : insightState === "loading"
      ? "Analyzing this college against your profile…"
      : insightState === "ready"
        ? "Personalized for you, based on your profile."
        : insightState === "error"
          ? "Couldn't generate personalized insights right now — here's an outline."
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

  const sectionBody = (s: Section) => {
    if (s.dynamic === "ec") {
      if (insight) {
        return insight.extracurriculars.length ? (
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
        );
      }
      return activities.length ? (
        <ul className="ex-points">
          {activities.map((a, i) => (
            <li key={i} className="ex-point">
              <span className="ex-point__label">{a}</span>
              <span className="ex-point__note"> — how this activity could strengthen your case here</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ex-section__body">Add activities to your profile and we'll cover how each one might help you here.</p>
      );
    }
    if (s.field && insightState === "ready" && insight) return <p className="ex-section__body">{insight[s.field]}</p>;
    return outline(s.points ?? []);
  };

  return (
    <div className="explorer explorer--inline">
      <div className="ex2">
        <div className="ex2__bar">
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            ← Back to list
          </button>
        </div>

        {/* Hero with a campus-photo placeholder and the title overlaid. */}
        <div className="ex2-hero">
          <div className="ex2-hero__media" aria-hidden="true">
            <span className="ex2-hero__tag">Campus photo</span>
          </div>
          <div className="ex2-hero__overlay">
            <span className={`ex2-hero__band ex2-hero__band--${college.band}`}>{BAND_LABEL[college.band]}</span>
            <h1 className="ex2-hero__title">{college.name}</h1>
            <p className="ex2-hero__sub">{pct(college.overallAdmitRate)} acceptance rate</p>
          </div>
        </div>

        <div className={`explorer__note ${insightState === "loading" ? "is-loading" : ""}`}>{banner}</div>

        {/* Quick-stats strip. Acceptance rate is real; the rest fill in with data. */}
        <div className="ex2-stats">
          <div className="ex2-stat">
            <span className="ex2-stat__label">Acceptance rate</span>
            <span className="ex2-stat__value">{pct(college.overallAdmitRate)}</span>
          </div>
          <div className="ex2-stat">
            <span className="ex2-stat__label">Net price</span>
            <span className="ex2-stat__value ex2-stat__value--muted">—</span>
          </div>
          <div className="ex2-stat">
            <span className="ex2-stat__label">Undergrads</span>
            <span className="ex2-stat__value ex2-stat__value--muted">—</span>
          </div>
          <div className="ex2-stat">
            <span className="ex2-stat__label">Setting</span>
            <span className="ex2-stat__value ex2-stat__value--muted">—</span>
          </div>
        </div>

        {/* Section cards (masonry). */}
        <div className="ex2-grid">
          {SECTIONS.map((s) => (
            <section key={s.title} className="ex2-card">
              <div className="ex2-card__head">
                <span className="ex2-card__icon" aria-hidden="true">
                  {ICON[s.icon]}
                </span>
                <h2 className="ex2-card__title">{s.title}</h2>
              </div>
              <div className="ex2-card__body">{sectionBody(s)}</div>

              {s.icon === "life" && (
                <div className="ex2-gallery">
                  <PhotoTile label="Campus" />
                  <PhotoTile label="Dorms" />
                  <PhotoTile label="Quad" />
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
