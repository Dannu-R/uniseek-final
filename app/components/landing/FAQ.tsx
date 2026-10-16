import Reveal from "../shared/Reveal";

// Plain <details>/<summary> accordion: opens and closes without any JavaScript, and
// works with the keyboard and screen readers out of the box.
//
// Keep these answers true to what the app actually does. Update them when the
// scoring or the data changes.
function questions(collegeCount: number | null) {
  return [
    {
      q: "What does Uniseek do?",
      a: "You fill in a short profile covering your grades, coursework, test scores, activities, budget and preferences. Uniseek scores every college in its catalog against that profile and returns a balanced list of reach, match and safety schools, with the reasoning behind each one.",
    },
    {
      q: "Where does the data come from?",
      a: "From official, public sources: each college's Common Data Set, the U.S. Department of Education's College Navigator and College Scorecard, and U.S. News rankings. Every figure is tied to the source it came from. If a figure is not published, it is left out or clearly labeled as an estimate.",
    },
    {
      q: "How are my admission chances estimated?",
      a: "Your academic profile is compared with what each college says it weighs in admissions, then measured against that college's admit rate. If you choose a major, the admit rate for that major is used where it is published. At public universities, the in-state or out-of-state rate is used based on your home state. These are estimates, not guarantees.",
    },
    {
      q: "Why does my home state matter?",
      a: "Public universities admit their own residents at higher rates and charge out-of-state students more. Uniseek uses the admit rate and the price that apply to you, so an out-of-state public university is not shown as easier or cheaper than it really is.",
    },
    {
      q: "How is cost calculated?",
      a: "We start with the college's published net price for your family's income range, which is what students typically pay after grants and scholarships. At public universities, the out-of-state tuition difference is added if you live in another state. Colleges above your budget are left off your list.",
    },
    {
      q: "How many colleges are included?",
      a: collegeCount != null
        ? `${collegeCount} four-year colleges, including national universities and liberal arts colleges across the country. The catalog is growing.`
        : "Four-year national universities and liberal arts colleges across the country. The catalog is growing.",
    },
    {
      q: "What happens to my information?",
      a: "Your profile is saved to your account so you can come back to your results. Your activity descriptions, and your profile when you explore a college, are processed by Anthropic's Claude to classify your activities and write college summaries.",
    },
  ];
}

export default function FAQ({ collegeCount }: { collegeCount: number | null }) {
  return (
    <section className="section faq" id="faq">
      <div className="section__inner faq__inner">
        <Reveal as="p" className="section__eyebrow">
          FAQ
        </Reveal>
        <Reveal as="h2" className="section__title" delay={80}>
          Common questions
        </Reveal>

        <Reveal delay={140}>
          <div className="faq__list">
            {questions(collegeCount).map((item) => (
              <details className="faq__item" key={item.q}>
                <summary className="faq__question">{item.q}</summary>
                <p className="faq__answer">{item.a}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
