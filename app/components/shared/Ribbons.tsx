// @ts-nocheck
// Flowing translucent ribbons. Used in the hero (drifting) and the
// Why Uniseek section (waving) — pass a modifier class for the latter.
export default function Ribbons({ className = "" }) {
  return (
    <svg
      className={`ribbons${className ? " " + className : ""}`}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ribbon-a" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ec4899" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
        <linearGradient id="ribbon-b" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="ribbon-c" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
      </defs>

      <path
        className="ribbon ribbon--1"
        fill="url(#ribbon-a)"
        d="M-160 600 C 260 470, 720 250, 1600 330 L 1600 430 C 720 350, 260 570, -160 700 Z"
      />
      <path
        className="ribbon ribbon--2"
        fill="url(#ribbon-b)"
        d="M-160 430 C 300 590, 780 330, 1600 540 L 1600 640 C 780 440, 300 690, -160 530 Z"
      />
      <path
        className="ribbon ribbon--3"
        fill="url(#ribbon-c)"
        d="M-160 760 C 380 680, 900 850, 1600 730 L 1600 830 C 900 950, 380 780, -160 860 Z"
      />
    </svg>
  );
}
