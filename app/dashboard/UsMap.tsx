"use client";

// US map for "Your stats" — highlights the student's home state (blue) and the goal
// state they set as a hard filter (pink). When they're the same state, it's filled
// with a blue/pink crosshatch instead of one flat colour. Geometry comes from the
// generated Albers-USA path data; nothing here fetches anything.

import { US_MAP_VIEWBOX, US_STATE_PATHS, US_STATE_CENTROIDS } from "./usStatePaths";
import { stateLabel } from "@/app/build/model";

const HOME = "#2563eb"; // --ac-blue
const GOAL = "#e8407f"; // --ac-pink

type Role = "home" | "goal" | "both";

export default function UsMap({
  homeState,
  goalState,
}: {
  homeState: string | null;
  goalState: string | null;
}) {
  const home = homeState && US_STATE_PATHS[homeState] ? homeState : null;
  const goal = goalState && US_STATE_PATHS[goalState] ? goalState : null;
  const same = home != null && home === goal;

  // One entry per highlighted state, drawn on top of the base map so its outline
  // isn't clipped by a neighbour.
  const marked: { code: string; role: Role }[] = same
    ? [{ code: home!, role: "both" }]
    : [
        ...(home ? [{ code: home, role: "home" as Role }] : []),
        ...(goal ? [{ code: goal, role: "goal" as Role }] : []),
      ];

  const fillFor = (role: Role) =>
    role === "both" ? "url(#usmap-both)" : role === "home" ? HOME : GOAL;
  const strokeFor = (role: Role) => (role === "goal" ? GOAL : HOME);

  const describe = () => {
    if (same) return `Map of the United States. ${stateLabel(home!)} is both your home state and your goal state.`;
    const bits = [];
    if (home) bits.push(`home state ${stateLabel(home)}`);
    if (goal) bits.push(`goal state ${stateLabel(goal)}`);
    return bits.length
      ? `Map of the United States highlighting your ${bits.join(" and ")}.`
      : "Map of the United States. No states are highlighted yet.";
  };

  return (
    <div className="usmap">
      <div className="usmap__figure">
        <svg viewBox={US_MAP_VIEWBOX} className="usmap__svg" role="img" aria-label={describe()}>
          <defs>
            {/* Home + goal are the same state: blue field, pink cross-hatch. */}
            <pattern id="usmap-both" width="13" height="13" patternUnits="userSpaceOnUse">
              <rect width="13" height="13" fill={HOME} />
              <path d="M0 0 L13 13 M13 0 L0 13" stroke={GOAL} strokeWidth="2.4" />
            </pattern>
          </defs>

          <g className="usmap__states">
            {Object.entries(US_STATE_PATHS).map(([code, d]) => (
              <path key={code} d={d} className="usmap__state" />
            ))}
          </g>

          {marked.map(({ code, role }) => (
            <g key={code} className="usmap__mark">
              <title>{stateLabel(code)}</title>
              <path d={US_STATE_PATHS[code]} fill={fillFor(role)} stroke={strokeFor(role)} strokeWidth="1.4" />
              {/* The code, so a small state is still findable at a glance. */}
              <text
                x={US_STATE_CENTROIDS[code][0]}
                y={US_STATE_CENTROIDS[code][1] + 6}
                textAnchor="middle"
                className="usmap__code"
              >
                {code}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <ul className="usmap__key">
        <li className="usmap__key-item">
          <Swatch role="home" />
          <span className="usmap__key-text">
            <span className="usmap__key-label">Home state</span>
            <span className="usmap__key-value">{home ? stateLabel(home) : "Not set"}</span>
          </span>
        </li>
        <li className="usmap__key-item">
          <Swatch role="goal" />
          <span className="usmap__key-text">
            <span className="usmap__key-label">Goal state</span>
            <span className="usmap__key-value">{goal ? stateLabel(goal) : "No state filter"}</span>
          </span>
        </li>
        {same && (
          <li className="usmap__key-item">
            <Swatch role="both" />
            <span className="usmap__key-text">
              <span className="usmap__key-label">Both</span>
              <span className="usmap__key-value">Your goal state is your home state</span>
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

// Legend chip. Each swatch carries its own pattern definition so it renders
// independently of the map above it.
function Swatch({ role }: { role: Role }) {
  return (
    <svg viewBox="0 0 16 16" className="usmap__swatch" aria-hidden="true">
      {role === "both" ? (
        <>
          <defs>
            <pattern id="usmap-swatch-both" width="5.5" height="5.5" patternUnits="userSpaceOnUse">
              <rect width="5.5" height="5.5" fill={HOME} />
              <path d="M0 0 L5.5 5.5 M5.5 0 L0 5.5" stroke={GOAL} strokeWidth="1.1" />
            </pattern>
          </defs>
          <rect x="1" y="1" width="14" height="14" rx="3" fill="url(#usmap-swatch-both)" stroke={HOME} strokeWidth="1" />
        </>
      ) : (
        <rect x="1" y="1" width="14" height="14" rx="3" fill={role === "home" ? HOME : GOAL} />
      )}
    </svg>
  );
}
