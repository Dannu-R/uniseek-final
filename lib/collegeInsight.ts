// Personalized College Explorer insight (server-only). Generated ON DEMAND for a
// single college the student has explicitly chosen to explore — never precomputed
// for the whole list. Grounded strictly in the facts passed in; degrades to null
// (the client then shows the plain outline) when no key is configured or the call
// fails.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.UNISEEK_INSIGHT_MODEL ?? "claude-opus-5";

// Each supporting card is a short list of labelled points rather than one paragraph,
// so the reader can scan it. `label` must be one of the fixed set the card expects
// (the UI keys its icons off it); `detail` is the substance; `source` names the dataset
// a cited figure comes from, or is omitted when the point rests on no published number.
export interface InsightPoint {
  label: string;
  detail: string;
  source?: string;
}

export interface CollegeInsight {
  admissions: string; // the hero narrative — kept as prose
  whyFits: InsightPoint[];
  cost: InsightPoint[];
  studentLife: InsightPoint[];
  extracurriculars: { activity: string; note: string }[];
  thingsToConsider: InsightPoint[];
}

export interface InsightCollege {
  name: string;
  band: "reach" | "target" | "safety";
  overallAdmitRate: number | null;
  majorName: string | null;
  majorAdmitRate: number | null;
  majorProgramRank: number | null;
  inStateAdmitRate: number | null;
  outOfStateAdmitRate: number | null;
  satP25: number | null;
  satP75: number | null;
  netPriceForStudent: number | null;
  enrollmentUndergrad: number | null;
  setting: string | null;
  greekLife: boolean | null;
  athleticsTier: string | null;
  housingOnCampusPct: number | null;
  classSizeUnder20Pct: number | null;
  meritAidPct: number | null;
  studyAbroadRate: number | null;
  coOp: boolean | null;
  religiousAffiliation: string | null;
  state: string | null;
}

export interface InsightStudent {
  gpaUnweighted: number | null;
  apCoursesTaken: number | null;
  satSuperscore: number | null;
  actSuperscore: number | null;
  classRank: number | null;
  classSize: number | null;
  majorName: string | null;
  homeState: string | null;
  budget: number | null;
  activities: string[];
}

const POINT = {
  type: "object",
  additionalProperties: false,
  required: ["label", "detail"],
  properties: {
    label: { type: "string" },
    detail: { type: "string" },
    source: { type: "string" },
  },
} as const;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["admissions", "whyFits", "cost", "studentLife", "extracurriculars", "thingsToConsider"],
  properties: {
    admissions: { type: "string" },
    whyFits: { type: "array", items: POINT },
    cost: { type: "array", items: POINT },
    studentLife: { type: "array", items: POINT },
    thingsToConsider: { type: "array", items: POINT },
    extracurriculars: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["activity", "note"],
        properties: { activity: { type: "string" }, note: { type: "string" } },
      },
    },
  },
} as const;

// The exact point labels each card expects — the UI keys its icon and ordering off
// these, so the model must reuse them verbatim (one point per label, in this order).
const SECTION_LABELS = {
  whyFits: ["Overall match", "Admission odds", "Academic standing", "Preference match"],
  cost: ["Net price for your income band", "Budget fit", "Merit aid"],
  studentLife: ["School size", "Class size", "Housing", "Greek life", "Athletics", "Setting"],
  thingsToConsider: ["Data confidence", "Tight filters", "Trade-offs"],
} as const;

// The only source names a point may carry — each maps to a real dataset the app's
// figures come from. Keeps citations honest and consistent rather than invented.
const SOURCES = [
  "College Scorecard", // admit rates, net price, enrollment, merit-aid %
  "Common Data Set", // SAT middle-50%, class-size mix, housing %, class rank
  "IPEDS", // setting, enrollment, Greek life
  "U.S. News", // program rankings
  "Your profile", // the student's own GPA, scores, rank, budget, activities
] as const;

