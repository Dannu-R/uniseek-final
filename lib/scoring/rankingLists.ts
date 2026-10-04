// §10b — which published ranking lists feed program_quality, and how long each is.
//
// A major present in RANKING_LISTS.programs means its list HAS BEEN COLLECTED into
// data/rankings/ and imported: a college missing from it is unranked (rank = size + 1).
// A major absent here falls back to the institutional rank (see quality.ts R2).
// Sizes are the "N results" counts shown on each list page.

export type InstitutionalList = "NATIONAL_UNIVERSITIES" | "NATIONAL_LIBERAL_ARTS";

export interface ListMeta {
  edition: string;
  size: number;
}

export interface ProgramList extends ListMeta {
  source: "USNEWS" | "NICHE";
  listKey: string; // the list's slug on its source site
  url: string;
  fallbackCip?: string; // Finance → Business (52.0201) when the specialty list is short
}

export interface RankingLists {
  institutional: Record<InstitutionalList, ListMeta>;
  programs: Record<string, ProgramList>; // keyed by CIP code
}

export const RANKING_LISTS: RankingLists = {
  institutional: {
    NATIONAL_UNIVERSITIES: { edition: "2027", size: 428 },
    NATIONAL_LIBERAL_ARTS: { edition: "2027", size: 206 },
  },
  // Filled in as each list is collected and imported (plan Task 9).
  programs: {},
};
