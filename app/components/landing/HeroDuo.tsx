"use client";

// The hero's calls to action: one filled primary, one quiet secondary, centred under the
// headline. Two equally-weighted buttons make the visitor choose before they know enough
// to; "Get started" is the one we're recommending, so it's the one that looks like it.

import { useRouter } from "next/navigation";

export default function HeroDuo() {
  const router = useRouter();

  return (
    <div className="hx-cta">
      {/* Gated: unauthenticated visitors get bounced to /login, then land on the dashboard. */}
      <button type="button" className="hx-btn hx-btn--primary" onClick={() => router.push("/dashboard")}>
        Get started
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h13" />
          <path d="M12 5.5 18.5 12 12 18.5" />
        </svg>
      </button>

      <a className="hx-btn hx-btn--ghost" href="/login">
        Log in
      </a>
    </div>
  );
}