const SYSTEM = `You are a college advisor writing a personalized briefing for ONE student about ONE
college. An admissions counselor should find it accurate, specific, and useful.

TONE: professional and plain. Write clear, complete sentences. No hype, no slang, no
second-guessing ("maybe", "possibly"); state what the data supports and move on.

GROUNDING:
- Use only the facts provided. Never invent numbers, rankings, or claims.
- Cite the specific figures you were given (rates, prices, ranges, counts) and tie each
  back to this student's own numbers.
- Be honest about weaknesses and trade-offs. Never guarantee or imply admission, and
  never say good fit or strong activities ensure getting in.

STRUCTURE — most sections are a list of labelled points, NOT a paragraph:
- Return ONE point per label given for that section, using the labels VERBATIM and in the
  order given. Each point's "detail" is 2-3 full sentences with real substance and the
  relevant figures — go deeper than a one-line summary.
- If a figure for a point genuinely wasn't provided, say so plainly in the detail (e.g.
  "This college's figure isn't published, so this is read from selectivity") rather than
  guessing a number.
- "admissions" is the exception: return it as a single 3-4 sentence prose paragraph that
  synthesizes the student's odds at this college.
- For "extracurriculars", return one entry per activity the student listed (in order),
  each note 2-3 sentences on how it does or doesn't strengthen their case here.

SOURCES: give each point a "source" naming where its cited figure comes from, chosen ONLY
from this list: ${SOURCES.join(", ")}. Use "Your profile" for the student's own stats.
Omit "source" entirely for a point that rests on no specific published figure.`;

function pct(x: number | null): string | null {
  return x == null ? null : `${Math.round(x * 100)}%`;
}
function line(label: string, val: string | number | boolean | null | undefined): string | null {
  if (val == null || val === "") return null;
  return `- ${label}: ${val}`;
}

function collegeBlock(c: InsightCollege): string {
  return [
    line("Name", c.name),
    line("Recommendation band for this student", { reach: "reach", target: "match", safety: "safety" }[c.band]),
    line("Overall acceptance rate", pct(c.overallAdmitRate)),
    line("Student's intended-major acceptance rate", pct(c.majorAdmitRate)),
    line("Program rank for that major (US News)", c.majorProgramRank),
    line("In-state acceptance rate", pct(c.inStateAdmitRate)),
    line("Out-of-state acceptance rate", pct(c.outOfStateAdmitRate)),
    line("SAT middle 50% (25th–75th)", c.satP25 && c.satP75 ? `${c.satP25}–${c.satP75}` : null),
    line("Net price for this student's income band ($/yr)", c.netPriceForStudent),
    line("Undergrad enrollment", c.enrollmentUndergrad),
    line("Setting", c.setting),
    line("Greek life", c.greekLife == null ? null : c.greekLife ? "yes" : "no"),
    line("Athletics tier", c.athleticsTier),
    line("% classes under 20", pct(c.classSizeUnder20Pct)),
    line("% students on campus", pct(c.housingOnCampusPct)),
    line("% freshmen with merit aid", pct(c.meritAidPct)),
    line("Study-abroad participation", pct(c.studyAbroadRate)),
    line("Co-op program", c.coOp == null ? null : c.coOp ? "yes" : "no"),
    line("Religious affiliation", c.religiousAffiliation),
    line("State", c.state),
  ]
    .filter(Boolean)
    .join("\n");
}

function studentBlock(s: InsightStudent): string {
  return [
    line("Unweighted GPA", s.gpaUnweighted),
    line("AP courses taken", s.apCoursesTaken),
    line("SAT superscore", s.satSuperscore),
    line("ACT superscore", s.actSuperscore),
    line("Class rank", s.classRank && s.classSize ? `${s.classRank} of ${s.classSize}` : null),
    line("Intended major", s.majorName),
    line("Home state", s.homeState),
    line("Max yearly budget ($)", s.budget),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateCollegeInsight(
  college: InsightCollege,
  student: InsightStudent,
): Promise<CollegeInsight | null> {
  const activities =
    student.activities.length > 0
      ? student.activities.map((a, i) => `${i + 1}. ${a}`).join("\n")
      : "(none listed)";

  const labelSpec = (Object.entries(SECTION_LABELS) as [string, readonly string[]][])
    .map(([section, labels]) => `- ${section}: one point per label, in order — ${labels.map((l) => `"${l}"`).join(", ")}`)
    .join("\n");

  const user = `STUDENT\n${studentBlock(student)}\n\nStudent's activities:\n${activities}\n\nCOLLEGE\n${collegeBlock(
    college,
  )}\n\nWrite the personalized briefing as JSON.

Point labels to use VERBATIM (one point each, in this order):
${labelSpec}

"admissions" is a single prose paragraph. Include one extracurriculars entry per listed
activity, in order (empty array if none).`;

  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 6000,
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: "medium" },
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") return null;
    const text = res.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return null;
    return JSON.parse(text.text) as CollegeInsight;
  } catch (err) {
    console.error("college insight generation failed", err);
    return null;
  }
}
