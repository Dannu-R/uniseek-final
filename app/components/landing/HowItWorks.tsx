// @ts-nocheck
"use client";

import { useState } from "react";
import Reveal from "../shared/Reveal";

const STEPS = [
  {
    key: "profile",
    num: "01",
    title: "Build your profile",
    body: "Tell us about your academics, preferences, location, budget, and what matters most.",
    image: "/how-it-works/step-profile.png",
    alt: "The Academics step of the Uniseek quiz, showing GPA, course rigor and test score fields.",
  },
  {
    key: "match",
    num: "02",
    title: "Get matched",
    body: "We turn your profile into a ranked list of colleges using transparent scoring.",
    image: "/how-it-works/step-match.png",
    alt: "The Uniseek dashboard home, showing 12 colleges recommended and a 3 Reach / 5 Match / 4 Safety breakdown.",
  },
  {
    key: "results",
    num: "03",
    title: "See honest results",
    body: "Each match shows Fit, a Reach / Match / Safety label, and how confident we are.",
    image: "/how-it-works/step-results.png",
    alt: "A college's Where You Stand panel, comparing the student's SAT and GPA against admitted-student ranges.",
  },
  {
    key: "explore",
    num: "04",
    title: "Dig deeper",
    body: "Compare schools, search, and ask the AI guidance chat about your matches.",
    image: "/how-it-works/step-compare.png",
    alt: "The Compare view, showing three saved colleges side by side by category, acceptance rate, and net price.",
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

          {/* right — rotating carousel of real product screenshots */}
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="product-slide__img" src={step.image} alt={step.alt} />
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
