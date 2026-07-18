import Reveal from "./Reveal";
import Ribbons from "./Ribbons";

const STEPS = [
  {
    num: "01",
    title: "Take the quiz",
    body: "A short guided quiz on your academics, budget, location, preferences — and your extracurriculars.",
  },
  {
    num: "02",
    title: "AI finds your fit",
    body: "Our AI weighs everything you shared and surfaces the colleges that genuinely match who you are.",
  },
  {
    num: "03",
    title: "See the evidence",
    body: "Every match comes with credited sources and honest fit & admission odds you can actually trust.",
  },
];

export default function WhatIsUniseek() {
  return (
    <section className="section whatis">
      {/* flowing ribbons in the background, tilted the other way */}
      <Ribbons className="ribbons--whatis" />

      <div className="section__inner">
        <Reveal className="whatis__logo">
          <svg
            viewBox="0 0 53.54897 63.90451"
            role="img"
            aria-label="Uniseek logo"
          >
            <g
              transform="translate(-206.93265,-157.98483)"
              fill="currentColor"
            >
              <path d="M220.40922,221.88934l-13.47657,-37.2094l27.26349,-9.87434l13.47657,37.2094z" />
              <path d="M247.36661,212.12256l-4.22689,-11.67064l13.11501,-4.75002l4.22689,11.67064z" />
              <path d="M238.2259,186.65474l-4.25975,-11.76135l13.11501,-4.75002l4.25975,11.76135z" />
              <path d="M217.29163,177.1945l-4.91598,-13.57324l15.56242,-5.63643l4.91598,13.57324z" />
            </g>
          </svg>
        </Reveal>

        <Reveal as="p" className="section__eyebrow whatis__eyebrow">
          What is Uniseek
        </Reveal>
        <Reveal as="h2" className="section__title whatis__title" delay={80}>
          A quiz and AI that find the college that{" "}
          <span className="whatis__accent">fits you</span>
        </Reveal>

        <Reveal as="p" className="whatis__lead" delay={120}>
          Answer a short <strong>quiz</strong> about your grades, budget, and
          what you love doing — including your <strong>extracurriculars</strong>{" "}
          — and Uniseek&rsquo;s <strong>AI</strong> matches you with the
          colleges that truly fit.
        </Reveal>

        <Reveal delay={160}>
          <div className="whatis__steps">
            {STEPS.map((s) => (
              <div className="whatis-step" key={s.num}>
                <span className="whatis-step__num">{s.num}</span>
                <h3 className="whatis-step__title">{s.title}</h3>
                <p className="whatis-step__body">{s.body}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
