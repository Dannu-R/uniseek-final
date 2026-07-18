// @ts-nocheck
import Reveal from "../../shared/Reveal";
import MagnifyingGlass from "../../3d/MagnifyingGlass";

export default function Problem() {
  return (
    <section className="section__problem">
      <div className="section__inner">
        <div className="problem__inner">
          <div className="problem__text">
            <Reveal as="p" className="section__eyebrow">
              The problem
            </Reveal>
            <Reveal as="h2" className="section__title" delay={80}>
              Finding the right college shouldn&rsquo;t feel like guesswork
            </Reveal>
            <Reveal as="p" className="problem__body" delay={140}>
              Students drown in rankings and one-size-fits-all &ldquo;best
              college&rdquo; lists that know nothing about who they are, what
              they want, or what they can afford.
            </Reveal>
            <Reveal as="p" className="problem__body" delay={200}>
              And most tools quietly blur two very different questions &mdash; is
              this a good fit, and can I actually get in? &mdash; while never
              admitting how sure they are. So the wrong schools get chased, the
              right ones get missed, and no one knows how much to trust the list.
            </Reveal>
          </div>

          <Reveal className="problem__visual" delay={160}>
            <div className="glass-panel">
              <MagnifyingGlass />
            </div>
          </Reveal>
        </div>

        <Reveal className="problem__cta" delay={120}>
          <a className="btn-primary" href="#features">
            <svg
              className="btn-primary__logo"
              viewBox="0 0 53.54897 63.90451"
              aria-hidden="true"
            >
              <g
                transform="translate(-206.93265,-157.98483)"
                fill="currentColor"
              >
                <path d="M220.40922,221.88934l-13.47657,-37.2094l27.26349,-9.87434l13.47657,37.2094z" />
                <path d="M247.36661,212.12256l-4.22689,-11.67064l13.11501,-4.75002l4.22689,11.67064z" />
                <path d="M238.2259,186.65474l-4.25975,-11.76135l13.11501,-4.75002l4.25975,11.76135z" />
                <path d="M217.29163,177.1945l-4.91598,-13.57324l15.56242,-5.63643l4.91598,13.57324z" />
              </g>
            </svg>
            <span>See how we get it right</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
