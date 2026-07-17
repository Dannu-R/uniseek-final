import Reveal from "./Reveal";

const STEPS = [
  {
    n: "01",
    title: "Build your profile",
    body: "Answer a guided intake — academics, preferences, location, budget, and what matters most to you.",
  },
  {
    n: "02",
    title: "Get matched",
    body: "Uniseek turns your profile into a ranked list of colleges using transparent, explainable scoring.",
  },
  {
    n: "03",
    title: "See honest results",
    body: "Every match is labeled with Match Strength, an Admission Category — Reach, Match, or Safety — and our Confidence.",
  },
];

export default function HowItWorks() {
  return (
    <section className="section how">
      <div className="section__inner">
        <Reveal as="p" className="section__eyebrow">
          How it works
        </Reveal>
        <Reveal as="h2" className="section__title" delay={80}>
          From a profile to colleges that fit
        </Reveal>

        <div className="how__grid">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={140 + i * 110}>
              <article className="how-card">
                <span className="how-card__num">{step.n}</span>
                <h3 className="how-card__title">{step.title}</h3>
                <p className="how-card__body">{step.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
