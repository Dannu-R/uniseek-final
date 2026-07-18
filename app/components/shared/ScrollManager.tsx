// @ts-nocheck
"use client";

import { useEffect } from "react";

// Reloads start at the top instead of restoring the last scroll position.
export default function ScrollManager() {
  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    // snap to top on this load too (instant, so it doesn't smooth-scroll)
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return null;
}
