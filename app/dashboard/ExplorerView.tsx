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
import dynamic from "next/dynamic";

// WebGL scenes — client-only (no SSR window access), lazy so they never block the view.
const TargetArrow = dynamic(() => import("@/app/components/3d/TargetArrow"), { ssr: false });
const CoinScene = dynamic(() => import("@/app/components/3d/Coin"), { ssr: false });
const BuildingScene = dynamic(() => import("@/app/components/3d/Building"), { ssr: false });
const ExclaimScene = dynamic(() => import("@/app/components/3d/Exclaim"), { ssr: false });
const TrophyScene = dynamic(() => import("@/app/components/3d/Trophy"), { ssr: false });
import { toPayload } from "@/app/build/toPayload";
import { USE_PLACEHOLDER_RESULTS } from "@/app/build/placeholderResult";
import type { WizardData, SettingValue } from "@/app/build/model";
import { FACTORS } from "@/app/build/model";
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

// Small line icons for each outline point — inline SVG (no external assets) so every card
// carries a visual glyph beside its rows instead of a bare bullet.
const svg = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d.split("|").map((p, i) => (
      <path key={i} d={p} />
    ))}
  </svg>
);
const MINI_ICON: Record<string, ReactNode> = {
  // fit
  "Overall match": svg("M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4 7.2 18l.9-5.4L4.2 8.7l5.4-.8L12 3Z"),
  "Admission odds": svg("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z|M8.5 8.5l7 7|M8.6 8.6h.01|M15.4 15.4h.01"),
  "Academic standing": svg("M2 8l10-4 10 4-10 4L2 8Z|M6 10v5c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-5"),
  "Preference match": svg("M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10Z"),
  // cost
  "Net price for your income band": svg("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z|M12 7v10|M14.5 9.3A2.5 2 0 0 0 12.3 8h-.8a2 2 0 0 0 0 4h1a2 2 0 0 1 0 4h-.8a2.5 2 0 0 1-2.2-1.3"),
  "Budget fit": svg("M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z|M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z|M12 11.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Z"),
  "Merit aid": svg("M12 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z|M8.5 13L7.5 21l4.5-2.2L16.5 21l-1-8"),
  // life
  "School size": svg("M4 21V5l8-3 8 3v16|M4 21h16|M9 9h.01|M15 9h.01|M9 13h.01|M15 13h.01|M10 21v-4h4v4"),
  "Class size": svg("M9 4a3.2 3.2 0 1 0 0 6.4A3.2 3.2 0 0 0 9 4Z|M2.5 20a6.5 6.5 0 0 1 13 0|M16.5 5.3a3.2 3.2 0 0 1 0 6.4|M22 20a6.5 6.5 0 0 0-4-6"),
  Housing: svg("M3 11l9-7 9 7|M5 10v10h14V10|M10 20v-6h4v6"),
  "Greek life": svg("M3 21h18|M5 21V10m4 11V10m6 11V10m4 11V10|M3.5 10h17L12 3.5 3.5 10Z"),
  Athletics: svg("M8 3h8v5.5a4 4 0 0 1-8 0V3Z|M8 5H5v1a3 3 0 0 0 3 3|M16 5h3v1a3 3 0 0 1-3 3|M10 15.5v2.5|M14 15.5v2.5|M8 21h8"),
  Setting: svg("M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z|M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"),
  // consider
  "Data confidence": svg("M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z|M12 11v5|M12 8h.01"),
  "Tight filters": svg("M3 5h18l-7 8.2V20l-4-2v-4.8L3 5Z"),
  "Trade-offs": svg("M12 3v18|M5 21h14|M12 6l-7 2 3 5.5a3 3 0 0 1-6 0L5 8|M12 6l7 2-3 5.5a3 3 0 0 0 6 0L19 8"),
  // admissions (hero)
  "Acceptance rate for your major": svg("M4 20V4|M4 20h16|M8 16v-4|M12 16V9|M16 16v-7"),
  "In-state vs out-of-state": svg("M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z|M9 4v14|M15 6v14"),
  "Course rigor": svg("M5 4h13v14H6a2 2 0 0 0-2 2V6a2 2 0 0 1 1-2Z|M5 18a2 2 0 0 0-1 2|M9 8h6M9 12h5"),
  "Class rank": svg("M9 6h12M9 12h12M9 18h12|M4 6h.01M4 12h.01M4 18h.01"),
};

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
  note,
  color,
  minTick,
  maxTick,
}: {
  label: string;
  min: number;
  max: number;
  marker: number | null;
  markerLabel: string | null;
  band: { lo: number; hi: number } | null;
  note: string;
  color?: string;
  minTick: string;
  maxTick: string;
}) {
  const span = max - min || 1;
  const markLeft = marker != null ? ((clamp(marker, min, max) - min) / span) * 100 : null;
  return (
    <div className="rb">
      <div className="rb__label">{label}</div>
      <div className="rb__track">
        {band && (
          <div
            className="rb__band"
            style={{
              left: `${((clamp(band.lo, min, max) - min) / span) * 100}%`,
              width: `${((clamp(band.hi, min, max) - clamp(band.lo, min, max)) / span) * 100}%`,
            }}
          />
        )}
        {markLeft != null && (
          <div className="rb__marker" style={{ left: `${markLeft}%` }}>
            <span className="rb__flag" style={color ? { background: color } : undefined}>{markerLabel}</span>
          </div>
        )}
      </div>
      <div className="rb__scale">
        <span>{minTick}</span>
        <span className="rb__bandnote">{note}</span>
        <span>{maxTick}</span>
      </div>
    </div>
  );
}

