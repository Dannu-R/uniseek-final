"use client";

// "Your stats" — the student's academic profile as they entered it, before any college
// is involved. The view answers one question: how strong does my profile look, and
// where am I aiming?
//
// Reading order is deliberate: the figures they typed (the widget row), then the shape
// of the record and where their score lands, then what those facts mean — clearly
// marked as our reading, never mixed into the numbers — then where they're aiming.
// Nothing here is invented: every figure traces back to a quiz answer.

import { useEffect, useState, type ReactNode } from "react";
import { useWizard } from "@/app/build/WizardProvider";
import { requiredState } from "@/app/build/toPayload";
import UsMap from "./UsMap";
import StudentFigure from "@/app/components/3d/StudentFigure";

// Ease a number from 0 → target once `active` turns true (the on-load count-up). Honors
// prefers-reduced-motion by jumping straight to the target.
function useCountUp(target: number | null, active: boolean, duration = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active || target == null) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVal(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setVal(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return val;
}

// SAT total (400–1600) → approximate national percentile. Anchor points interpolated.
const SAT_ANCHORS: [number, number][] = [
  [400, 1], [500, 2], [600, 7], [700, 15], [800, 26], [900, 39], [1000, 53],
  [1050, 60], [1100, 67], [1150, 73], [1200, 78], [1250, 83], [1300, 87],
  [1350, 90], [1400, 94], [1450, 96], [1500, 98], [1550, 99], [1600, 99],
];
function satPercentile(score: number): number {
  const s = Math.max(400, Math.min(1600, score));
  for (let i = 0; i < SAT_ANCHORS.length - 1; i++) {
    const [x0, y0] = SAT_ANCHORS[i];
    const [x1, y1] = SAT_ANCHORS[i + 1];
    if (s >= x0 && s <= x1) {
      const t = x1 === x0 ? 0 : (s - x0) / (x1 - x0);
      return Math.round(y0 + t * (y1 - y0));
    }
  }
  return s <= 400 ? 1 : 99;
}

// ACT composite (9–36) → SAT-equivalent (College Board / ACT concordance).
const ACT_TO_SAT: Record<number, number> = {
  36: 1590, 35: 1540, 34: 1500, 33: 1460, 32: 1430, 31: 1400, 30: 1370, 29: 1340,
  28: 1310, 27: 1280, 26: 1240, 25: 1210, 24: 1180, 23: 1140, 22: 1110, 21: 1080,
  20: 1040, 19: 1010, 18: 970, 17: 930, 16: 890, 15: 850, 14: 800, 13: 760,
  12: 710, 11: 670, 10: 630, 9: 590,
};

function gpaTier(gpa: number): { label: string; color: string; desc: string } {
  if (gpa >= 3.8)
    return {
      label: "Excellent",
      color: "#0f9d76",
      desc: "Ideal for competitive, highly selective, or Ivy League universities.",
    };
  if (gpa >= 3.5)
    return {
      label: "Good and solid",
      color: "#5b2ee5",
      desc: "Meets or exceeds the requirements for many great state schools and regional colleges.",
    };
  if (gpa >= 3.0)
    return {
      label: "Average",
      color: "#c47b0d",
      desc:
        "Keeps many college options open, though more selective schools may want stronger test scores or essays to balance it out.",
    };
  return {
    label: "Needs attention",
    color: "#c72f65",
    desc:
      "May limit your choices, though community colleges and less selective schools will still consider applicants in this range.",
  };
}

// How demanding the schedule is, as a share of what the school actually offers —
// the only honest denominator we have. Absent a course list, we don't guess.
function rigorRead(taken: number, offered: number): { label: string; color: string } {
  const share = taken / offered;
  if (share >= 0.75) return { label: "Very demanding", color: "#0f9d76" };
  if (share >= 0.5) return { label: "Demanding", color: "#5b2ee5" };
  if (share >= 0.25) return { label: "Moderate", color: "#c47b0d" };
  return { label: "Light", color: "#c72f65" };
}

// Bands are named for students, not for the engine.
const BAND_LABEL: Record<string, string> = { reach: "Reach", target: "Match", safety: "Safety" };

const num = (s?: string): number | null => {
  if (s == null || s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

// Ordinal suffix: 1→st, 2→nd, 3→rd, 11→th, 22→nd …
const ord = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

// Line icons for the widget row — one per measure, drawn in the widget's own accent.
const ICON: Record<string, ReactNode> = {
  gpa: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7.5 12 4l9 3.5-9 3.5-9-3.5Z" />
      <path d="M7 10v4.5c0 1.1 2.2 2 5 2s5-.9 5-2V10" />
    </svg>
  ),
  test: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3a9 9 0 1 1-9 9" />
      <path d="M12 3v9l6.5 6.5" />
    </svg>
  ),
  courses: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v14H5.5A1.5 1.5 0 0 0 4 19.5Z" />
      <path d="M19 18v2H5.5" />
    </svg>
  ),
  rank: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="9" r="5" />
      <path d="M9 13.5 8 21l4-2 4 2-1-7.5" />
    </svg>
  ),
  activities: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v5M12 15v5M4 12h5M15 12h5" />
    </svg>
  ),
  service: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  ),
};

