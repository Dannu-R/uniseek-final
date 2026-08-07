// Activity tier classification (server-only). The procedures doc (§8) defines EC
// tiers by RARITY — tier 4 = rarest/most elite, tier 1 = most common — and says
// assigning the tier from free text is "the model's job" (§6a philosophy). This
// calls Claude to do exactly that, and also flags major-relevance for field prep
// (§6c, the other open item). Falls back to a neutral tier when no API key is
// configured or the call fails, so scoring always works.

import Anthropic from "@anthropic-ai/sdk";
import { FALLBACK_EC_TIER, type EcTier } from "./ec";

const MODEL = process.env.UNISEEK_CLASSIFIER_MODEL ?? "claude-opus-5";

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

const clampTier = (n: unknown): EcTier => {
  const t = Math.round(Number(n));
  return (t >= 1 && t <= 4 ? t : FALLBACK_EC_TIER) as EcTier;
};

function fallback(count: number): ActivityClassification[] {
  return Array.from({ length: count }, () => ({ tier: FALLBACK_EC_TIER, majorRelevant: false }));
}

// Classify every activity in one call. Returns one result per input activity, in
// order. Never throws — degrades to the neutral fallback.
export async function classifyActivityTiers(
  activities: { description: string }[],
  majorName?: string | null,
): Promise<ActivityClassification[]> {
  if (activities.length === 0) return [];

  const list = activities.map((a, i) => `${i + 1}. ${a.description}`).join("\n");
  const majorClause = majorName
    ? `The student intends to major in ${majorName}. For each activity, also set majorRelevant to true if it is clearly related to that field, else false.`
    : `No major is specified. Set majorRelevant to false for every activity.`;

  try {
    const client = new Anthropic(); // resolves ANTHROPIC_API_KEY / auth profile
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4000,
      output_config: { format: { type: "json_schema", schema: OUTPUT_SCHEMA }, effort: "low" },
      system: RUBRIC,
      messages: [
        {
          role: "user",
          content: `Classify these ${activities.length} activities. Return results in the same order.\n\n${list}\n\n${majorClause}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return fallback(activities.length);

    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return fallback(activities.length);

    const parsed = JSON.parse(text.text) as { activities?: { tier: number; majorRelevant: boolean }[] };
    const results = parsed.activities ?? [];

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
