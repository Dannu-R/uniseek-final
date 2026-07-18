import Reveal from "./Reveal";

const ROW_A = [
  { name: "Maya R.", text: "Uniseek surfaced schools I'd never have considered — and was honest about my odds." },
  { name: "Devon L.", text: "Finally a tool that separates 'good fit' from 'can I actually get in.'" },
  { name: "Priya S.", text: "The confidence labels made me trust the list instead of second-guessing it." },
  { name: "Marcus T.", text: "Every recommendation had a reason. No mystery rankings, just clear evidence." },
  { name: "Elena V.", text: "Saved me weeks of research and pointed me at a school that fit perfectly." },
];

const ROW_B = [
  { name: "Jordan K.", text: "The Reach / Match / Safety breakdown made building my list so much easier." },
  { name: "Aisha M.", text: "It knew my budget mattered and actually respected it. Refreshing." },
  { name: "Liam P.", text: "Clean, honest, and free to start. Exactly what I needed as a first-gen student." },
  { name: "Sofia G.", text: "I compared options side by side and finally felt confident hitting submit." },
  { name: "Noah B.", text: "The AI chat answered every 'but what about…' question I threw at it." },
];

function Stars() {
  return (
    <div className="review-card__stars" aria-hidden="true">
      ★★★★★
    </div>
  );
}

function Card({ review }) {
  return (
    <div className="review-card">
      <Stars />
      <p className="review-card__text">{review.text}</p>
      <span className="review-card__name">{review.name}</span>
    </div>
  );
}

export default function Reviews() {
  return (
    <section className="reviews" aria-label="Reviews">
      <div className="reviews__inner">
        {/* top border sits above the title, enclosing it */}
        <div className="reviews__glow" aria-hidden="true" />

        <div className="reviews__head">
          <Reveal as="p" className="section__eyebrow">
            Reviews
          </Reveal>
          <Reveal as="h2" className="section__title" delay={80}>
            What students are saying
          </Reveal>
        </div>

        <div className="reviews__row">
          <div className="reviews__track reviews__track--left">
            {/* 4 copies → each -50% "half" is 2 sets, always wider than the row */}
            {[...ROW_A, ...ROW_A, ...ROW_A, ...ROW_A].map((review, i) => (
              <Card key={i} review={review} />
            ))}
          </div>
        </div>

        <div className="reviews__row">
          <div className="reviews__track reviews__track--right">
            {[...ROW_B, ...ROW_B, ...ROW_B, ...ROW_B].map((review, i) => (
              <Card key={i} review={review} />
            ))}
          </div>
        </div>

        <div className="reviews__glow" aria-hidden="true" />
      </div>
    </section>
  );
}
