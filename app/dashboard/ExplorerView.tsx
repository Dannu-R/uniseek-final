"use client";

// College Explorer, rendered INLINE inside a dashboard tab, under the same view bar as
// every other view (the bar carries the college's name and the way back).
//
// The page opens on the one question a student actually came here with — do I stand a
// chance — so "Where you stand" is the feature: the acceptance dial and, beside it, this
// student's own GPA and test score against the admitted middle 50%. The supporting
// sections sit below it, each sized to its own content. Every card cites its sources in
// a sticky side panel. Personalized insight is generated on demand via /api/explore
// (served from the DB if already stored); placeholder mode shows the outline.

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { toPayload } from "@/app/build/toPayload";
import { USE_PLACEHOLDER_RESULTS } from "@/app/build/placeholderResult";
import type { WizardData } from "@/app/build/model";
import type { CollegeInsight } from "@/lib/collegeInsight";
import Reveal from "./Reveal";

interface College {
  collegeId: string;
  name: string;
  band: "reach" | "target" | "safety";
  overallAdmitRate: number | null;
  netPrice?: number | null;
}

const BAND_LABEL: Record<College["band"], string> = { reach: "Reach", target: "Match", safety: "Safety" };
const pct = (x: number | null) => (x == null ? "—" : `${Math.round(x * 100)}%`);
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
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
// The band palette, shared by the dial, the legend and the marker flags — the same three
// colours the rest of the dashboard uses for reach / match / safety.
const C_REACH = "#e8407f";
const C_MATCH = "#6236e8";
const C_SAFETY = "#0f9d76";
const gpaColor = (g: number) => (g >= 3.8 ? C_SAFETY : g >= 3.5 ? C_MATCH : g >= 3.0 ? "#c47b0d" : C_REACH);

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

