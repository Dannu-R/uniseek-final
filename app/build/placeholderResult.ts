// Placeholder mode for UI testing — lets the results list AND the College Explorer
// render without spending any Claude API calls (the /api/score activity classifier
// and the /api/explore personalized insight).
//
// Placeholder mode is ON BY DEFAULT and must be explicitly disabled to use real AI:
//   NEXT_PUBLIC_USE_PLACEHOLDER_RESULTS="false"   → real AI (classifier + insight)
// This default matters for the cloud build: NEXT_PUBLIC_* is inlined at build time,
// and the ACR Docker build has no .env, so an unset flag would otherwise fall through.
// Defaulting to placeholders keeps the deployed app from spending API calls.

export const USE_PLACEHOLDER_RESULTS =
  process.env.NEXT_PUBLIC_USE_PLACEHOLDER_RESULTS !== "false";

export const PLACEHOLDER_RESULT = {
  majorRun: true,
  scoredCount: 30,
  skippedCount: 0,
  empty: false,
  blockingFilter: null,
  removedCount: 0,
  list: [
    { collegeId: "cmu", name: "Carnegie Mellon University", band: "reach", overallAdmitRate: 0.1107 },
    { collegeId: "gt", name: "Georgia Institute of Technology", band: "reach", overallAdmitRate: 0.1274 },
    { collegeId: "uiuc", name: "University of Illinois Urbana-Champaign", band: "reach", overallAdmitRate: 0.366 },
    { collegeId: "umich", name: "University of Michigan", band: "target", overallAdmitRate: 0.164 },
    { collegeId: "unc", name: "University of North Carolina at Chapel Hill", band: "target", overallAdmitRate: 0.153 },
    { collegeId: "ucsd", name: "University of California, San Diego", band: "target", overallAdmitRate: 0.24 },
    { collegeId: "purdue", name: "Purdue University", band: "safety", overallAdmitRate: 0.498 },
    { collegeId: "psu", name: "Pennsylvania State University", band: "safety", overallAdmitRate: 0.5533 },
    { collegeId: "osu", name: "Ohio State University", band: "safety", overallAdmitRate: 0.606 },
    { collegeId: "asu", name: "Arizona State University", band: "safety", overallAdmitRate: 0.884 },
  ],
};
