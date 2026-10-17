// What each stored college analysis remembers about when and for whom it was written.
//
// Analyses are never regenerated when the profile changes (that would cost a new AI call
// on every edit). Instead each one keeps a fingerprint of the profile it was written for,
// and the explorer compares it with the current profile to warn that it may be out of date.
// Used on both the server (stamping) and the browser (comparing), so no Node-only APIs.

// The fields added to the stored insight JSON.
export type InsightStamp = {
  generatedAt?: string; // ISO date the analysis was written
  profileKey?: string; // fingerprint of the profile payload it was written for
};

// JSON with object keys sorted at every level, so the same profile always gives the same
// string no matter what order its fields were set in.
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

// A short fingerprint (32-bit FNV-1a hash) of the profile payload. Only ever compared for
// equality, so a simple hash is enough; it isn't a security measure.
export function profileKey(profile: unknown): string {
  const text = stableStringify(profile);
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

// "Oct 15, 2026". Null for a missing or unreadable date.
export function formatInsightDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
