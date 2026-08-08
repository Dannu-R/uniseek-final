// Placeholder results for UI testing — lets the ending screen render without
// calling /api/score (which runs the Claude activity classifier). Toggle via
// NEXT_PUBLIC_USE_PLACEHOLDER_RESULTS in the submit path.

export const USE_PLACEHOLDER_RESULTS =
  process.env.NEXT_PUBLIC_USE_PLACEHOLDER_RESULTS === "true";

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