// The verdict on the grade line. A tenth of a GPA point either way is the threshold
// for calling it a direction at all — anything smaller is year-to-year noise.
function trendDirection(delta: number): { key: "up" | "steady" | "down"; label: string; arrow: string } {
  if (delta >= 0.1) return { key: "up", label: "Trending up", arrow: "M5 12l5-5 5 5" };
  if (delta <= -0.1) return { key: "down", label: "Trending down", arrow: "M5 8l5 5 5-5" };
  return { key: "steady", label: "Holding steady", arrow: "M4 10h12" };
}

// One widget in the top row. `caption` carries the scale the number sits on, so a
// bare figure never has to stand in for a measurement it can't make on its own.
interface Stat {
  key: string;
  tone: "violet" | "amber" | "blue" | "pink" | "green" | "teal";
  label: string;
  value: string;
  caption: string;
  empty?: boolean;
}

function StatWidget({ stat }: { stat: Stat }) {
  return (
    <div className={`kpi kpi--${stat.tone} ${stat.empty ? "is-empty" : ""}`}>
      <span className="kpi__icon" aria-hidden="true">{ICON[stat.key]}</span>
      <span className="kpi__label">{stat.label}</span>
      <span className="kpi__value">{stat.value}</span>
      <span className="kpi__caption">{stat.caption}</span>
    </div>
  );
}

// Course rigor as a thermostat dial: one tick per AP course the school offers, lit up
// to the number taken. The ticks aren't decoration — each one is a real course, so the
// dial can't imply a precision the underlying count doesn't have.
function RigorDial({ taken, offered, color, active }: {
  taken: number;
  offered: number;
  color: string;
  active: boolean;
}) {
  const CX = 90;
  const CY = 88;
  const R_IN = 58;
  const R_OUT = 78;
  const START = 135; // bottom-left, sweeping up and over to bottom-right
  const SWEEP = 270;

  const ticks = Array.from({ length: offered }, (_, i) => {
    const t = offered === 1 ? 0 : i / (offered - 1);
    const a = ((START + t * SWEEP) * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return {
      x1: CX + R_IN * cos, y1: CY + R_IN * sin,
      x2: CX + R_OUT * cos, y2: CY + R_OUT * sin,
      on: i < taken,
    };
  });

  return (
    <div className="dial">
      <svg viewBox="0 0 180 176" className="dial__svg" role="img"
        aria-label={`${taken} of ${offered} AP courses taken`}>
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            className={`dial__tick ${t.on ? "is-on" : ""}`}
            style={{
              stroke: t.on ? color : undefined,
              opacity: active ? 1 : 0,
              transitionDelay: `${i * 45}ms`,
            }}
          />
        ))}
      </svg>
      <div className="dial__center">
        <span className="dial__num">{taken}</span>
        <span className="dial__of">of {offered} offered</span>
      </div>
    </div>
  );
}

