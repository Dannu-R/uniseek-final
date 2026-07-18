import Navbar from "./components/Navbar";
import LogoBanner from "./components/LogoBanner";
import WhatIsUniseek from "./components/WhatIsUniseek";
import Stats from "./components/Stats";
import Problem from "./components/Problem";
import CoreValues from "./components/CoreValues";
import HowItWorks from "./components/HowItWorks";
import Pricing from "./components/Pricing";
import Reviews from "./components/Reviews";
import Footer from "./components/Footer";
import Ribbons from "./components/Ribbons";
import HeroDuo from "./components/HeroDuo";

export default function Home() {
  return (
    <>
    <main>
      <Navbar />

      <section className="hero">
        <div className="hero__clip">
          <div className="hero__aurora" aria-hidden="true">
            <div className="aurora-layer aurora-layer--1" />
            <div className="aurora-layer aurora-layer--2" />
            <div className="aurora-layer aurora-layer--3" />
          </div>

          <Ribbons />

          <svg className="hero__metal" aria-hidden="true" preserveAspectRatio="none">
            <filter id="metal-noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8 0.35"
                numOctaves="2"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#metal-noise)" />
          </svg>

          <div className="hero__accents" aria-hidden="true" />

          <div className="hero-photo" aria-hidden="true">
            <img className="hero-photo__img" src="/campus.jpg" alt="" />
          </div>

          <div className="hero__fade-top" aria-hidden="true" />
          <div className="hero__fade" aria-hidden="true" />
        </div>

        <div className="hero__fg">
        <div className="hero__content">
          <div className="hero__left">
          <div className="brand">
            <svg
              className="brand__logo"
              viewBox="0 0 53.54897 63.90451"
              role="img"
              aria-label="Uniseek logo"
            >
              <g transform="translate(-206.93265,-157.98483)" fill="currentColor">
                <path d="M220.40922,221.88934l-13.47657,-37.2094l27.26349,-9.87434l13.47657,37.2094z" />
                <path d="M247.36661,212.12256l-4.22689,-11.67064l13.11501,-4.75002l4.22689,11.67064z" />
                <path d="M238.2259,186.65474l-4.25975,-11.76135l13.11501,-4.75002l4.25975,11.76135z" />
                <path d="M217.29163,177.1945l-4.91598,-13.57324l15.56242,-5.63643l4.91598,13.57324z" />
              </g>
            </svg>
            <span className="brand__title">Uniseek</span>
          </div>

          <h1 className="hero-slogan">
            Discover the college that{" "}
            <span className="hero-slogan__accent">fits</span>{" "}
            <em className="hero-slogan__italic">you</em>.
          </h1>

          <div className="hero-mission">
            <span className="hero-mission__bar" aria-hidden="true" />
            <p className="hero-mission__text">
              Finding the right university that fits you has never been this
              easy. From low costs to high adaptability, we provide the tools you
              need to take the next step in your college journey.
            </p>
          </div>
          </div>

          <HeroDuo />
        </div>

          <LogoBanner />
        </div>
      </section>

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
