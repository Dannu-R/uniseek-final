"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Reveal from "../shared/Reveal";
import { PropMark, PropSat, propStyle } from "./PageProps";

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

function StatCardsSkeleton() {
  return (
    <div className="stats__grid" aria-busy="true" aria-label="Loading stats">
      {Array.from({ length: 3 }).map((_, index) => (
        <div className="stat stat--skeleton" key={index}>
          <span className="stat__value stat__value--skeleton" />
          <span className="stat__label stat__label--skeleton" />
        </div>
      ))}
    </div>
  );
}

function CollegeShowcaseSkeleton() {
  return (
    <div className="colleges colleges--skeleton" aria-busy="true" aria-label="Loading colleges">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="college-slide college-slide--skeleton" key={index}>
          <div className="college-slide__img college-slide__img--skeleton" />
          <span className="college-slide__name college-slide__name--skeleton" />
        </div>
      ))}
    </div>
  );
}

function StatCards() {
  return (
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
  );
}

// Counts up from 0 → end the first time it scrolls into view.
function CountUp({ end, suffix = "", duration = 1700 }: { end: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement | null>(null);
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
        const tick = (now: number) => {
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
function CollegeShowcase({ colleges }: { colleges: Array<{ name: string; src: string }> }) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const imgRefs = useRef<Array<HTMLImageElement | null>>([]);

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
    void img.offsetWidth;
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
              ref={(el) => {
                imgRefs.current[i] = el;
              }}
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
      <PropMark icon="bulb" tone="blue" style={propStyle({ left: "3%", top: "100px", "--prop-rot": "-8deg" })} />
      {/* Sits in the header band above the KPI grid and the college carousel, both of
          which run edge-to-edge — the one part of this section with real margin on
          every side, so the card can be a comfortable size without reaching into
          either row's photos or numbers. */}
      <PropSat style={propStyle({ right: "4%", top: "50px", "--prop-rot": "5deg", "--prop-delay": "0.8s" })} />

      <div className="section__inner">
        <Reveal as="p" className="section__eyebrow stats__eyebrow">
          By the numbers
        </Reveal>
        <Reveal as="h2" className="section__title stats__title" delay={80}>
          Built on real data
        </Reveal>

        <Reveal delay={140}>
          <Suspense fallback={<StatCardsSkeleton />}>
            <StatCards />
          </Suspense>
        </Reveal>

        <Reveal delay={180}>
          <div className="colleges-wrap">
            <p className="colleges__caption">Colleges in our database</p>
            <Suspense fallback={<CollegeShowcaseSkeleton />}>
              <CollegeShowcase colleges={COLLEGES} />
            </Suspense>
          </div>
        </Reveal>

        <div className="stats__glow" aria-hidden="true" />
      </div>
    </section>
  );
}
