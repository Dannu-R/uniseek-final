// @ts-nocheck
import UniseekMark from "@/app/components/UniseekMark";
const COLUMNS = [
  { title: "Product", links: ["How it works", "Features", "Discover"] },
  { title: "Company", links: ["About", "Careers", "Contact"] },
  { title: "Resources", links: ["Blog", "Help center", "FAQ"] },
  { title: "Legal", links: ["Privacy", "Terms"] },
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
                <a className="footer__link" key={link}>
                  {link}
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