const SECTIONS: Record<IconKey, Section> = {
  fit: {
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
  admissions: {
    title: "Admissions",
    icon: "admissions",
    field: "admissions",
    points: [
      { label: "Acceptance rate for your major", note: "program-specific rate, where published" },
      { label: "In-state vs out-of-state", note: "residency-adjusted odds" },
      { label: "Course rigor", note: "how your advanced-course load reads" },
      { label: "Class rank", note: "where you sit in your class" },
    ],
  },
  cost: {
    title: "Cost",
    icon: "cost",
    field: "cost",
    points: [
      { label: "Net price for your income band", note: "what families like yours actually pay" },
      { label: "Budget fit", note: "whether it clears the max you set" },
      { label: "Merit aid", note: "non-need scholarships on offer" },
    ],
  },
  life: {
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
  ec: { title: "Extracurricular fit", icon: "ec", dynamic: "ec" },
  consider: {
    title: "Things to consider",
    icon: "consider",
    field: "thingsToConsider",
    points: [
      { label: "Data confidence", note: "where a figure is estimated rather than published" },
      { label: "Tight filters", note: "any of your must-haves this college barely clears" },
      { label: "Trade-offs", note: "honest concerns worth weighing" },
    ],
  },
};
// Admissions is the feature panel above; these are the supporting sections, in the order
// a student weighs them — is it for me, can we pay for it, what's it like, what do I
// bring, and finally what should give me pause.
const ORDER: IconKey[] = ["fit", "cost", "life", "ec", "consider"];

// Half-circle acceptance dial: three tier zones (reach / match / safety) with a needle
// pointing to this college's band, and the acceptance percentage below.
function AcceptanceGauge({ admitRate, band }: { admitRate: number | null; band: College["band"] }) {
  const cx = 100;
  const cy = 100;
  const R = 78;
  const pt = (a: number, r = R) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
  const arc = (a0: number, a1: number) => {
    const [x0, y0] = pt(a0);
    const [x1, y1] = pt(a1);
    return `M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}`;
  };
  const zones: { key: College["band"]; label: string; color: string; a0: number; a1: number }[] = [
    { key: "reach", label: "Reach", color: C_REACH, a0: 180, a1: 120 },
    { key: "target", label: "Match", color: C_MATCH, a0: 120, a1: 60 },
    { key: "safety", label: "Safety", color: C_SAFETY, a0: 60, a1: 0 },
  ];
  const needleAngle = band === "reach" ? 150 : band === "safety" ? 30 : 90;
  const [nx, ny] = pt(needleAngle, R - 18);

  return (
    <div className="gauge">
      <svg viewBox="0 0 200 116" className="gauge__svg" aria-hidden="true">
        {zones.map((z) => (
          <path
            key={z.key}
            d={arc(z.a0, z.a1)}
            stroke={z.color}
            strokeWidth="15"
            fill="none"
            opacity={band === z.key ? 1 : 0.3}
          />
        ))}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#16223f" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="7.5" fill="#16223f" />
        <circle cx={cx} cy={cy} r="3.5" fill="#ffffff" />
      </svg>
      <div className="gauge__pct">{admitRate != null ? `${Math.round(admitRate * 100)}%` : "—"}</div>
      <div className="gauge__cap">acceptance rate</div>
      <div className="gauge__legend">
        {zones.map((z) => (
          <span key={z.key} className={`gauge__leg ${band === z.key ? "is-on" : ""}`}>
            <i style={{ background: z.color }} />
            {z.label}
          </span>
        ))}
      </div>
    </div>
  );
}

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
}) {
  const span = max - min;
  const bandLeft = ((clamp(band.lo, min, max) - min) / span) * 100;
  const bandWidth = ((clamp(band.hi, min, max) - clamp(band.lo, min, max)) / span) * 100;
  const markLeft = marker != null ? ((clamp(marker, min, max) - min) / span) * 100 : null;
  return (
    <div className="rb">
      <div className="rb__label">{label}</div>
      <div className="rb__track">
        <div className="rb__band" style={{ left: `${bandLeft}%`, width: `${bandWidth}%` }} />
        {markLeft != null && (
          <div className="rb__marker" style={{ left: `${markLeft}%` }}>
            <span className="rb__flag" style={color ? { background: color } : undefined}>{markerLabel}</span>
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
  band,
  gpa,
  sat,
  act,
}: {
  admitRate: number | null;
  band: College["band"];
  gpa: number | null;
  sat: number | null;
  act: number | null;
}) {
  const satVal = sat ?? (act != null ? ACT_TO_SAT[clamp(Math.round(act), 9, 36)] ?? null : null);
  const satLabel = satVal != null ? `You ${satVal}${sat == null && act != null ? " (ACT est.)" : ""}` : null;
  return (
    <div className="adm">
      <AcceptanceGauge admitRate={admitRate} band={band} />
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
        />
      </div>
    </div>
  );
}

type InsightState = "idle" | "loading" | "ready" | "error";

// The way back lives in the view bar above, alongside the college's name — the same
// place every other view keeps its primary action.
export default function ExplorerView({ college }: { college: College }) {
  const [activities, setActivities] = useState<string[]>([]);
  const [stu, setStu] = useState<{ gpa: number | null; sat: number | null; act: number | null }>({ gpa: null, sat: null, act: null });
  const [insight, setInsight] = useState<CollegeInsight | null>(null);
  const [insightState, setInsightState] = useState<InsightState>("idle");
  const [drawer, setDrawer] = useState<{ label: string; sources: Source[] } | null>(null);
  const openSources = (label: string, sources: Source[]) => setDrawer({ label, sources });

  // Close the sticky sources panel on Escape or a click outside it (no blocking overlay,
  // so the page keeps scrolling with the panel pinned in view).
  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(null);
    const onDown = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest?.(".ex-drawer")) setDrawer(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [drawer]);

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
    ? "Preview mode — an outline of what this page will cover. Every card cites its sources."
    : insightState === "loading"
      ? "Analyzing this college against your profile…"
      : insightState === "ready"
        ? "Personalized for you. Every card cites its sources."
        : insightState === "error"
          ? "Couldn't generate personalized insights right now — here's an outline."
          : "Build your profile to get personalized insights.";

  const outline = (points: Point[]) => (
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
      // Once insights exist each activity carries its own read. Until then, listing the
      // activities back with an identical "how this could help" line against every one
      // of them just repeats the same sentence four times — so the promise is made once,
      // above the list, and the activities are left to stand as themselves.
      if (insight) {
        const items = insight.extracurriculars.map((e) => ({ label: e.activity, note: e.note }));
        return items.length ? outline(items) : <p className="ex-section__body">Nothing to add here yet.</p>;
      }
      if (!activities.length)
        return <p className="ex-section__body">Add activities to your profile and we'll cover how each one might help you here.</p>;
      return (
        <>
          <p className="ex-section__body">We'll read each of these against what this college looks for.</p>
          <ul className="ex-points">
            {activities.map((a) => (
              <li key={a} className="ex-point">
                <span className="ex-point__label">{a}</span>
              </li>
            ))}
          </ul>
        </>
      );
    }
    if (s.field && insightState === "ready" && insight) return <p className="ex-section__body">{insight[s.field]}</p>;
    return outline(s.points ?? []);
  };

  // Only the figures we actually hold. A tile reading "—" looks like the page failed
  // rather than like data we were never given, so an absent figure gets no tile.
  //
  // The band colour goes on the category tile alone. Tinting all three made the price
  // and the acceptance rate look like verdicts too — a reach college's net price came
  // out in warning pink whatever the number was.
  const facts: { label: string; value: string; band?: boolean }[] = [
    { label: "Acceptance rate", value: pct(college.overallAdmitRate) },
    { label: "Your category", value: BAND_LABEL[college.band], band: true },
    ...(college.netPrice != null
      ? [{ label: "Net price for you", value: money(college.netPrice) }]
      : []),
  ];

  const sourcesButton = (label: string, sources: Source[]) => (
    <button
      type="button"
      className="ex-card__src"
      onClick={() => openSources(label, sources)}
      aria-label={`View sources for ${label}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M9 9h6M9 13h6M9 17h4" />
      </svg>
      Sources
    </button>
  );

  return (
    <div className="explorer explorer--inline">
      <section className="dash__view ex">
        <p className={`ex__status ${insightState === "loading" ? "is-loading" : ""}`}>{banner}</p>

        {/* The quick figures, at the top where they were — the headline numbers for this
            college before any of the reading below. */}
        <dl className="ex-stats">
          {facts.map((f) => (
            <div key={f.label} className={`ex-stat ${f.band ? `ex-stat--${college.band}` : ""}`}>
              <dt className="ex-stat__label">{f.label}</dt>
              <dd className="ex-stat__value">{f.value}</dd>
            </div>
          ))}
        </dl>

        {/* The feature. Everything else on this page is context for it. */}
        <Reveal>
          <section className="ex-card ex-card--feature">
            <div className="ex-card__head">
              <span className="ex-card__icon" aria-hidden="true">{ICON.admissions}</span>
              <h2 className="ex-card__title">Where you stand</h2>
              {sourcesButton("Admissions", SECTION_SOURCES.admissions)}
            </div>

            <AdmissionsViz
              admitRate={college.overallAdmitRate}
              band={college.band}
              gpa={stu.gpa}
              sat={stu.sat}
              act={stu.act}
            />

            <div className="ex-card__body ex-card__body--spaced">{sectionBody(SECTIONS.admissions)}</div>
          </section>
        </Reveal>

        <div className="ex-bento">
          {ORDER.map((key) => {
            const s = SECTIONS[key];
            return (
              <Reveal key={key}>
                <section className={`ex-card ex-card--${key}`}>
                  <div className="ex-card__head">
                    <span className="ex-card__icon" aria-hidden="true">
                      {ICON[key]}
                    </span>
                    <h2 className="ex-card__title">{s.title}</h2>
                    {sourcesButton(s.title, SECTION_SOURCES[key])}
                  </div>
                  <div className="ex-card__body">{sectionBody(s)}</div>
                </section>
              </Reveal>
            );
          })}
        </div>
      </section>

      {drawer &&
        typeof document !== "undefined" &&
        createPortal(
        <aside className="ex-drawer" role="dialog" aria-label={`Sources for ${drawer.label}`}>
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
        </aside>,
          document.body,
        )}
    </div>
  );
}
