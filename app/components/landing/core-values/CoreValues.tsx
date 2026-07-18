// @ts-nocheck
"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import Reveal from "../../shared/Reveal";
import Ribbons from "../../shared/Ribbons";
import Coin from "../../3d/Coin";
import Glasses from "../../3d/Glasses";
import Book from "../../3d/Book";
import PuzzlePiece from "../../3d/PuzzlePiece";

// useLayoutEffect on the client, useEffect on the server (avoids SSR warning)
const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

const VALUES = [
  {
    key: "fit",
    title: "Fit",
    body: "We find the colleges that genuinely match you — your academics, preferences, location, budget, and what matters most.",
  },
  {
    key: "transparency",
    title: "Transparency",
    body: "Every recommendation is backed by credited, verifiable sources. No black boxes — you can always see why.",
  },
  {
    key: "insights",
    title: "Insights",
    body: "Go further with compare, search, and an AI guidance chat that answers questions about your matches.",
  },
  {
    key: "lowcost",
    title: "Low cost",
    body: "Free to start for first-time users, with subscriptions as low as $5 a month.",
  },
];

export default function CoreValues() {
  const [active, setActive] = useState(0);
  const value = VALUES[active];

  const titleRef = useRef(null);
  const originRef = useRef(null); // rect of the word that was clicked
  const tiltRef = useRef(null); // wrapper we rotate with the mouse
  const cardRef = useRef(null); // visual card we "punch"
  const rafRef = useRef(0);
  const tilt = useRef({ rx: 0, ry: 0 });
  const reduceRef = useRef(false);

  useEffect(() => {
    reduceRef.current =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // FLIP: fly the new title from the clicked word (bottom-right) up to
  // where the title rests (top-left corner).
  useIsoLayoutEffect(() => {
    const title = titleRef.current;
    const origin = originRef.current;
    originRef.current = null;
    if (!title || !origin || reduceRef.current) return;

    const dest = title.getBoundingClientRect();
    const dx = origin.left - dest.left;
    const dy = origin.top - dest.top;
    const scale = Math.max(0.1, origin.height / dest.height);

    title.style.transition = "none";
    title.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    title.style.opacity = "0.55";

    void title.offsetWidth; // commit the start frame
    title.style.transition =
      "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease";
    title.style.transform = "translate(0, 0) scale(1)";
    title.style.opacity = "1";
  }, [active]);

  const applyTilt = () => {
    const el = tiltRef.current;
    if (!el) return;
    const { rx, ry } = tilt.current;
    el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  };

  const handleMove = (e) => {
    if (reduceRef.current) return;
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    tilt.current.rx = -py * 5;
    tilt.current.ry = px * 5;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      applyTilt();
    });
  };

  const handleLeave = () => {
    tilt.current.rx = 0;
    tilt.current.ry = 0;
    applyTilt();
  };

  const punch = () => {
    const card = cardRef.current;
    if (!card || reduceRef.current || typeof card.animate !== "function") return;
    card.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(0.955)", offset: 0.3 },
        { transform: "scale(1)" },
      ],
      { duration: 440, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" }
    );
  };

  const pick = (i, e) => {
    originRef.current = e.currentTarget.getBoundingClientRect();
    punch();
    setActive(i);
  };

  const others = VALUES.map((v, i) => ({ v, i })).filter(
    ({ i }) => i !== active
  );

  return (
    <section className="section why" id="features">
      {/* waving ribbons in the background */}
      <Ribbons className="ribbons--why" />

      {/* big faded logo + name watermark; only its top half shows */}
      <div className="why__brandmark" aria-hidden="true">
        <svg
          className="why__brandmark-logo"
          viewBox="0 0 53.54897 63.90451"
          role="img"
          aria-label="Uniseek logo"
        >
          <g transform="translate(-206.93265,-157.98483)" fill="currentColor">
            <path d="M220.40922,221.88934l-13.47657,-37.2094l27.26349,-9.87434l13.47657,37.2094z" />
            <path d="M247.36661,212.12256l-4.22689,-11.67064l13.11501,-4.75002l4.22689,11.67064z" />
            <path d="M238.2259,186.65474l-4.25975,-11.76135l13.11501,-4.75002l4.25975,11.76135z" />
            <path d="M217.29163,177.1945l-4.91598,-13.57324l15.56242,-5.63643l4.91598,13.57324z" />
          </g>
        </svg>
        <span className="why__brandmark-name">Uniseek</span>
      </div>

      <div className="section__inner">
        <Reveal as="p" className="section__eyebrow">
          Why Uniseek
        </Reveal>
        <Reveal as="h2" className="section__title" delay={80}>
          Our Foundations
        </Reveal>

        <Reveal delay={120}>
          <div
            className="why__card-tilt"
            ref={tiltRef}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
          >
            <div className="why__card" ref={cardRef}>
              <div className="why__content" key={value.key}>
                <h3 className="why__title" ref={titleRef}>
                  {value.title}
                </h3>
                <p className="why__text">{value.body}</p>
              </div>

              {/* 3D objects that pop up on specific cards */}
              {value.key === "fit" && <PuzzlePiece />}
              {value.key === "lowcost" && <Coin />}
              {value.key === "insights" && <Glasses />}
              {value.key === "transparency" && <Book />}

              <div className="why__nav" aria-label="Choose a value">
                {others.map(({ v, i }, idx) => (
                  <span className="why__nav-item" key={v.key}>
                    <button
                      type="button"
                      className="why__nav-word"
                      onClick={(e) => pick(i, e)}
                    >
                      {v.title}
                    </button>
                    {idx < others.length - 1 && (
                      <span className="why__nav-sep" aria-hidden="true">
                        /
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
