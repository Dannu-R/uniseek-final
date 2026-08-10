"use client";

// Reveal-on-scroll for the dashboard's cards.
//
// The class goes on the child itself rather than on a wrapper: the bento is a CSS grid
// and its children carry the placement classes (tile--full, tile--feature …), so an
// extra element between the grid and a card would take the placement and collapse the
// layout. cloneElement is what lets this add a class and a ref without that element.
//
// Hiding the card by default is only safe because the dashboard renders nothing at all
// until the wizard has hydrated from localStorage — there is no no-JS render of this
// page to leave stranded at opacity 0. The fallback that does matter is a browser with
// no IntersectionObserver, which shows everything immediately.

import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type Ref,
} from "react";

// Fires once, then stops observing — this is an entrance, not a scroll effect, and a
// card that re-hides on the way back up reads as a glitch.
//
// The bottom margin holds the trigger just inside the viewport so cards start moving
// as they arrive rather than exactly on the edge. It has to be a small fixed value,
// never a percentage: the last element on the page only ever climbs as far as the
// bottom of the viewport, so a margin of -10% put the trigger line above where the
// footnote could ever reach and it stayed invisible no matter how far you scrolled.
export function useInView<T extends HTMLElement>(rootMargin = "0px 0px -48px 0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver !== "function") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return [ref, inView] as const;
}

type RevealChild = ReactElement<{
  className?: string;
  ref?: Ref<HTMLElement>;
}>;

export default function Reveal({ children }: { children: RevealChild }) {
  const [ref, inView] = useInView<HTMLElement>();
  return cloneElement(children, {
    ref,
    className: `${children.props.className ?? ""} reveal${inView ? " is-in" : ""}`.trim(),
  });
}
