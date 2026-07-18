"use client";

import { useState } from "react";
import Reveal from "./Reveal";

const STEPS = [
  {
    key: "profile",
    num: "01",
    title: "Build your profile",
    body: "Tell us about your academics, preferences, location, budget, and what matters most.",
  },
  {
    key: "match",
    num: "02",
    title: "Get matched",
    body: "We turn your profile into a ranked list of colleges using transparent scoring.",
  },
  {
    key: "results",
    num: "03",
    title: "See honest results",
    body: "Each match shows Fit, a Reach / Match / Safety label, and how confident we are.",
  },
  {
    key: "explore",
    num: "04",
    title: "Dig deeper",
    body: "Compare schools, search, and ask the AI guidance chat about your matches.",
  },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);

  return (
    <section className="section product">
      <div className="divider" aria-hidden="true" />
      <div className="section__inner">
        <Reveal as="p" className="section__eyebrow">
          How it works
        </Reveal>
        <Reveal as="h2" className="section__title" delay={80}>
          See Uniseek in action
        </Reveal>

        <div className="product__layout">
          {/* left — step selector */}
          <div className="product__steps">
            {STEPS.map((step, i) => (
              <button
                key={step.key}
                type="button"
                className={`product-step${i === active ? " is-active" : ""}`}
                onClick={() => setActive(i)}
                aria-pressed={i === active}
              >
                <span className="product-step__num">{step.num}</span>
                <span className="product-step__text">
                  <span className="product-step__title">{step.title}</span>
                  <span className="product-step__body">{step.body}</span>
                </span>
              </button>
            ))}
          </div>

          {/* right — rotating carousel of feature images (placeholders) */}
          <div className="product__stage" aria-hidden="true">
            {STEPS.map((step, i) => {
              const offset = i - active;
              return (
                <div
                  key={step.key}
                  className={`product-slide${i === active ? " is-active" : ""}`}
                  style={{
                    transform: `translateX(${offset * 58}%) rotateY(${
                      offset * -34
                    }deg) scale(${i === active ? 1 : 0.82})`,
                    opacity: Math.abs(offset) > 1 ? 0 : i === active ? 1 : 0.5,
                    zIndex: 10 - Math.abs(offset),
                    pointerEvents: i === active ? "auto" : "none",
                  }}
                >
                  <div className="product-slide__media">
                    <span className="product-slide__tag">{step.num}</span>
                    <span className="product-slide__label">{step.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
