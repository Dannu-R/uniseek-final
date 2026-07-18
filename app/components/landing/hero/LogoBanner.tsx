// @ts-nocheck
const LOGOS = [
  { src: "/logos/nextjs.svg", cls: "nextjs" },
  { src: "/logos/stripe.svg", cls: "stripe" },
  { src: "/logos/postgresql.svg", cls: "postgresql" },
  { src: "/logos/prisma-mark.svg", cls: "prisma" },
  { src: "/logos/jwt.svg", cls: "jwt" },
  { src: "/logos/auth.svg", cls: "auth" },
];

function Group() {
  return (
    <div className="logo-banner__group">
      <span className="logo-banner__label">Built with:</span>
      {LOGOS.map((logo, i) => (
        <img
          key={i}
          className={`logo-banner__item logo-banner__item--${logo.cls}`}
          src={logo.src}
          alt=""
        />
      ))}
    </div>
  );
}

export default function LogoBanner() {
  // two identical groups → seamless, gap-free loop
  return (
    <div className="logo-banner" aria-hidden="true">
      <div className="logo-banner__viewport">
        <Group />
        <Group />
      </div>
    </div>
  );
}
