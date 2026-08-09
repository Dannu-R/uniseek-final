"use client";

// College Explorer, rendered INLINE inside a dashboard tab (expands to fill the content
// area). Modern layout: a hero, a quick-stats strip, an Admissions viz block (gauge +
// you-vs-admitted range bars), and a card grid of sections. Every point carries a small
// source marker that opens a slide-in sources drawer — so long / multiple citations stay
// out of the way until asked for. Personalized insight is generated on demand via
// /api/explore (served from the DB if already stored). Placeholder mode shows the outline.

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
const num = (s?: string): number | null => {
  if (s == null || `${s}`.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const ACT_TO_SAT: Record<number, number> = {
  36: 1590, 35: 1540, 34: 1500, 33: 1460, 32: 1430, 31: 1400, 30: 1370, 29: 1340, 28: 1310,
  27: 1280, 26: 1240, 25: 1210, 24: 1180, 23: 1140, 22: 1110, 21: 1080, 20: 1040, 19: 1010,
  18: 970, 17: 930, 16: 890, 15: 850, 14: 800, 13: 760, 12: 710, 11: 670, 10: 630, 9: 590,
};
const gpaColor = (g: number) => (g >= 3.8 ? "#34d399" : g >= 3.5 ? "#a78bfa" : g >= 3.0 ? "#f59e0b" : "#f472b6");

// --- Sources (placeholder until real insights carry their own citations) ---------------
type Source = { title: string; detail?: string; url?: string };
const SRC_SCORECARD: Source = {
  title: "College Scorecard",
  detail: "U.S. Department of Education — most recent institutional data release.",
  url: "https://collegescorecard.ed.gov",
};
const SRC_CDS: Source = {
  title: "Common Data Set 2023–2024",
  detail: "Section C — First-Time, First-Year (Freshman) Admission, as published by the institution's Office of Institutional Research.",
  url: "#",
};
const SRC_IPEDS: Source = {
  title: "IPEDS",
  detail: "Integrated Postsecondary Education Data System, National Center for Education Statistics.",
  url: "https://nces.ed.gov/ipeds",
};
const SRC_MODEL: Source = {
  title: "Uniseek scoring model",
  detail: "Computed from the factors in your profile against this college's catalog data — not an external publication.",
};

type IconKey = "fit" | "admissions" | "cost" | "life" | "ec" | "consider";
const SECTION_SOURCES: Record<IconKey, Source[]> = {
  fit: [SRC_MODEL],
  admissions: [SRC_CDS, SRC_IPEDS, SRC_SCORECARD],
  cost: [SRC_SCORECARD, { title: "Net Price Calculator", detail: "Institution-provided estimate by income band.", url: "#" }],
  life: [SRC_IPEDS, SRC_CDS],
  ec: [{ title: "Uniseek activity rubric", detail: "Rarity / impact tiers (§8) applied to your listed activities." }],
  consider: [SRC_MODEL, SRC_SCORECARD],
};

// --- Section icons ---------------------------------------------------------------------
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

type TextField = "whyFits" | "admissions" | "cost" | "studentLife" | "thingsToConsider";
type Point = { label: string; note: string };
type Section = { title: string; icon: IconKey; field?: TextField; dynamic?: "ec"; points?: Point[] };

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
    // The gauge + range bars cover acceptance rate, GPA, and test scores; these are the rest.
    points: [
      { label: "Acceptance rate for your major", note: "program-specific rate, where published" },
      { label: "In-state vs out-of-state", note: "residency-adjusted odds" },
      { label: "Course rigor", note: "how your advanced-course load reads" },
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

type OpenSources = (label: string, sources: Source[]) => void;

// Tiny inline source marker — faint until hovered; opens the sources drawer on click.
function Cite({ label, sources, onOpen }: { label: string; sources: Source[]; onOpen: OpenSources }) {
  return (
    <button
      type="button"
      className="ex-cite"
      title={`View source${sources.length > 1 ? "s" : ""}`}
      aria-label={`Sources for ${label}`}
      onClick={() => onOpen(label, sources)}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </svg>
      {sources.length > 1 && <span className="ex-cite__count">{sources.length}</span>}
    </button>
  );
}

// Horizontal "you vs admitted range" bar.
function RangeBar({
  label,
  min,
  max,
  marker,
  markerLabel,
  band,
  color,
  minTick,
  maxTick,
  onSource,
}: {
  label: string;
  min: number;
  max: number;
  marker: number | null;
  markerLabel: string | null;
  band: { lo: number; hi: number };
  color?: string;
  minTick: string;
  maxTick: string;
  onSource: OpenSources;
}) {
  const span = max - min;
  const bandLeft = (clamp(band.lo, min, max) - min) / span * 100;
  const bandWidth = (clamp(band.hi, min, max) - clamp(band.lo, min, max)) / span * 100;
  const markLeft = marker != null ? (clamp(marker, min, max) - min) / span * 100 : null;
  return (
    <div className="rb">
      <div className="rb__label">
        {label}
        <Cite label={label} sources={SECTION_SOURCES.admissions} onOpen={onSource} />
      </div>
      <div className="rb__track">
        <div className="rb__band" style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }} />
        {markLeft != null && (
          <div className="rb__marker" style={{ left: `${markLeft}%` }}>
            <span className="rb__flag" style={color ? { background: color, color: "#0b0918" } : undefined}>{markerLabel}</span>
          </div>
        )}
      </div>
      <div className="rb__scale">
        <span>{minTick}</span>
        <span className="rb__bandnote">admitted middle 50% · sample</span>
        <span>{maxTick}</span>
      </div>
    </div>
  );
}

function AdmissionsViz({
  admitRate,
  gpa,
  sat,
  act,
  onSource,
}: {
  admitRate: number | null;
  gpa: number | null;
  sat: number | null;
  act: number | null;
  onSource: OpenSources;
}) {
  const R = 40;
  const C = 2 * Math.PI * R;
  const arc = admitRate != null ? C * clamp(admitRate, 0.02, 1) : 0;

  const satVal = sat ?? (act != null ? ACT_TO_SAT[clamp(Math.round(act), 9, 36)] ?? null : null);
  const satLabel = satVal != null ? `You ${satVal}${sat == null && act != null ? " (ACT est.)" : ""}` : null;

  return (
    <div className="adm">
      <div className="adm__gauge">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="admGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle cx="50" cy="50" r={R} className="adm__gauge-track" />
          {admitRate != null && (
            <circle
              cx="50"
              cy="50"
              r={R}
              className="adm__gauge-arc"
              strokeDasharray={`${arc} ${C}`}
              transform="rotate(-90 50 50)"
            />
          )}
        </svg>
        <div className="adm__gauge-center">
          <span className="adm__gauge-num">{admitRate != null ? `${Math.round(admitRate * 100)}%` : "—"}</span>
          <span className="adm__gauge-label">
            acceptance
            <Cite label="Acceptance rate" sources={SECTION_SOURCES.admissions} onOpen={onSource} />
          </span>
        </div>
      </div>

      <div className="adm__ranges">
        <RangeBar
          label="Your SAT vs admitted"
          min={400}
          max={1600}
          marker={satVal}
          markerLabel={satLabel}
          band={{ lo: 1380, hi: 1540 }}
          minTick="400"
          maxTick="1600"
          onSource={onSource}
        />
        <RangeBar
          label="Your GPA vs admitted"
          min={0}
          max={4}
          marker={gpa}
          markerLabel={gpa != null ? `You ${gpa.toFixed(2)}` : null}
          band={{ lo: 3.6, hi: 4 }}
          color={gpa != null ? gpaColor(gpa) : undefined}
          minTick="0"
          maxTick="4.0"
          onSource={onSource}
        />
      </div>
    </div>
  );
}

type InsightState = "idle" | "loading" | "ready" | "error";

export default function ExplorerView({ college, onBack }: { college: College; onBack: () => void }) {
  const [activities, setActivities] = useState<string[]>([]);
  const [stu, setStu] = useState<{ gpa: number | null; sat: number | null; act: number | null }>({ gpa: null, sat: null, act: null });
  const [insight, setInsight] = useState<CollegeInsight | null>(null);
  const [insightState, setInsightState] = useState<InsightState>("idle");
  const [drawer, setDrawer] = useState<{ label: string; sources: Source[] } | null>(null);
  const openSources: OpenSources = (label, sources) => setDrawer({ label, sources });

  useEffect(() => {
    let active = true;
    let profileData: WizardData | null = null;
    try {
      const rawProfile = localStorage.getItem("uniseek.profile.v1");
      if (rawProfile) {
        profileData = JSON.parse(rawProfile) as WizardData;
        setActivities((profileData.activities ?? []).map((a) => a.description).filter((d) => d && d.trim() !== ""));
        setStu({
          gpa: num(profileData.gpaUnweighted),
          sat: num(profileData.satSuperscore),
          act: num(profileData.actSuperscore),
        });
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

  const outline = (points: Point[], sources: Source[]) => (
    <ul className="ex-points">
      {points.map((p) => (
        <li key={p.label} className="ex-point">
          <span className="ex-point__label">{p.label}</span>
          <span className="ex-point__note"> — {p.note}</span>
          <Cite label={p.label} sources={sources} onOpen={openSources} />
        </li>
      ))}
    </ul>
  );

  const sectionBody = (s: Section) => {
    const sources = SECTION_SOURCES[s.icon];

    if (s.dynamic === "ec") {
      const items = insight
        ? insight.extracurriculars.map((e) => ({ label: e.activity, note: e.note }))
        : activities.map((a) => ({ label: a, note: "how this activity could strengthen your case here" }));
      if (!items.length)
        return <p className="ex-section__body">Add activities to your profile and we'll cover how each one might help you here.</p>;
      return outline(items, sources);
    }

    if (s.icon === "admissions") {
      return (
        <>
          <AdmissionsViz admitRate={college.overallAdmitRate} gpa={stu.gpa} sat={stu.sat} act={stu.act} onSource={openSources} />
          {s.field && insightState === "ready" && insight ? (
            <p className="ex-section__body">
              {insight[s.field]}
              <Cite label={s.title} sources={sources} onOpen={openSources} />
            </p>
          ) : (
            outline(s.points ?? [], sources)
          )}
        </>
      );
    }

    if (s.field && insightState === "ready" && insight)
      return (
        <p className="ex-section__body">
          {insight[s.field]}
          <Cite label={s.title} sources={sources} onOpen={openSources} />
        </p>
      );
    return outline(s.points ?? [], sources);
  };

  const admissions = SECTIONS.find((s) => s.icon === "admissions")!;
  const rest = SECTIONS.filter((s) => s.icon !== "admissions");

  return (
    <div className="explorer explorer--inline">
      <div className="ex2">
        <div className="ex2__bar">
          <button type="button" className="btn btn--ghost" onClick={onBack}>
            ← Back to list
          </button>
        </div>

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

        {/* Admissions — full-width statistical block (gauge + range bars). */}
        <section className="ex2-card ex2-card--full">
          <div className="ex2-card__head">
            <span className="ex2-card__icon" aria-hidden="true">
              {ICON.admissions}
            </span>
            <h2 className="ex2-card__title">{admissions.title}</h2>
          </div>
          <div className="ex2-card__body">{sectionBody(admissions)}</div>
        </section>

        <div className="ex2-grid">
          {rest.map((s) => (
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

      {drawer && (
        <div className="ex-drawer-overlay" onClick={() => setDrawer(null)}>
          <aside
            className="ex-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Sources for ${drawer.label}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ex-drawer__head">
              <div>
                <p className="ex-drawer__eyebrow">Sources</p>
                <h3 className="ex-drawer__title">{drawer.label}</h3>
              </div>
              <button type="button" className="ex-drawer__close" onClick={() => setDrawer(null)} aria-label="Close sources">
                ✕
              </button>
            </div>

            {drawer.sources.length ? (
              <ol className="ex-src-list">
                {drawer.sources.map((s, i) => (
                  <li key={i} className="ex-src">
                    <span className="ex-src__num">{i + 1}</span>
                    <div className="ex-src__body">
                      <p className="ex-src__title">{s.title}</p>
                      {s.detail && <p className="ex-src__detail">{s.detail}</p>}
                      {s.url && s.url !== "#" && (
                        <a className="ex-src__link" href={s.url} target="_blank" rel="noreferrer">
                          {s.url}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="ex-src-empty">No source recorded yet.</p>
            )}

            <p className="ex-drawer__note">
              In preview mode these are illustrative. Real citations are attached to each point when insights are generated.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
