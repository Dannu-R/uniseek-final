// §2.2 net price, residency-aware (out-of-state cost spec). Scorecard's net price is
// reported for in-state students at publics; a nonresident pays the tuition premium
// on top. Privates charge one rate, so their premium is 0 and nothing changes.

import type { IncomeBand } from "./filters";

export type Residency = "in-state" | "out-of-state";
export type NetPriceBasis = "published" | "out-of-state estimate" | "in-state (premium unknown)";

// Which pool the student is in. Null when either state is unknown.
export function residencyFor(homeState: string | null | undefined, collegeState: string | null | undefined): Residency | null {
  if (!homeState || !collegeState) return null;
  return homeState === collegeState ? "in-state" : "out-of-state";
}

export interface StudentNetPrice {
  price: number | null; // what the budget filter and the UI use; null = unknown
  basis: NetPriceBasis;
  premium: number | null; // nonresident tuition premium; null = tuition unknown
}

export function studentNetPrice(input: {
  incomeBand?: IncomeBand | null;
  bands: Partial<Record<IncomeBand, number | null>>;
  average?: number | null;
  residency: Residency | null;
  tuitionInState?: number | null;
  tuitionOutOfState?: number | null;
}): StudentNetPrice {
  const banded = input.incomeBand ? input.bands[input.incomeBand] : null;
  const published = banded ?? input.average ?? null;
  const premium = input.tuitionInState != null && input.tuitionOutOfState != null
    ? Math.max(0, input.tuitionOutOfState - input.tuitionInState)
    : null;
  if (published == null) return { price: null, basis: "published", premium };
  if (input.residency !== "out-of-state" || premium === 0) return { price: published, basis: "published", premium };
  if (premium == null) return { price: published, basis: "in-state (premium unknown)", premium: null };
  return { price: published + premium, basis: "out-of-state estimate", premium };
}
