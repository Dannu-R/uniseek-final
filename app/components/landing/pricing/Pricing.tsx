// @ts-nocheck
"use client";

import { useState } from "react";
import Reveal from "../../shared/Reveal";
import Ribbons from "../../shared/Ribbons";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "Core college match",
      "Up to 10 recommendations",
      "Fit & admission labels",
    ],
    detail:
      "Perfect for getting started. Build your intake profile and see up to ten evidence-backed matches, each with a clear Fit score and a Reach / Match / Safety label — no cost and no card required.",
  },
  {
    name: "Starter",
    price: "$5",
    period: "/mo",
    features: [
      "Everything in Free",
      "Unlimited recommendations",
      "Save & revisit your lists",
      "Confidence details",
    ],
    detail:
      "For students getting serious. Unlock unlimited recommendations, save and revisit your lists across sessions, and see the confidence behind every match so you know exactly how much to trust it.",
  },
  {
    name: "Plus",
    price: "$10",
    period: "/mo",
    features: [
      "Everything in Starter",
      "Side-by-side compare",
      "Advanced search & filters",
      "Priority updates",
    ],
    detail:
      "For building a real shortlist. Compare schools side by side, search and filter by the things that matter most to you, and stay on top of changes to your matches as new data comes in.",
  },
  {
    name: "Pro",
    price: "$20",
    period: "/mo",
    features: [
      "Everything in Plus",
      "AI guidance chat",
      "Deeper evidence & sources",
      "Early access to new tools",
    ],
    detail:
      "The full toolkit. Ask the AI guidance chat anything about your matches, dig into the sources and evidence behind every score, and get first access to new features as we ship them.",
  },
];

export default function Pricing() {
  const [selected, setSelected] = useState(0);

  const cols = selected % 2 === 0 ? "1.7fr 1fr" : "1fr 1.7fr";
  const rows = selected < 2 ? "1.7fr 1fr" : "1fr 1.7fr";
  const active = PLANS[selected];

  return (
    <section className="section pricing" id="pricing">
      {/* diagonal waving ribbons flowing from the top-right */}
      <Ribbons className="ribbons--pricing" />

      <div className="section__inner">
        <Reveal as="p" className="section__eyebrow">
          Pricing
        </Reveal>
        <Reveal as="h2" className="section__title" delay={80}>
          Plans that fit your search
        </Reveal>

        <div className="pricing__body">
          <div
            className="pricing-grid"
            style={{ gridTemplateColumns: cols, gridTemplateRows: rows }}
          >
            {PLANS.map((plan, i) => (
              <article
                key={plan.name}
                className={`plan${i === selected ? " is-selected" : ""}`}
                onClick={() => setSelected(i)}
              >
                <div className="plan__head">
                  <span className="plan__name">{plan.name}</span>
                  <span className="plan__price">
                    {plan.price}
                    <span className="plan__period">{plan.period}</span>
                  </span>
                </div>

                <div className="plan__reveal">
                  <ul className="plan__features">
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <span className="plan__cta">Choose {plan.name}</span>
                </div>
              </article>
            ))}
          </div>

          <div className="pricing__detail">
            <span className="pricing__detail-name">{active.name}</span>
            <p className="pricing__detail-text">{active.detail}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
