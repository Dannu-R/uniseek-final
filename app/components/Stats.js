"use client";

import { useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";

const STATS = [
  { end: 1000, suffix: "+", label: "Colleges analyzed" },
  { end: 30, suffix: "+", label: "Factors we weigh" },
  { end: 2000, suffix: "+", label: "Students signed up" },
];

// name + image path (drop files in /public/colleges/…); a gradient
// placeholder shows until the picture is added.
const COLLEGES = [
  { name: "Stanford", src: "/colleges/stanford.jpg" },
  { name: "MIT", src: "/colleges/mit.jpg" },
  { name: "Harvard", src: "/colleges/harvard.jpg" },
  { name: "UC Berkeley", src: "/colleges/berkeley.jpg" },
  { name: "Princeton", src: "/colleges/princeton.jpg" },
  { name: "Columbia", src: "/colleges/columbia.jpg" },
  { name: "Cornell", src: "/colleges/cornell.jpg" },
  { name: "Duke", src: "/colleges/duke.jpg" },
  { name: "Georgia Tech", src: "/colleges/georgia-tech.jpg" },
  { name: "University of Michigan", src: "/colleges/michigan.jpg" },
  { name: "NYU", src: "/colleges/nyu.jpg" },
  { name: "UCLA", src: "/colleges/ucla.jpg" },
];

// Counts up from 0 → end the first time it scrolls into view.
function CountUp({ end, suffix = "", duration = 1700 }) {
  const ref = useRef(null);
  const started = useRef(false);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      setVal(end);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();

        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
          setVal(Math.round(end * eased));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [end, duration]);

  return (
    <span ref={ref}>
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}

// One image at a time, crossfading to the next every few seconds.
function CollegeShowcase({ colleges }) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState({});
  const imgRefs = useRef([]);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a + 1) % colleges.length);
    }, 3500);
    return () => clearInterval(id);
  }, [colleges.length]);

  // Restart the pan on the slide that just became active. The outgoing
  // slide is left untouched, so it keeps its position while fading out
  // (no snap back to origin).
  useEffect(() => {
    const img = imgRefs.current[active];
    if (!img) return;
    img.style.animation = "none";
    void img.offsetWidth; // reflow so the animation restarts from the top
    img.style.animation = "";
  }, [active]);

  return (
    <div className="colleges" aria-label="Colleges in our database">
      {colleges.map((c, i) => (
        <div
          key={c.name}
          className={`college-slide${i === active ? " is-active" : ""}`}
          aria-hidden={i === active ? undefined : true}
        >
          {!failed[i] && (
            <img
              ref={(el) => (imgRefs.current[i] = el)}
              className="college-slide__img"
              src={c.src}
              alt={c.name}
              onError={() => setFailed((f) => ({ ...f, [i]: true }))}
            />
          )}
          <span className="college-slide__name">{c.name}</span>
        </div>
      ))}
    </div>
  );
}

export default function Stats() {
  return (
    <section className="section stats">
      <div className="section__inner">
        <Reveal as="p" className="section__eyebrow stats__eyebrow">
          By the numbers
        </Reveal>
        <Reveal as="h2" className="section__title stats__title" delay={80}>
          Built on real data
        </Reveal>

        <Reveal delay={140}>
          <div className="stats__grid">
            {STATS.map((s) => (
              <div className="stat" key={s.label}>
                <span className="stat__value">
                  <CountUp end={s.end} suffix={s.suffix} />
                </span>
                <span className="stat__label">{s.label}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={180}>
          <div className="colleges-wrap">
            <p className="colleges__caption">Colleges in our database</p>
            <CollegeShowcase colleges={COLLEGES} />
          </div>
        </Reveal>

        <div className="stats__glow" aria-hidden="true" />
      </div>
    </section>
  );
}
