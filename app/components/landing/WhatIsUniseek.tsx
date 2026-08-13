// @ts-nocheck
import Reveal from "../shared/Reveal";
import Ribbons from "../shared/Ribbons";
import UniseekMark from "@/app/components/UniseekMark";
import { PropNote, PropMark, PropPills, PropStat, propStyle } from "./PageProps";

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

      <PropNote tone="yellow" style={propStyle({ left: "4%", top: "120px", "--prop-rot": "-7deg" })}>
        Answer honestly — the AI reads between the lines.
      </PropNote>
      <PropMark icon="target" tone="violet" style={propStyle({ right: "5%", top: "90px", "--prop-rot": "9deg" })} />
      <PropStat
        value="3"
        label="Simple steps"
        style={propStyle({ left: "3%", bottom: "50px", "--prop-rot": "-4deg", "--prop-delay": "1.4s" })}
      />
      <PropPills style={propStyle({ right: "3%", bottom: "40px", "--prop-rot": "5deg", "--prop-delay": "0.6s" })} />

      <div className="section__inner">
        <Reveal className="whatis__logo">
          <UniseekMark />
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
