// Sample quiz answers for demos and manual testing — a complete profile, so every
// card on Home has something real to show rather than an empty state.
//
// Nothing downstream is faked: this is only the intake side. The recommendation
// list, the cost figures and the EC tiers all come out of the real pipeline when
// these answers are scored. Load it with /dashboard?demo in development.

import type { WizardData } from "./model";

export const DEMO_PROFILE: WizardData = {
  // Academics — a strong record that climbs, so the trend badge has a direction.
  gpaUnweighted: "3.87",
  gpaGrade10: "3.70",
  gpaGrade11: "3.88",
  gpaGrade12: "4.00",
  apCoursesTaken: "10",
  apCoursesOffered: "14",
  apOfferedUnsure: false,
  satSuperscore: "1480",
  actSuperscore: "",
  notSubmittingScores: false,
  classRank: "24",
  classSize: "389",
  schoolDoesNotRank: false,

  // Written the way a student would write them — the classifier reads this text.
  activities: [
    {
      description:
        "Captain of the varsity robotics team. Led an 18-person build crew to the state championship two years running, and mentored two rookie teams through their first season.",
    },
    {
      description:
        "Founded a coding club that teaches Python to middle schoolers at the public library — about 30 students a term, run with two other seniors.",
    },
    {
      description:
        "First-chair cellist in the school orchestra and a member of the regional youth symphony since sophomore year.",
    },
    {
      description: "Part-time barista, around 12 hours a week during the school year.",
    },
  ],
  volunteerHoursPerYear: "85",

  // Goals
  majorCip: "11.0701", // Computer Science
  homeState: "IL",
  homeZip: "60614",

  // Hard filters. Left open on state and distance so the run returns a full list;
  // budget is the only real constraint.
  budgetMaxNetPrice: "45000",
  incomeBand: "B48_75K",
  maxDistanceMiles: "",
  stateFilterMode: "ANY",
  goalState: "",
  religiousPreference: "NO_PREFERENCE",

  // Soft preferences — a spread of weights so the preference layer actually moves
  // the ordering instead of every factor sitting at zero.
  prefs: {
    schoolSize: { weight: 2, direction: 3 },
    classSize: { weight: 3, direction: 3 },
    greekLife: { weight: 1, direction: 0 },
    housing: { weight: 2, direction: 4 },
    athletics: { weight: 1, direction: 3 },
    partyScene: { weight: 1, direction: 1 },
    academicSupport: { weight: 3, direction: 2 },
    meritAid: { weight: 3, direction: 2 },
    studyAbroad: { weight: 2, direction: 2 },
    coOp: { weight: 3, direction: 2 },
  },
  setting: { weight: 2, selections: ["URBAN", "SUBURBAN"] },
};
