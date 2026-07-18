"use client";

// Two regular side-by-side buttons; each expands to reveal its description
// on hover/focus (handled purely in CSS).
export default function HeroDuo() {
  return (
    <div className="duo">
      <button
        type="button"
        className="duo-btn duo-btn--start"
        onClick={() => document.getElementById("pricing")?.scrollIntoView()}
      >
        <span className="duo-btn__title">Get started</span>
        <span className="duo-btn__desc">
          Free to start — paid plans from $5/mo.
        </span>
      </button>

      <button type="button" className="duo-btn duo-btn--login">
        <span className="duo-btn__title">Log in</span>
        <span className="duo-btn__desc">
          New here? Create an account in a minute.
        </span>
      </button>
    </div>
  );
}
