// Floating fragments of the product's own UI — a sticky note, a stat card, a
// Reach/Match/Safety pill trio, an academic mark, a fragment of a real dashboard card —
// scattered at the outer edges of a section the way a confident product site shows
// pieces of its own interface as background texture instead of inventing decoration.
// Same outer-thirds placement the hero's doodles use, same pastel/ink palette as the
// rest of the page. The icon marks here are deliberately a *different* set from the
// ones HeroGeo draws in the hero — every decoration on the page should read as its own
// thing, not a repeat of something already seen scrolling past.
//
// Purely decorative (aria-hidden) and hidden below 900px — there's no margin to float
// anything in once the layout stacks to one column.

import type { CSSProperties, ReactNode } from "react";

// Positioning (left/top/right/bottom) plus the --prop-rot / --prop-delay custom
// properties every prop reads, in one plain object — CSSProperties doesn't type custom
// properties, so this is the one cast instead of one at every call site.
export function propStyle(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties;
}

export function PropNote({
  style,
  tone = "yellow",
  children,
}: {
  style?: CSSProperties;
  tone?: "yellow" | "pink" | "blue";
  children: ReactNode;
}) {
  return (
    <div className={`prop prop-note prop-note--${tone}`} style={style} aria-hidden="true">
      <span className="prop-note__pin" />
      <p className="prop-note__text">{children}</p>
    </div>
  );
}

export function PropPills({ style }: { style?: CSSProperties }) {
  return (
    <div className="prop prop-card prop-pills" style={style} aria-hidden="true">
      <span className="prop-pill prop-pill--reach">Reach</span>
      <span className="prop-pill prop-pill--match">Match</span>
      <span className="prop-pill prop-pill--safety">Safety</span>
    </div>
  );
}

export function PropStat({
  style,
  value,
  label,
}: {
  style?: CSSProperties;
  value: string;
  label: string;
}) {
  return (
    <div className="prop prop-card prop-stat" style={style} aria-hidden="true">
      <span className="prop-stat__value">{value}</span>
      <span className="prop-stat__label">{label}</span>
    </div>
  );
}

// A distinct vocabulary from the hero's cap / book / compass / glass, so the two never
// double up: a medal for the values a section stands for, a bullseye for "fits you",
// a lightbulb for a read on the numbers.
type MarkKey = "ribbon" | "target" | "bulb";

const MARKS: Record<MarkKey, ReactNode> = {
  ribbon: (
    <>
      <circle cx="48" cy="36" r="19" className="prop-mark__ink" />
      <circle cx="48" cy="36" r="6" className="prop-mark__ink-fill" />
      <path d="M37,50 L27,80 L48,67 L69,80 L59,50" className="prop-mark__ink" />
    </>
  ),
  target: (
    <>
      <circle cx="48" cy="48" r="31" className="prop-mark__ink" />
      <circle cx="48" cy="48" r="18" className="prop-mark__ink" />
      <circle cx="48" cy="48" r="5" className="prop-mark__ink-fill" />
    </>
  ),
  bulb: (
    <>
      <path
        d="M48,20 a20,20 0 0 1 12,36 q-4,4 -4,10 h-16 q0,-6 -4,-10 a20,20 0 0 1 12,-36 Z"
        className="prop-mark__ink"
      />
      <line x1="40" y1="76" x2="56" y2="76" className="prop-mark__ink" />
      <line x1="42" y1="82" x2="54" y2="82" className="prop-mark__ink" />
      <circle cx="48" cy="44" r="3.2" className="prop-mark__ink-fill" />
    </>
  ),
};

export function PropMark({
  style,
  icon,
  tone = "violet",
}: {
  style?: CSSProperties;
  icon: MarkKey;
  tone?: "violet" | "pink" | "blue" | "gold";
}) {
  return (
    <div className={`prop prop-card prop-mark prop-mark--${tone}`} style={style} aria-hidden="true">
      <svg viewBox="0 0 96 96" className="prop-mark__icon">
        {MARKS[icon]}
      </svg>
    </div>
  );
}

// ---- A fragment of the real dashboard --------------------------------------------
// Not an icon standing in for the product — an actual piece of it, lifted from the SAT
// score dial on /dashboard and given a plausible sample number, the same way PropStat's
// "3.87" is a sample rather than a live figure. `.prop-dash` carries just the CSS
// variables that dashboard class reads (see dashboard.css's `.dash` scope) without any
// of that scope's page-layout rules. The card drops the dial's own title — at this
// size the ring and the number already say "score" on their own, and the freed space
// goes to the ring instead of a redundant label.

const SAT_R = 54;
const SAT_C = 2 * Math.PI * SAT_R; // ≈ 339.3
const SAT_GAUGE = 5 / 6;
const SAT_TRACK_LEN = SAT_C * SAT_GAUGE; // ≈ 282.7
const SAT_PERCENTILE = 87;
const SAT_ARC_LEN = (SAT_TRACK_LEN * SAT_PERCENTILE) / 100; // ≈ 246

export function PropSat({ style }: { style?: CSSProperties }) {
  return (
    <div className="prop prop-dash prop-satcard" style={style} aria-hidden="true">
      <div className="stat-card dial-tile tile--violet">
        <div className="dial-tile__body">
          <div className="stat-meter">
            <svg viewBox="0 0 128 128" className="stat-meter__svg" aria-hidden="true">
              <circle
                cx="64"
                cy="64"
                r={SAT_R}
                className="stat-meter__track"
                strokeDasharray={`${SAT_TRACK_LEN} ${SAT_C}`}
                transform="rotate(120 64 64)"
              />
              <circle
                cx="64"
                cy="64"
                r={SAT_R}
                className="stat-meter__arc"
                strokeDasharray={`${SAT_ARC_LEN} ${SAT_C}`}
                transform="rotate(120 64 64)"
              />
            </svg>
            <div className="stat-meter__center">
              <span className="stat-meter__label">percentile</span>
              <span className="stat-meter__num">
                {SAT_PERCENTILE}
                <sup>th</sup>
              </span>
            </div>
          </div>
          <div className="score">
            <span className="score__num">1310</span>
            <span className="score__label">SAT superscore</span>
          </div>
        </div>
      </div>
    </div>
  );
}
