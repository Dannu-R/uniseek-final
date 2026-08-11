// @ts-nocheck
import Navbar from "./components/landing/Navbar";
import LogoBanner from "./components/landing/LogoBanner";
import WhatIsUniseek from "./components/landing/WhatIsUniseek";
import Stats from "./components/landing/Stats";
import Problem from "./components/landing/Problem";
import CoreValues from "./components/landing/CoreValues";
import HowItWorks from "./components/landing/HowItWorks";
import Pricing from "./components/landing/Pricing";
import Reviews from "./components/landing/Reviews";
import Footer from "./components/landing/Footer";
import HeroDuo from "./components/landing/HeroDuo";
import HeroObjects from "./components/landing/HeroObjects";

export default function Home() {
  return (
    <>
    <main>
      <Navbar />

      {/* ---- Hero ------------------------------------------------------------
          Centred: eyebrow, headline, one line of copy, the two actions, and then
          the product itself rising into the frame and cut off by the fold — the
          point being that there's a real thing behind the promise. Uniseek's own
          objects drift in the outer thirds, framing that column without crossing
          it. */}
      <section className="hx">
        <div className="hx__sky" aria-hidden="true" />
        <HeroObjects />

        <div className="hx__inner">
          <p className="hx__eyebrow">Built for the college search</p>

          <h1 className="hx__title">
            Discover the college
            <br />
            that <span className="hx__title-accent">fits</span>{" "}
            <em className="hx__title-em">you</em>.
          </h1>

          <p className="hx__sub">
            Answer a few questions about your grades, goals and budget. Get an honest
            reach / match / safety list — and the reasoning behind every name on it.
          </p>

          <HeroDuo />

          <div className="hx__product">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="hx__product-img"
              src="/product-home.png"
              alt="The Uniseek dashboard, showing a student's recommended colleges alongside their grade trend, test score and course rigor."
              width={3420}
              height={1970}
            />
          </div>
        </div>

      </section>

      {/* Back on the dark ground these logos were drawn for — several of them are white. */}
      <LogoBanner />

      <Problem />

      <div className="section-break" aria-hidden="true" />

      <WhatIsUniseek />

      <Stats />

      <CoreValues />

      <HowItWorks />

      <Reviews />

      <Pricing />
    </main>

    <Footer />
    </>
  );
}
