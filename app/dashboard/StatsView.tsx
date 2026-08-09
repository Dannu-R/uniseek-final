"use client";

// "Your stats" — a snapshot of the academic profile, read live from the wizard state
// (so it reflects the latest quiz answers). Shows an SAT/ACT percentile meter and an
// unweighted-GPA strength bar. Purely a visualization of already-entered data.

import { useEffect, useState } from "react";
import { useWizard } from "@/app/build/WizardProvider";
import { requiredState } from "@/app/build/toPayload";
import UsMap from "./UsMap";

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
      color: "#34d399",
      desc: "Ideal for competitive, highly selective, or Ivy League universities.",
    };
  if (gpa >= 3.5)
    return {
      label: "Good and solid",
      color: "#a78bfa",
      desc: "Meets or exceeds the requirements for many great state schools and regional colleges.",
    };
  if (gpa >= 3.0)
    return {
      label: "Average",
      color: "#f59e0b",
      desc:
        "Keeps many college options open, though more selective schools may want stronger test scores or essays to balance it out.",
    };
  return {
    label: "Needs attention",
    color: "#f472b6",
    desc:
      "May limit your choices, though community colleges and less selective schools will still consider applicants in this range.",
  };
}

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

// Line chart of 10th → 11th → 12th unweighted GPA. Draws the empty grid when there
// aren't at least two years of data (the caller overlays a caption in that case).
function TrendChart({ values }: { values: (number | null)[] }) {
  const W = 320;
  const H = 192;
  const padL = 40;
  const padR = 18;
  // Top padding has to clear the value label that sits above each dot (~19px of
  // ascent + offset), otherwise a 4.0 point gets its label clipped by the viewBox.
  const padT = 32;
  const padB = 42;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const yMin = 2;
  const yMax = 4;
  const xs = [padL, padL + plotW / 2, padL + plotW];
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
          <line x1={padL} y1={yFor(g)} x2={W - padR} y2={yFor(g)} className="trend__grid" />
          <text x={padL - 8} y={yFor(g) + 3.5} textAnchor="end" className="trend__ylabel">{g.toFixed(1)}</text>
        </g>
      ))}
      {labels.map((l, i) => (
        <text key={l} x={xs[i]} y={H - padB + 24} textAnchor="middle" className="trend__xlabel">{l}</text>
      ))}
      {has && (
        <>
          <path d={line} className="trend__line" />
          {pts.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r="4.5" className="trend__dot" />
              <text x={p.x} y={p.y - 11} textAnchor="middle" className="trend__value">{p.v.toFixed(2)}</text>
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

export default function StatsView({ onEdit }: { onEdit: () => void }) {
  const { data, hydrated } = useWizard();

  const gpa = num(data.gpaUnweighted);
  const sat = num(data.satSuperscore);
  const act = num(data.actSuperscore);

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
  const gpaShown = useCountUp(gpa, mounted);

  if (!hydrated) return <section className="dash__view" />;

  // Speedometer-style gauge: a 300° arc (5/6 of a circle) open at the bottom, filled
  // proportional to the percentile. Rotated so the opening is centered at the bottom.
  const R = 54;
  const C = 2 * Math.PI * R;
  const GAUGE = 5 / 6;
  const trackLen = C * GAUGE;
  const arcLen = mounted && pctl != null ? (C * GAUGE * pctl) / 100 : 0;
  const gpaFill = mounted && gpa != null ? Math.max(0, Math.min(100, (gpa / 4) * 100)) : 0;

  const gradeValues = [num(data.gpaGrade10), num(data.gpaGrade11), num(data.gpaGrade12)];
  const hasTrend = gradeValues.filter((v) => v != null).length >= 2;

  // The goal state is whatever the hard filter resolves to — "in-state only" makes it
  // the home state, which the map then draws as the both-states crosshatch.
  const goalState = requiredState(data);

  return (
    <section className="dash__view">
      <header className="dash__view-head">
        <h1 className="dash__view-title">Your stats</h1>
        <p className="dash__view-sub">A snapshot of your academic profile.</p>
      </header>

      <div className="stat-grid">
        {/* Test-score percentile */}
        <div className="stat-card">
          <h2 className="stat-card__title">Test score percentile</h2>
          {pctl != null ? (
            <>
              <div className="stat-meter">
                <svg viewBox="0 0 128 128" className="stat-meter__svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="statGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
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
              <p className="stat-card__note">
                {fromAct ? `ACT ${act} ≈ SAT ${satEquiv}` : `SAT ${satEquiv}`} — scoring higher than about{" "}
                {pctl}% of test-takers.
              </p>
            </>
          ) : (
            <div className="stat-empty">
              <p className="stat-empty__text">
                {data.notSubmittingScores
                  ? "You've marked yourself test-optional, so there's no percentile to show."
                  : "Add an SAT or ACT score in the quiz to see your percentile."}
              </p>
              <button type="button" className="btn btn--ghost" onClick={onEdit}>
                Edit answers
              </button>
            </div>
          )}
        </div>

        {/* Unweighted GPA strength */}
        <div className="stat-card">
          <h2 className="stat-card__title">Unweighted GPA</h2>
          {gpa != null && tier ? (
            <>
              <div className="stat-gpa">
                <span className="stat-gpa__value">{gpaShown.toFixed(2)}</span>
                <span className="stat-gpa__scale">/ 4.0</span>
              </div>
              <div className="stat-bar">
                <div className="stat-bar__track">
                  <div className="stat-bar__fill" style={{ width: `${gpaFill}%`, background: tier.color }} />
                  {[3.0, 3.5, 3.8].map((t) => (
                    <span key={t} className="stat-bar__tick" style={{ left: `${(t / 4) * 100}%` }} />
                  ))}
                </div>
                <div className="stat-bar__scale">
                  <span>0</span>
                  <span>3.0</span>
                  <span>3.5</span>
                  <span>3.8</span>
                  <span>4.0</span>
                </div>
              </div>
              <div className="stat-tier" style={{ color: tier.color }}>
                {tier.label}
              </div>
              <p className="stat-desc">{tier.desc}</p>
            </>
          ) : (
            <div className="stat-empty">
              <p className="stat-empty__text">Add your unweighted GPA in the quiz to see its strength.</p>
              <button type="button" className="btn btn--ghost" onClick={onEdit}>
                Edit answers
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Where you're coming from and where you're aiming. */}
      <div className="stat-card">
        <h2 className="stat-card__title">Where you're looking</h2>
        <UsMap homeState={data.homeState || null} goalState={goalState} />
        {!data.homeState && (
          <div className="usmap__cta">
            <p className="stat-empty__text">Set your home state in the quiz to see it on the map.</p>
            <button type="button" className="btn btn--ghost" onClick={onEdit}>
              Edit answers
            </button>
          </div>
        )}
      </div>

      {/* Grade trend — 10th → 12th unweighted GPA. */}
      <div className="stat-card">
        <h2 className="stat-card__title">Grade trend</h2>
        <div className={`trend ${hasTrend ? "" : "is-empty"}`}>
          <TrendChart values={gradeValues} />
          {!hasTrend && (
            <div className="trend__empty">
              <p className="trend__empty-text">Take the quiz again and add your year-by-year GPAs to see your grade trend.</p>
              <button type="button" className="btn btn--ghost" onClick={onEdit}>
                Take the quiz again
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Extracurricular summary — placeholder (generated via an API call later). */}
      <div className="stat-card stat-ec">
        <h2 className="stat-card__title">Extracurricular summary</h2>
        <div className="stat-ec__body">
          <div className="stat-ec__icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="24" y1="24" x2="24" y2="8" />
              <line x1="24" y1="24" x2="38" y2="15" />
              <line x1="24" y1="24" x2="37" y2="35" />
              <line x1="24" y1="24" x2="11" y2="36" />
              <line x1="24" y1="24" x2="10" y2="16" />
              <circle cx="24" cy="24" r="5" />
              <circle cx="24" cy="8" r="3" />
              <circle cx="38" cy="15" r="3" />
              <circle cx="37" cy="35" r="3" />
              <circle cx="11" cy="36" r="3" />
              <circle cx="10" cy="16" r="3" />
            </svg>
          </div>
          <div className="stat-ec__content">
            <p className="stat-ec__lead">
              A personalized read on your activities — the throughline across them and how it strengthens
              your applications — will appear here.
            </p>
            <div className="stat-ec__skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className="stat-ec__tag">Summary coming soon</span>
          </div>
        </div>
      </div>
    </section>
  );
}
