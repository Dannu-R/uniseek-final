// @ts-nocheck
import UniseekMark from "@/app/components/UniseekMark";
// Set this to the public contact address to show a "Contact" link (mailto:).
// Left empty, the link is hidden.
const CONTACT_EMAIL = "danush.kanchi.raj@gmail.com";

// "/#…" rather than "#…" so the section links also work from other pages.
const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" },
      { label: "Get started", href: "/dashboard" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/#about" },
      { label: "FAQ", href: "/#faq" },
      ...(CONTACT_EMAIL ? [{ label: "Contact", href: `mailto:${CONTACT_EMAIL}` }] : []),
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="footer__logo-row">
            <UniseekMark className="footer__logo" />
            <span className="footer__title">Uniseek</span>
          </div>
          <p className="footer__tagline">
            Discover the college that fits you.
          </p>
        </div>

        <nav className="footer__cols" aria-label="Footer">
          {COLUMNS.map((col) => (
            <div className="footer__col" key={col.title}>
              <h4 className="footer__col-title">{col.title}</h4>
              {col.links.map((link) => (
                <a className="footer__link" key={link.label} href={link.href}>
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </nav>
      </div>

      <div className="footer__bottom">
        <p className="footer__copy">
          © 2026 Uniseek. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
