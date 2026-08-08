// Activity tier classification (server-only). The procedures doc (§8) defines EC
// tiers by RARITY — tier 4 = rarest/most elite, tier 1 = most common — and says
// assigning the tier from free text is "the model's job" (§6a philosophy). This
// asks an LLM to do exactly that, and also flags major-relevance for field prep
// (§6c). Falls back to a neutral tier when nothing is configured or the call fails.
//
// Provider precedence: HF_API_KEY → Hugging Face; else Anthropic (ANTHROPIC_API_KEY
// / auth profile); else the neutral fallback. HF is intended for cheap local testing.

import Anthropic from "@anthropic-ai/sdk";
import { FALLBACK_EC_TIER, type EcTier } from "./ec";

const ANTHROPIC_MODEL = process.env.UNISEEK_CLASSIFIER_MODEL ?? "claude-opus-5";
const HF_MODEL = process.env.UNISEEK_HF_MODEL ?? "meta-llama/Llama-3.1-8B-Instruct";
const HF_ENDPOINT = "https://router.huggingface.co/v1/chat/completions";

export interface ActivityClassification {
  tier: EcTier;
  majorRelevant: boolean;
}

const RUBRIC = `You assign each extracurricular activity an EC TIER from 1 to 4, based on
how RARE and distinguished it is (rarity is what the tiers measure):

- Tier 4 — exceptional / rarest: national or international recognition, elite
  selective programs, founding something with real reach, or a truly standout
  achievement. Very few applicants have these.
- Tier 3 — significant: meaningful leadership or achievement (team captain, club
  president/founder, regional awards, sustained high-impact involvement).
- Tier 2 — active: real involvement with some responsibility or a leadership role,
  held with sustained commitment.
- Tier 1 — common: general participation or membership; the most common kind of
  activity.

When unsure between two tiers, choose the lower one. Judge only from the text given.`;

const JSON_INSTRUCTION = `Respond with ONLY a JSON object of the form
{"activities":[{"tier":<1-4>,"majorRelevant":<true|false>}, ...]}
with one entry per activity, in the same order. No prose, no code fences.`;

// JSON schema for the Anthropic structured-output path.
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["activities"],
  properties: {
    activities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["tier", "majorRelevant"],
        properties: {
          tier: { type: "integer", enum: [1, 2, 3, 4] },
          majorRelevant: { type: "boolean" },
        },
      },
    },
  },
} as const;

type RawResult = { tier: number; majorRelevant: boolean };

const clampTier = (n: unknown): EcTier => {
  const t = Math.round(Number(n));
  return (t >= 1 && t <= 4 ? t : FALLBACK_EC_TIER) as EcTier;
};

function fallback(count: number): ActivityClassification[] {
  return Array.from({ length: count }, () => ({ tier: FALLBACK_EC_TIER, majorRelevant: false }));
}

function buildUserMessage(activities: { description: string }[], majorName?: string | null): string {
  const list = activities.map((a, i) => `${i + 1}. ${a.description}`).join("\n");
  const majorClause = majorName
    ? `The student intends to major in ${majorName}. Set majorRelevant to true for an activity only if it is clearly related to that field.`
    : `No major is specified. Set majorRelevant to false for every activity.`;
  return `Classify these ${activities.length} activities.\n\n${list}\n\n${majorClause}`;
}

// Tolerant JSON extraction — strips code fences and grabs the outermost object.
function extractResults(text: string): RawResult[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no JSON object in response");
  const parsed = JSON.parse(body.slice(start, end + 1)) as { activities?: RawResult[] };
  return parsed.activities ?? [];
}

async function viaAnthropic(activities: { description: string }[], majorName?: string | null): Promise<RawResult[]> {
  const client = new Anthropic(); // resolves ANTHROPIC_API_KEY / auth profile
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4000,
    output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA }, effort: "low" },
    system: RUBRIC,
    messages: [{ role: "user", content: buildUserMessage(activities, majorName) }],
  });
  if (response.stop_reason === "refusal") throw new Error("classifier refused");
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no text block in response");
  return extractResults(text.text);
}

async function viaHuggingFace(activities: { description: string }[], majorName?: string | null): Promise<RawResult[]> {
  const res = await fetch(HF_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.HF_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: HF_MODEL,
      temperature: 0,
      max_tokens: 1000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${RUBRIC}\n\n${JSON_INSTRUCTION}` },
        { role: "user", content: buildUserMessage(activities, majorName) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`HF ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("no content in HF response");
  return extractResults(content);
}

// Classify every activity in one call. Returns one result per input activity, in
// order. Never throws — degrades to the neutral fallback.
export async function classifyActivityTiers(
  activities: { description: string }[],
  majorName?: string | null,
): Promise<ActivityClassification[]> {
  if (activities.length === 0) return [];

  try {
    const results = process.env.HF_API_KEY
      ? await viaHuggingFace(activities, majorName)
      : await viaAnthropic(activities, majorName);

    // Align to input length; fill any gaps with the fallback.
    return activities.map((_, i) => {
      const r = results[i];
      return r
        ? { tier: clampTier(r.tier), majorRelevant: !!r.majorRelevant }
        : { tier: FALLBACK_EC_TIER, majorRelevant: false };
    });
  } catch (err) {
    console.error("activity classification failed; using fallback tier", err);
    return fallback(activities.length);
  }
}
