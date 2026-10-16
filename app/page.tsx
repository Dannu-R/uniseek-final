// @ts-nocheck
import Navbar from "./components/landing/Navbar";
import LogoBanner from "./components/landing/LogoBanner";
import WhatIsUniseek from "./components/landing/WhatIsUniseek";
import Stats from "./components/landing/Stats";
import Problem from "./components/landing/Problem";
import CoreValues from "./components/landing/CoreValues";
import HowItWorks from "./components/landing/HowItWorks";
// Hidden for now; see the commented-out sections at the bottom of the page.
// import Pricing from "./components/landing/Pricing";
// import Reviews from "./components/landing/Reviews";
import Footer from "./components/landing/Footer";
import FAQ from "./components/landing/FAQ";
import HeroDuo from "./components/landing/HeroDuo";
import HeroGeo from "./components/landing/HeroGeo";
import { Squiggle } from "./components/landing/Decor";
import { prisma } from "@/lib/prisma";

// Rendered per request so "Colleges analyzed" reads the live catalog size. The
// Docker build has no database, so this page can't be pre-rendered at build time.
export const dynamic = "force-dynamic";

// The catalog size, or null if the database can't be reached (the stat is hidden
// rather than taking the landing page down).
async function getCollegeCount() {
  try {
    return await prisma.college.count();
  } catch {
    return null;
  }
}

export default async function Home() {
  const collegeCount = await getCollegeCount();

  return (
    <>
    <main>
      <Navbar />

      {/* ---- Hero ------------------------------------------------------------
          Centred: eyebrow, headline, one line of copy, the two actions, and then
          the product itself rising into the frame and cut off by the fold — the
          point being that there's a real thing behind the promise. Flat academic
          marks (cap, book, compass, glass) drift in the outer thirds, framing that
          column without crossing it. */}
      <section className="hx">
        <div className="hx__photo" aria-hidden="true" />
        <div className="hx__wash" aria-hidden="true" />
        <HeroGeo />

        <div className="hx__inner">
          <p className="hx__eyebrow">Built for the college search</p>

          <h1 className="hx__title">
            Discover the college
            <br />
            that <span className="hx__title-accent">fits</span>{" "}
            <span className="hx__title-em-wrap">
              <em className="hx__title-em">you</em>
              <span className="hx__title-em-swash" aria-hidden="true">
                <Squiggle
                  width={112}
                  height={26}
                  waves={1.7}
                  phase={0.9}
                  baseThickness={2.5}
                  peakThickness={12}
                  color="#f9a8d4"
                />
              </span>
            </span>.
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

      <Stats collegeCount={collegeCount} />

      <CoreValues />

      <FAQ collegeCount={collegeCount} />

      <HowItWorks />

      {/* Hidden for now (not deleted): reviews are placeholder copy and paid plans
          aren't built yet. Uncomment these and their imports above to bring them back.
      <Reviews />

      <Pricing />
      */}
    </main>

    <Footer />
    </>
  );
}