// Line chart of 10th → 11th → 12th unweighted GPA. Draws the empty grid when there
// aren't at least two years of data (the caller overlays a caption in that case).
function TrendChart({ values }: { values: (number | null)[] }) {
  // The viewBox is sized to how the card actually renders, so the type inside stays
  // at its true pixel size instead of being scaled up with the drawing.
  const W = 560;
  const H = 380;
  const padL = 50;
  const padR = 26;
  // Top padding has to clear the value label that sits above each dot (~19px of
  // ascent + offset), otherwise a 4.0 point gets its label clipped by the viewBox.
  const padT = 46;
  const padB = 62;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const yMin = 2;
  const yMax = 4;
  // Three years across a wide card would stretch into a near-flat line. Clustering
  // the points into the middle band keeps the shape of the change readable.
  const spread = plotW * 0.56;
  const mid = padL + plotW / 2;
  const xs = [mid - spread / 2, mid, mid + spread / 2];
  // Rules stop just past the outer points rather than running the full card width,
  // so the plot reads as one compact block instead of a cluster adrift in a grid.
  const gridL = xs[0] - 44;
  const gridR = xs[2] + 44;
  const yFor = (v: number) => padT + plotH * (1 - (Math.max(yMin, Math.min(yMax, v)) - yMin) / (yMax - yMin));
  const grid = [2, 2.5, 3, 3.5, 4];
  const labels = ["10th", "11th", "12th"];
  const pts = values
    .map((v, i) => (v != null ? { x: xs[i], y: yFor(v), v } : null))
    .filter((p): p is { x: number; y: number; v: number } => p != null);
  const has = pts.length >= 2;
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="trend__svg" role="img" aria-label="Grade trend">
      {grid.map((g) => (
        <g key={g}>
          <line x1={gridL} y1={yFor(g)} x2={gridR} y2={yFor(g)} className="trend__grid" />
          <text x={gridL - 10} y={yFor(g) + 4} textAnchor="end" className="trend__ylabel">{g.toFixed(1)}</text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={l} x={xs[i]} y={H - padB + 28} textAnchor="middle" className="trend__xlabel">{l}</text>
      ))}
      {has && (
        <>
          <path d={line} className="trend__line" pathLength={1} />
          {pts.map((p, i) => {
            // The end points sit on the plot edges, so a centred label would hang over
            // the y-axis numbers (left) or the card padding (right). Anchor them inward.
            const first = i === 0;
            const last = i === pts.length - 1;
            const anchor = first ? "start" : last ? "end" : "middle";
            const dx = first ? -4 : last ? 4 : 0;
            return (
              // Each point lands just after the line has drawn past it.
              <g key={i} className="trend__pt" style={{ animationDelay: `${0.45 + i * 0.22}s` }}>
                <circle cx={p.x} cy={p.y} r="5" className="trend__dot" />
                <text x={p.x + dx} y={p.y - 13} textAnchor={anchor} className="trend__value">
                  {p.v.toFixed(2)}
                </text>
              </g>
            );
          })}
        </>
      )}
    </svg>
  );
}

interface College {
  collegeId: string;
  name: string;
  band: "reach" | "target" | "safety";
}

