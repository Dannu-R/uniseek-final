// @ts-nocheck
import Reveal from "../shared/Reveal";
import MagnifyingGlass from "../3d/MagnifyingGlass";
import UniseekMark from "@/app/components/UniseekMark";

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
            <UniseekMark className="btn-primary__logo" />
            <span>See how we get it right</span>
          </a>
        </Reveal>
      </div>
    </section>
  );
}
