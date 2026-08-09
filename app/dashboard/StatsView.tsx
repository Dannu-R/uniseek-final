"use client";

// "Your stats" — a snapshot of the academic profile, read live from the wizard state
// (so it reflects the latest quiz answers). Shows an SAT/ACT percentile meter and an
// unweighted-GPA strength bar. Purely a visualization of already-entered data.

import { useWizard } from "@/app/build/WizardProvider";

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

export default function StatsView({ onEdit }: { onEdit: () => void }) {
  const { data, hydrated } = useWizard();
  if (!hydrated) return <section className="dash__view" />;

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

  // Circular meter geometry.
  const R = 54;
  const C = 2 * Math.PI * R;
  const arc = pctl != null ? (C * pctl) / 100 : 0;

  const tier = gpa != null ? gpaTier(gpa) : null;
  const gpaFill = gpa != null ? Math.max(0, Math.min(100, (gpa / 4) * 100)) : 0;

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
                  <circle cx="64" cy="64" r={R} className="stat-meter__track" />
                  <circle
                    cx="64"
                    cy="64"
                    r={R}
                    className="stat-meter__arc"
                    strokeDasharray={`${arc} ${C}`}
                    transform="rotate(-90 64 64)"
                  />
                </svg>
                <div className="stat-meter__center">
                  <span className="stat-meter__num">
                    {pctl}
                    <sup>{ord(pctl)}</sup>
                  </span>
                  <span className="stat-meter__label">percentile</span>
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
                <span className="stat-gpa__value">{gpa.toFixed(2)}</span>
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
    </section>
  );
}
