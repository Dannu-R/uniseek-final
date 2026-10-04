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
  programs: {
    // US News Best Colleges 2027 program lists
    "52.0801": { source: "USNEWS", listKey: "business-finance", edition: "2027", size: 46, url: "https://www.usnews.com/best-colleges/rankings/business-finance", fallbackCip: "52.0201" },
    "52.0201": { source: "USNEWS", listKey: "business-overall", edition: "2027", size: 535, url: "https://www.usnews.com/best-colleges/rankings/business-overall" },
    "11.0701": { source: "USNEWS", listKey: "computer-science-overall", edition: "2027", size: 587, url: "https://www.usnews.com/best-colleges/rankings/computer-science-overall" },
    "45.0601": { source: "USNEWS", listKey: "economics-overall", edition: "2027", size: 237, url: "https://www.usnews.com/best-colleges/rankings/economics-overall" },
    "51.3801": { source: "USNEWS", listKey: "nursing-overall", edition: "2027", size: 671, url: "https://www.usnews.com/best-colleges/rankings/nursing-overall" },
    // Niche 2027 lists
    "26.0101": { source: "NICHE", listKey: "best-colleges-for-biology", edition: "2027", size: 1852, url: "https://www.niche.com/colleges/search/best-colleges-for-biology/" },
    "40.0501": { source: "NICHE", listKey: "best-colleges-for-chemistry", edition: "2027", size: 1376, url: "https://www.niche.com/colleges/search/best-colleges-for-chemistry/" },
    "09.0101": { source: "NICHE", listKey: "best-colleges-for-communications", edition: "2027", size: 1833, url: "https://www.niche.com/colleges/search/best-colleges-for-communications/" },
    "14.0901": { source: "NICHE", listKey: "best-colleges-for-engineering", edition: "2027", size: 1279, url: "https://www.niche.com/colleges/search/best-colleges-for-engineering/" }, // shares Niche's combined engineering list
    "14.1001": { source: "NICHE", listKey: "best-colleges-for-engineering", edition: "2027", size: 1279, url: "https://www.niche.com/colleges/search/best-colleges-for-engineering/" }, // shares Niche's combined engineering list
    "14.1901": { source: "NICHE", listKey: "best-colleges-for-engineering", edition: "2027", size: 1279, url: "https://www.niche.com/colleges/search/best-colleges-for-engineering/" }, // shares Niche's combined engineering list
    "23.0101": { source: "NICHE", listKey: "best-colleges-for-english", edition: "2027", size: 1669, url: "https://www.niche.com/colleges/search/best-colleges-for-english/" },
    "27.0101": { source: "NICHE", listKey: "best-colleges-for-math", edition: "2027", size: 1650, url: "https://www.niche.com/colleges/search/best-colleges-for-math/" },
    "45.1001": { source: "NICHE", listKey: "best-colleges-for-political-science", edition: "2027", size: 1335, url: "https://www.niche.com/colleges/search/best-colleges-for-political-science/" },
    "42.0101": { source: "NICHE", listKey: "best-colleges-for-psychology", edition: "2027", size: 1851, url: "https://www.niche.com/colleges/search/best-colleges-for-psychology/" },
  },
};