// No admitted-GPA data exists in the catalog, so GPA competitiveness is judged against
// the college's SELECTIVITY: the more selective (lower admit rate), the higher the bar.
function gpaVerdict(
  gpa: number | null,
  admitRate: number | null,
): { label: string; tone: "good" | "mid" | "low" } | null {
  if (gpa == null) return null;
  const r = admitRate ?? 0.5;
  const bar = r < 0.2 ? 3.85 : r < 0.5 ? 3.6 : 3.3;
  if (gpa >= bar) return { label: "Competitive", tone: "good" };
  if (gpa >= bar - 0.3) return { label: "Borderline", tone: "mid" };
  return { label: "Below typical", tone: "low" };
}

function AdmissionsViz({
  admitRate,
  band,
  gpa,
  sat,
  act,
  satP25,
  satP75,
}: {
  admitRate: number | null;
  band: College["band"];
  gpa: number | null;
  sat: number | null;
  act: number | null;
  satP25: number | null;
  satP75: number | null;
}) {
  const satVal = sat ?? (act != null ? ACT_TO_SAT[clamp(Math.round(act), 9, 36)] ?? null : null);
  const satLabel = satVal != null ? `You ${satVal}${sat == null && act != null ? " (ACT est.)" : ""}` : null;

  // Real admitted middle-50% band when the catalog has it; otherwise no band.
  const satBand = satP25 != null && satP75 != null ? { lo: satP25, hi: satP75 } : null;
  // Zoom the axis around the band + the student's marker so content spreads across the
  // bar instead of cramming into the far right for a strong applicant.
  const pts = [satVal, satP25, satP75].filter((x): x is number => x != null);
  const satMin = pts.length ? Math.max(400, Math.floor((Math.min(...pts) - 120) / 20) * 20) : 400;
  const satMax = pts.length ? Math.min(1600, Math.ceil((Math.max(...pts) + 120) / 20) * 20) : 1600;

  const verdict = gpaVerdict(gpa, admitRate);
  return (
    <div className="adm">
      <AcceptanceGauge admitRate={admitRate} band={band} />
      <div className="adm__ranges">
        <RangeBar
          label="Your SAT vs admitted"
          min={satMin}
          max={satMax}
          marker={satVal}
          markerLabel={satLabel}
          band={satBand}
          note={satBand ? "admitted middle 50%" : "no published SAT range"}
          minTick={String(satMin)}
          maxTick={String(satMax)}
        />
        <div className="gpa-verdict">
          <div className="rb__label">Your GPA</div>
          {gpa != null ? (
            <div className="gpa-verdict__row">
              <span className="gpa-verdict__value" style={{ color: gpaColor(gpa) }}>{gpa.toFixed(2)}</span>
              <span className="gpa-verdict__scale">/ 4.0</span>
              {verdict && (
                <span className={`gpa-verdict__badge gpa-verdict__badge--${verdict.tone}`}>{verdict.label}</span>
              )}
            </div>
          ) : (
            <p className="ex-section__body">Add your GPA to see how it reads here.</p>
          )}
          <div className="rb__scale">
            <span className="rb__bandnote">no published GPA range — judged against this college&apos;s selectivity</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const SETTING_LABEL: Record<SettingValue, string> = { URBAN: "Urban", SUBURBAN: "Suburban", RURAL: "Rural" };

// The soft preferences the student actually weighted, as short chips — for directional
// factors the chip reads the leaning (e.g. "Large" schools), for magnitude ones the
// factor itself. A compact, honest picture of "what you care about" for the fit card.
function priorityChips(data: WizardData): string[] {
  const chips: string[] = [];
  for (const f of FACTORS) {
    const p = data.prefs?.[f.key];
    if (!p || !p.weight) continue;
    const low = (f as { low?: string }).low;
    const high = (f as { high?: string }).high;
    if (f.kind === "directional" && low && high) {
      const d = p.direction ?? 2;
      chips.push(d > 2 ? high : d < 2 ? low : f.label);
    } else {
      chips.push(f.label);
    }
  }
  if (data.setting?.weight && data.setting.selections?.length) {
    for (const s of data.setting.selections) chips.push(SETTING_LABEL[s]);
  }
  return chips;
}

// Net price against the budget the student set, as a donut: the arc fills to the share of
// budget the price consumes. Green when it clears the budget, warning pink when it doesn't.
function BudgetDonut({ net, budget }: { net: number; budget: number }) {
  const frac = budget > 0 ? Math.min(net / budget, 1) : 0;
  const under = net <= budget;
  const tone = under ? "var(--ac-green)" : "var(--ac-pink)";
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <div className="ex-donut">
      <div className="ex-donut__ring">
        <svg viewBox="0 0 72 72" aria-hidden="true">
          <circle cx="36" cy="36" r={R} fill="none" stroke="var(--ac-sunk)" strokeWidth="8" />
          <circle
            cx="36"
            cy="36"
            r={R}
            fill="none"
            stroke={tone}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${frac * C} ${C}`}
            transform="rotate(-90 36 36)"
          />
        </svg>
        <span className="ex-donut__pct">{Math.round(frac * 100)}%</span>
      </div>
      <div className="ex-donut__meta">
        <span className="ex-donut__value" style={{ color: tone }}>{money(net)}</span>
        <span className="ex-donut__label">
          net price · {under ? "under" : "over"} your {money(budget)} budget
        </span>
      </div>
    </div>
  );
}

type InsightState = "idle" | "loading" | "ready" | "error";

// The way back lives in the view bar above, alongside the college's name — the same
// place every other view keeps its primary action.
export default function ExplorerView({ college }: { college: College }) {
  const [activities, setActivities] = useState<string[]>([]);
  const [stu, setStu] = useState<{ gpa: number | null; sat: number | null; act: number | null; ap: number | null }>({ gpa: null, sat: null, act: null, ap: null });
  const [insight, setInsight] = useState<CollegeInsight | null>(null);
  const [insightState, setInsightState] = useState<InsightState>("idle");
  const [stats, setStats] = useState<{ satP25: number | null; satP75: number | null } | null>(null);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [budget, setBudget] = useState<number | null>(null);
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
          ap: num(profileData.apCoursesTaken),
        });
        setPriorities(priorityChips(profileData));
        setBudget(num(profileData.budgetMaxNetPrice));
      }
    } catch {
      /* ignore */
    }

    if (USE_PLACEHOLDER_RESULTS) {
      setInsightState("idle");
      return;
    }

    const cacheKey = `uniseek.insight.${college.collegeId}`;
    const statsKey = `uniseek.stats.${college.collegeId}`;
    const cachedStats = sessionStorage.getItem(statsKey);
    if (cachedStats) {
      try {
        setStats(JSON.parse(cachedStats));
      } catch {
        /* ignore */
      }
    }
    const cached = sessionStorage.getItem(cacheKey);
    // Only serve from cache when we also have the college stats for the visual; otherwise
    // fall through to the fetch so a pre-fix cached insight still picks up the SAT band.
    if (cached && cachedStats) {
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
        if (d.stats) {
          setStats(d.stats);
          try {
            sessionStorage.setItem(statsKey, JSON.stringify(d.stats));
          } catch {
            /* ignore quota */
          }
        }
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
          {MINI_ICON[p.label] && <span className="ex-point__ic" aria-hidden="true">{MINI_ICON[p.label]}</span>}
          <span className="ex-point__text">
            <span className="ex-point__label">{p.label}</span>
            <span className="ex-point__note"> — {p.note}</span>
          </span>
        </li>
      ))}
    </ul>
  );

  const sectionBody = (s: Section) => {
    if (s.dynamic === "ec") {
      // Numbered badges give each activity a distinct visual anchor (a ranked-list feel).
      // Once insights exist each activity carries its own read; until then they stand alone.
      const actList = (items: { label: string; note?: string }[]) => (
        <ol className="ex-acts">
          {items.map((it, i) => (
            <li key={it.label} className="ex-act">
              <span className="ex-act__num">{i + 1}</span>
              <span className="ex-act__body">
                <span className="ex-act__label">{it.label}</span>
                {it.note && <span className="ex-act__note"> — {it.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      );
      if (insight) {
        const items = insight.extracurriculars.map((e) => ({ label: e.activity, note: e.note }));
        return items.length ? actList(items) : <p className="ex-section__body">Nothing to add here yet.</p>;
      }
      if (!activities.length)
        return <p className="ex-section__body">Add activities to your profile and we'll cover how each one might help you here.</p>;
      return (
        <>
          <p className="ex-section__body">We'll read each of these against what this college looks for.</p>
          {actList(activities.map((a) => ({ label: a })))}
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
  // The band verdict is carried by the stamp, so it's dropped from the figures here.
  const facts: { label: string; value: string }[] = [
    { label: "Acceptance rate", value: pct(college.overallAdmitRate) },
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

  // Each section's still 3D model. Tall tiles get it as a top slot; the wide banners
  // (cost, consider) get it beside the text.
  const VIZ: Partial<Record<IconKey, typeof TargetArrow>> = {
    fit: TargetArrow,
    life: BuildingScene,
    ec: TrophyScene,
    cost: CoinScene,
    consider: ExclaimScene,
  };

  const renderSection = (key: IconKey) => {
    const s = SECTIONS[key];
    const Viz = VIZ[key];
    const isBanner = key === "cost" || key === "consider";

    const content = (
      <>
        {key === "fit" && priorities.length > 0 && (
          <div className="ex-chips" aria-label="What you care about">
            {priorities.map((p) => (
              <span key={p} className="ex-chip">{p}</span>
            ))}
          </div>
        )}
        {key === "cost" && budget != null && college.netPrice != null && (
          <p className="ex-budget-line">
            <strong>{money(college.netPrice)}</strong> net price ·{" "}
            {college.netPrice <= budget ? "under" : "over"} your {money(budget)} budget
          </p>
        )}
        <div className="ex-card__body">{sectionBody(s)}</div>
        {key === "fit" && (stu.gpa != null || stu.sat != null || stu.ap != null) && (
          <div className="ex-snapshot" aria-label="Your profile at a glance">
            <span className="ex-snapshot__eyebrow">Your profile</span>
            <div className="ex-snapshot__row">
              {stu.gpa != null && (
                <div className="ex-snapshot__stat">
                  <b>{stu.gpa.toFixed(2)}</b>
                  <span>GPA</span>
                </div>
              )}
              {stu.sat != null && (
                <div className="ex-snapshot__stat">
                  <b>{stu.sat}</b>
                  <span>SAT</span>
                </div>
              )}
              {stu.ap != null && (
                <div className="ex-snapshot__stat">
                  <b>{stu.ap}</b>
                  <span>APs</span>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );

    return (
      <Reveal key={key}>
        <section className={`ex-card ex-card--${key}`}>
          <div className="ex-card__head">
            <span className="ex-card__icon" aria-hidden="true">{ICON[key]}</span>
            <h2 className="ex-card__title">{s.title}</h2>
            {sourcesButton(s.title, SECTION_SOURCES[key])}
          </div>
          {isBanner ? (
            <div className="ex-banner">
              {Viz && (
                <div className="ex-banner__viz">
                  <Viz className="ex-3d" animate={false} />
                </div>
              )}
              <div className="ex-banner__body">{content}</div>
            </div>
          ) : (
            <>
              {Viz && (
                <div className="ex-3d-slot">
                  <Viz className="ex-3d" animate={false} />
                </div>
              )}
              {content}
            </>
          )}
        </section>
      </Reveal>
    );
  };

  return (
    <div className="explorer explorer--inline">
      <section className="dash__view ex">
        <p className={`ex__status ${insightState === "loading" ? "is-loading" : ""}`}>{banner}</p>

        {/* The hero. One dominant, band-tinted tile carries everything quantitative — the
            headline KPIs, the acceptance dial, and the score bars — so the page opens on a
            clear focal point rather than a strip of equal tiles. Everything below is reading. */}
        <Reveal>
          <section className={`ex-card ex-hero ex-hero--${college.band}`}>
            <div className="ex-card__head">
              <span className="ex-card__icon" aria-hidden="true">{ICON.admissions}</span>
              <h2 className="ex-card__title">Where you stand</h2>
              {sourcesButton("Admissions", SECTION_SOURCES.admissions)}
            </div>

            <div className="ex-hero__top">
              <div className="ex-hero__kpis">
                {facts.map((f) => (
                  <div key={f.label} className="ex-kpi">
                    <span className="ex-kpi__label">{f.label}</span>
                    <span className="ex-kpi__value">{f.value}</span>
                  </div>
                ))}
              </div>
              {/* The signature: an inked verdict stamp — the dramatic, eye-grabbing accent. */}
              <div className={`ex-stamp ex-stamp--${college.band}`} aria-hidden="true">
                <span className="ex-stamp__band">{BAND_LABEL[college.band]}</span>
                <span className="ex-stamp__sub">Admissions review</span>
              </div>
            </div>

            <AdmissionsViz
              admitRate={college.overallAdmitRate}
              band={college.band}
              gpa={stu.gpa}
              sat={stu.sat}
              act={stu.act}
              satP25={stats?.satP25 ?? null}
              satP75={stats?.satP75 ?? null}
            />

            <div className="ex-card__body ex-card__body--spaced">{sectionBody(SECTIONS.admissions)}</div>
          </section>
        </Reveal>

        {/* A true heterogeneous bento: explicit grid areas give each section its own size,
            and each carries its own fill (solid violet anchor, ink caution tile, tinted and
            plain surfaces) so no two boxes feel the same. Order here is the mobile stack. */}
        <div className="ex-bento">
          {(["fit", "cost", "life", "ec", "consider"] as IconKey[]).map(renderSection)}
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