export default function StatsView({
  onEdit,
  name,
  saved,
  recommended,
}: {
  onEdit: () => void;
  name: string | null;
  saved: College[];
  recommended: College[];
}) {
  const { data, hydrated } = useWizard();

  const gpa = num(data.gpaUnweighted);
  const sat = num(data.satSuperscore);
  const act = num(data.actSuperscore);
  const apTaken = num(data.apCoursesTaken);
  const apOffered = data.apOfferedUnsure ? null : num(data.apCoursesOffered);
  const rank = data.schoolDoesNotRank ? null : num(data.classRank);
  const classSize = data.schoolDoesNotRank ? null : num(data.classSize);
  const serviceHours = num(data.volunteerHoursPerYear);
  const activities = data.activities.filter((a) => a.description.trim() !== "");

  // Prefer a real SAT; otherwise convert an ACT to its SAT-equivalent.
  let satEquiv: number | null = sat;
  let fromAct = false;
  if (satEquiv == null && act != null) {
    const a = Math.max(9, Math.min(36, Math.round(act)));
    satEquiv = ACT_TO_SAT[a] ?? null;
    fromAct = satEquiv != null;
  }
  const pctl = satEquiv != null ? satPercentile(satEquiv) : null;
  const tier = gpa != null ? gpaTier(gpa) : null;

  // On-load animations: trigger just after mount so the fills transition from 0 and the
  // numbers count up. (Hooks run before any early return.)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 60);
    return () => clearTimeout(id);
  }, []);
  const pctlShown = useCountUp(pctl, mounted);

  if (!hydrated) return <section className="dash__view" />;

  // Speedometer-style gauge: a 300° arc (5/6 of a circle) open at the bottom, filled
  // proportional to the percentile. Rotated so the opening is centered at the bottom.
  const R = 54;
  const C = 2 * Math.PI * R;
  const GAUGE = 5 / 6;
  const trackLen = C * GAUGE;
  const arcLen = mounted && pctl != null ? (C * GAUGE * pctl) / 100 : 0;

  const gradeValues = [num(data.gpaGrade10), num(data.gpaGrade11), num(data.gpaGrade12)];
  const knownGrades = gradeValues.filter((v): v is number => v != null);
  const hasTrend = knownGrades.length >= 2;
  const trendDelta = hasTrend ? knownGrades[knownGrades.length - 1] - knownGrades[0] : 0;
  const direction = trendDirection(trendDelta);

  // The goal state is whatever the hard filter resolves to — "in-state only" makes it
  // the home state, which the map then draws as the both-states crosshatch.
  const goalState = requiredState(data);
  const firstName = name?.trim().split(/\s+/)[0] ?? null;

  // ---- The widget row: only what the student actually entered. ----
  const rankPct = rank != null && classSize != null && classSize > 0
    ? Math.max(1, Math.round((rank / classSize) * 100))
    : null;

  const stats: Stat[] = [
    {
      key: "rank",
      tone: "pink",
      label: "Class rank",
      value: rankPct != null ? `top ${rankPct}%` : "—",
      caption:
        rankPct != null
          ? `${rank} of ${classSize}`
          : data.schoolDoesNotRank
            ? "school doesn't rank"
            : "not entered",
      empty: rankPct == null,
    },
    {
      key: "activities",
      tone: "green",
      label: "Activities",
      value: String(activities.length),
      caption: activities.length ? "in your profile" : "none added",
      empty: activities.length === 0,
    },
    {
      key: "service",
      tone: "teal",
      label: "Service",
      value: String(serviceHours ?? 0),
      caption: "hours a year",
      empty: serviceHours == null,
    },
  ];

  // ---- Interpretation. Kept apart from the numbers above, and phrased as a reading. ----
  const reads: string[] = [];
  if (tier) reads.push(`Your GPA is ${tier.label.toLowerCase()} for college applications. ${tier.desc}`);
  if (hasTrend && trendDelta >= 0.1)
    reads.push("Your grades climb year over year, which admissions officers read as momentum.");
  if (hasTrend && trendDelta <= -0.1)
    reads.push("Your grades slipped after 10th grade. A strong senior year, or a short explanation in your application, carries weight here.");
  if (pctl != null && pctl >= 90)
    reads.push("Your test score sits near the top of the national range — it's a strength worth submitting.");
  if (pctl != null && pctl < 60)
    reads.push("Your test score is below the middle range at selective colleges. Test-optional schools may suit your list better.");
  if (data.notSubmittingScores)
    reads.push("You've marked yourself test-optional, so we lean on your GPA and coursework instead.");

  return (
    <section className="dash__view stat-bento">
      {/* ---- Where the list stands, before any of the detail. ----------- */}
      <div className="stat-card tile--full tile--ink welcome">
        <div className="welcome__head">
          <h2 className="welcome__greet">Welcome back{firstName ? `, ${firstName}` : ""}</h2>
          <p className="welcome__sub">
            {recommended.length
              ? "Here's where your list stands today."
              : "Answer the quiz and we'll build your list — this is what we know so far."}
          </p>
        </div>

        <div className="welcome__body">
          <div className="welcome__figures">
            <div className="welcome__figure">
              <span className="welcome__num">{recommended.length}</span>
              <span className="welcome__cap">colleges recommended</span>
            </div>
            <div className="welcome__figure">
              <span className="welcome__num">{saved.length}</span>
              <span className="welcome__cap">saved so far</span>
            </div>
            {recommended.length > 0 && (
              <div className="welcome__bands">
                {(["reach", "target", "safety"] as const).map((b) => (
                  <span key={b} className={`welcome__band welcome__band--${b}`}>
                    {recommended.filter((c) => c.band === b).length} {BAND_LABEL[b]}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="welcome__saved">
            <h3 className="welcome__saved-title">Saved colleges</h3>
            {saved.length ? (
              <ul className="welcome__list">
                {saved.slice(0, 5).map((c) => (
                  <li key={c.collegeId} className="welcome__item">
                    <span className="welcome__item-name">{c.name}</span>
                    <span className={`welcome__chip welcome__chip--${c.band}`}>{BAND_LABEL[c.band]}</span>
                  </li>
                ))}
                {saved.length > 5 && (
                  <li className="welcome__more">+{saved.length - 5} more in Saved colleges</li>
                )}
              </ul>
            ) : (
              <p className="welcome__empty">
                Nothing saved yet. Bookmark a college from your list and it'll show up here with its category.
              </p>
            )}
          </div>
        </div>

        <StudentFigure />
      </div>

      {/* ---- The feature: the shape of the whole record. ---------------- */}
      <div className="stat-card tile--feature">
        <div className="stat-card__head">
          <h2 className="stat-card__title">Grade trend</h2>
          {hasTrend && (
            <span className={`trend-badge trend-badge--${direction.key}`}>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={direction.arrow} />
              </svg>
              {direction.label}
            </span>
          )}
        </div>
        <div className={`trend ${hasTrend ? "" : "is-empty"}`}>
          <TrendChart values={gradeValues} />
          {!hasTrend && (
            <div className="trend__empty">
              <p className="trend__empty-text">Add your year-by-year GPAs in the quiz to see the shape of your record.</p>
            </div>
          )}
        </div>
      </div>

      {/* ---- The score, a full-height column of its own. ---------------- */}
      <div className="stat-card dial-tile tile--violet tile--tall">
        <h2 className="stat-card__title">{fromAct ? "ACT score" : "SAT score"}</h2>
        <div className="dial-tile__body">
          {pctl != null ? (
            <>
              <div className="stat-meter">
                <svg viewBox="0 0 128 128" className="stat-meter__svg" aria-hidden="true">
                  <circle
                    cx="64"
                    cy="64"
                    r={R}
                    className="stat-meter__track"
                    strokeDasharray={`${trackLen} ${C}`}
                    transform="rotate(120 64 64)"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={R}
                    className="stat-meter__arc"
                    strokeDasharray={`${arcLen} ${C}`}
                    transform="rotate(120 64 64)"
                  />
                </svg>
                <div className="stat-meter__center">
                  <span className="stat-meter__label">percentile</span>
                  <span className="stat-meter__num">
                    {Math.round(pctlShown)}
                    <sup>{ord(Math.round(pctlShown))}</sup>
                  </span>
                </div>
              </div>
              <div className="score">
                <span className="score__num">{fromAct ? act : satEquiv}</span>
                <span className="score__label">{fromAct ? "ACT composite" : "SAT superscore"}</span>
              </div>
              <p className="dial-tile__note">
                {fromAct && `Equivalent to an SAT ${satEquiv}. `}Higher than about {pctl}% of SAT
                test-takers nationally.
              </p>
            </>
          ) : (
            <div className="dial-tile__empty">
              <span className="dial-tile__ring" aria-hidden="true" />
              <p className="dial-tile__note">
                {data.notSubmittingScores
                  ? "You're applying test-optional, so there's no score to place."
                  : "Add an SAT or ACT score in the quiz to see where you land nationally."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ---- The two standing measures, stacked beside the feature. ----- */}
      <div className="stat-card">
        <h2 className="stat-card__title">Unweighted GPA</h2>
        {gpa != null && tier ? (
          <div className="card__body">
            <div className="gpa__value">
              <span className="gpa__num">{gpa.toFixed(2)}</span>
              <span className="gpa__scale">/ 4.0</span>
            </div>
            <div className="gpa__track">
              <span
                className="gpa__fill"
                style={{ width: `${mounted ? (gpa / 4) * 100 : 0}%`, background: tier.color }}
              />
              {[3.0, 3.5, 3.8].map((t) => (
                <span key={t} className="gpa__tick" style={{ left: `${(t / 4) * 100}%` }} />
              ))}
            </div>
            <div className="gpa__marks">
              <span className="gpa__mark gpa__mark--start">0</span>
              <span className="gpa__mark" style={{ left: "75%" }}>3.0</span>
              <span className="gpa__mark gpa__mark--end">4.0</span>
            </div>
            <p className="gpa__tier" style={{ color: tier.color }}>{tier.label}</p>
          </div>
        ) : (
          <p className="card__empty">Add your GPA in the quiz to see where it sits on the 4.0 scale.</p>
        )}
      </div>

      <div className="stat-card">
        <h2 className="stat-card__title">Course rigor</h2>
        {apTaken != null && apOffered != null && apOffered > 0 ? (
          <div className="card__body card__body--center">
            <RigorDial
              taken={apTaken}
              offered={apOffered}
              color={rigorRead(apTaken, apOffered).color}
              active={mounted}
            />
            <p className="gpa__tier" style={{ color: rigorRead(apTaken, apOffered).color }}>
              {rigorRead(apTaken, apOffered).label}
            </p>
          </div>
        ) : (
          <p className="card__empty">
            {apTaken != null
              ? `You've taken ${apTaken} AP ${apTaken === 1 ? "course" : "courses"}. Add how many your school offers to see how demanding that is.`
              : "Add your AP course count in the quiz to see how demanding your schedule is."}
          </p>
        )}
      </div>
      {/* ---- The remaining figures, at a glance. ------------------------ */}
      <div className="kpi-row">
        {stats.map((st) => (
          <StatWidget key={st.key} stat={st} />
        ))}
      </div>

      {/* ---- Our reading, kept separate from the figures above. --------- */}
      <div className="stat-card tile--half">
        <h2 className="stat-card__title">What this means</h2>
        <p className="read__caveat">Our reading — not a score, and not a prediction.</p>
        {reads.length ? (
          <ul className="read__list">
            {reads.map((r) => (
              <li key={r} className="read__item">{r}</li>
            ))}
          </ul>
        ) : (
          <p className="read__empty">Once you've entered a GPA or a test score, we'll read it back to you here.</p>
        )}
      </div>

      <div className="stat-card tile--half">
        <h2 className="stat-card__title">Outside the classroom</h2>
        <p className="stat-ec__lead">
          A personalized read on your activities — the throughline across them and how it strengthens your
          applications — will appear here.
        </p>
        <span className="stat-ec__tag">Summary coming soon</span>
      </div>

      {/* ---- Where you're aiming. --------------------------------------- */}
      <div className="stat-card tile--full">
        <h2 className="stat-card__title">Where you're looking</h2>
        <UsMap homeState={data.homeState || null} goalState={goalState} />
        {!data.homeState && (
          <p className="usmap__cta">Set your home state in the quiz to see it on the map.</p>
        )}
      </div>

      <p className="stat-foot">
        Every figure here comes from your quiz answers. Nothing on this page is a prediction of admission.
      </p>
    </section>
  );
}
