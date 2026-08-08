// Personalized College Explorer insight (server-only). Generated ON DEMAND for a
// single college the student has explicitly chosen to explore — never precomputed
// for the whole list. Grounded strictly in the facts passed in; degrades to null
// (the client then shows the plain outline) when no key is configured or the call
// fails.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.UNISEEK_INSIGHT_MODEL ?? "claude-opus-5";

export interface CollegeInsight {
  whyFits: string;
  admissions: string;
  cost: string;
  studentLife: string;
  extracurriculars: { activity: string; note: string }[];
  thingsToConsider: string;
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

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["whyFits", "admissions", "cost", "studentLife", "extracurriculars", "thingsToConsider"],
  properties: {
    whyFits: { type: "string" },
    admissions: { type: "string" },
    cost: { type: "string" },
    studentLife: { type: "string" },
    thingsToConsider: { type: "string" },
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

const SYSTEM = `You are an honest, grounded college advisor writing a short personalized briefing
for ONE student about ONE college. Rules:
- Use only the facts provided. Never invent numbers or claims.
- Be direct and concise: 2-4 sentences per section, plain language.
- Connect the student's own profile to THIS college specifically.
- Be honest about weaknesses and trade-offs; never guarantee or imply admission, and
  never say strong extracurriculars or good fit ensure getting in.
- For extracurriculars, return one entry per activity the student listed, noting how it
  might (or might not) strengthen their case at this college.`;

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

  const user = `STUDENT\n${studentBlock(student)}\n\nStudent's activities:\n${activities}\n\nCOLLEGE\n${collegeBlock(
    college,
  )}\n\nWrite the personalized briefing as JSON. Include one extracurriculars entry per listed activity (empty array if none).`;

  try {
    const client = new Anthropic();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 3000,
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
