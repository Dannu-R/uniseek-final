// The hero's "clouds": Uniseek's own marks drifting around the headline.
//
// Previously a shared react-three-fiber canvas (a mortarboard, coin, puzzle piece and
// magnifying glass, all lit and floated in 3D). Replaced with flat line-art instead —
// each mark sits inside a thin geometric badge (circle, hexagon, diamond), which reads
// as a college seal or a geometry-class diagram rather than a rendered object. No canvas,
// no WebGL context, no lighting rig — just SVG and a CSS drift, which is all four marks
// need to feel alive.
//
// Everything sits on the outer thirds, same as before. The middle of the hero belongs to
// the headline and the product shot.
//
// Alongside the four sealed marks, a second layer of margin doodles — the kind of thing
// you'd find pencilled next to a page of notes: a scrap of graph paper, a plotted trend
// line, a squiggle. They carry the hero's pastel accents; the marks themselves stay
// mostly ink so the page doesn't turn into confetti.

import type { ReactNode } from "react";
import { Squiggle, Sparkline } from "./Decor";

function Badge({
  className,
  shape,
  children,
}: {
  className: string;
  shape: "circle" | "hex" | "diamond" | "circle-dashed";
  children: ReactNode;
}) {
  return (
    <span className={`hero-geo__item ${className}`} aria-hidden="true">
      <svg viewBox="0 0 96 96" className="hero-geo__badge">
        {shape === "circle" && <circle cx="48" cy="48" r="44" />}
        {shape === "circle-dashed" && <circle cx="48" cy="48" r="40" strokeDasharray="3 7" />}
        {shape === "hex" && <polygon points="48,4 86,26 86,70 48,92 10,70 10,26" />}
        {shape === "diamond" && <polygon points="48,4 92,48 48,92 4,48" />}
        {children}
      </svg>
    </span>
  );
}

function Doodle({
  className,
  viewBox,
  children,
}: {
  className: string;
  viewBox: string;
  children: ReactNode;
}) {
  return (
    <span className={`hero-geo__item hero-geo__doodle ${className}`} aria-hidden="true">
      <svg viewBox={viewBox} className="hero-geo__doodle-svg">
        {children}
      </svg>
    </span>
  );
}

export default function HeroGeo() {
  return (
    <div className="hero-geo">
      <Badge className="hero-geo__item--cap" shape="circle">
        {/* mortarboard: diamond board + hanging tassel */}
        <polygon points="48,30 74,42 48,54 22,42" className="hero-geo__mark" />
        <line x1="74" y1="42" x2="74" y2="60" className="hero-geo__mark" />
        <circle cx="74" cy="63" r="3" className="hero-geo__mark-fill" />
      </Badge>

      <Badge className="hero-geo__item--book" shape="hex">
        {/* open book: two flat pages meeting at a spine */}
        <polygon points="18,32 48,40 48,72 18,66" className="hero-geo__mark" />
        <polygon points="78,32 48,40 48,72 78,66" className="hero-geo__mark" />
      </Badge>

      <Badge className="hero-geo__item--compass" shape="diamond">
        {/* drafting compass, with the arc it's just swept */}
        <circle cx="48" cy="20" r="4" className="hero-geo__mark" />
        <line x1="41" y1="34" x2="55" y2="34" className="hero-geo__mark" />
        <line x1="48" y1="24" x2="34" y2="70" className="hero-geo__mark" />
        <line x1="48" y1="24" x2="62" y2="70" className="hero-geo__mark" />
        <circle cx="34" cy="70" r="2" className="hero-geo__mark-fill" />
        <path d="M28,76 Q48,86 68,76" className="hero-geo__mark hero-geo__mark--arc" />
      </Badge>

      <Badge className="hero-geo__item--glass" shape="circle-dashed">
        {/* magnifying glass */}
        <circle cx="42" cy="42" r="18" className="hero-geo__mark" />
        <line x1="55" y1="55" x2="74" y2="74" className="hero-geo__mark" />
      </Badge>

      <Doodle className="hero-geo__item--grid" viewBox="0 0 56 56">
        {/* a torn scrap of graph paper */}
        <line x1="14" y1="2" x2="14" y2="54" />
        <line x1="28" y1="2" x2="28" y2="54" />
        <line x1="42" y1="2" x2="42" y2="54" />
        <line x1="2" y1="14" x2="54" y2="14" />
        <line x1="2" y1="28" x2="54" y2="28" />
        <line x1="2" y1="42" x2="54" y2="42" />
      </Doodle>

      <span className="hero-geo__item hero-geo__item--squiggle" aria-hidden="true">
        {/* a loose, hand-drawn squiggle — thick at each crest, pinched thin between */}
        <Squiggle
          width={140}
          height={40}
          waves={2.6}
          phase={0.3}
          baseThickness={3}
          peakThickness={17}
          color="#f9a8d4"
        />
      </span>

      <span className="hero-geo__item hero-geo__item--graph" aria-hidden="true">
        {/* a little trend line, flaring out toward its highest points */}
        <Sparkline
          width={96}
          height={80}
          points={[
            { x: 0, y: 0.22 },
            { x: 0.3, y: 0.42 },
            { x: 0.56, y: 0.34 },
            { x: 0.78, y: 0.74 },
            { x: 1, y: 0.92 },
          ]}
          thickness={4}
          peakDotRadius={7}
          color="#ffcf86"
          showAxis
        />
      </span>
    </div>
  );
}
