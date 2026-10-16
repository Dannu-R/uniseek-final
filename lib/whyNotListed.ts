// Why a college the student is exploring isn't on their recommended list. Read straight
// from that college's own score (from the same run) and the list itself: no extra data.

export type Band = "reach" | "target" | "safety";

export interface ScoredCollege {
  collegeId: string;
  band: Band;
  odds?: number;
  quality?: number;
  preferenceFit?: number;
  finalScore?: number;
  flags?: string[];
  qualityBasis?: string; // "program-unranked" = not on the major's ranking list
  removedBy?: string[];
  netPrice?: number | null;
  netPriceBasis?: string;
}

const BAND_NOUN: Record<Band, [string, string]> = {
  reach: ["reach", "reaches"],
  target: ["match", "matches"],
  safety: ["safety", "safeties"],
};

const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

// One sentence per hard filter the college failed (see lib/scoring/filters.ts).
function filterReason(filter: string, c: ScoredCollege, budget: number | null): string | null {
  switch (filter) {
    case "price": {
      if (c.netPrice == null) return "It costs more than your budget.";
      const oos = c.netPriceBasis === "out-of-state estimate" ? " as an out-of-state student" : "";
      const over = budget != null ? ` That is over your ${money(budget)} budget.` : " That is over your budget.";
      return `It would cost you about ${money(c.netPrice)} a year${oos}.${over}`;
    }
    case "major":
      return "It doesn't offer your major.";
    case "distance":
      return "It's farther from home than your distance limit.";
    case "state":
      return "It's outside the state you chose.";
    case "religious":
      return "It doesn't match your religious-affiliation preference.";
    default:
      return null;
  }
}

// Returns null when the college IS on the list; otherwise one to three plain sentences.
export function whyNotListed(c: ScoredCollege, list: ScoredCollege[], budget: number | null): string[] | null {
  if (list.some((l) => l.collegeId === c.collegeId)) return null;

  // 1. A hard filter removed it. That's the whole story.
  const filters = (c.removedBy ?? []).map((f) => filterReason(f, c, budget)).filter((r): r is string => r != null);
  if (filters.length > 0) return filters;

  const reasons: string[] = [];

  // 2. Its program is below the major-quality bar (lib/scoring/score.ts).
  const bar = (c.flags ?? []).find((f) => f.startsWith("below major-quality bar"));
  const barMatch = bar?.match(/#(\d+) > #(\d+)/);
  if (barMatch) {
    const program = c.qualityBasis === "program-unranked"
      ? "Its program for your major isn't ranked."
      : `Its program for your major is ranked #${barMatch[1]}.`;
    reasons.push(`${program} For a student with your profile, the list only includes programs ranked #${barMatch[2]} or better.`);
    return reasons;
  }

  // 3. It cleared everything, but the colleges in its band scored higher.
  const inBand = list.filter((l) => l.band === c.band);
  const [one, many] = BAND_NOUN[c.band];
  if (inBand.length === 0) {
    reasons.push("It scored lower overall than the colleges on your list.");
    return reasons;
  }
  reasons.push(
    inBand.length === 1
      ? `Your list shows 1 ${one}, and it scored higher overall than this college.`
      : `Your list shows ${inBand.length} ${many}, and each scored higher overall than this college.`,
  );

  // Name the factor where it falls furthest behind the listed colleges in its band.
  const avg = (pick: (s: ScoredCollege) => number | undefined) => {
    const vals = inBand.map(pick).filter((v): v is number => v != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };
  const gaps = [
    { text: `its program for your major is weaker than at the ${many} on your list`, own: c.quality, listed: avg((s) => s.quality) },
    { text: `your admission odds are lower than at the ${many} on your list`, own: c.odds, listed: avg((s) => s.odds) },
    { text: `it fits your preferences less well than the ${many} on your list`, own: c.preferenceFit, listed: avg((s) => s.preferenceFit) },
  ]
    .filter((g) => g.own != null && g.listed != null)
    .map((g) => ({ text: g.text, gap: g.listed! - g.own! }))
    .sort((a, b) => b.gap - a.gap);
  if (gaps.length > 0 && gaps[0].gap >= 0.05) {
    reasons.push(`The biggest difference is that ${gaps[0].text}.`);
  }
  return reasons;
}
